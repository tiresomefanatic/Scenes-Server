import { StatusCodes } from "http-status-codes";
import { Request, Response } from "express";
import { AuthenticatedRequest } from "../../middleware/authentication";
import jwt from "jsonwebtoken";
import Like from "../../models/Like";
import Reel, { IReelWithCounts } from "../../models/Reel";
import UserHistory from "../../models/UserHistory";
import User from "../../models/User";
import Comment from "../../models/Comment";
import Location from "../../models/Location";
import {
  NotFoundError,
  BadRequestError,
  UnauthenticatedError,
} from "../../errors";
import mongoose, { Model, Schema, Types } from "mongoose";
import { redisClient } from "../../index";
import { categories } from "../categories";
import Category, { ICategory } from "../../models/Category";
import { Queue, Worker, Job, QueueEvents } from "bullmq";
import { shuffle } from "lodash"; // Make sure to import lodash if not already imported

// Define your Redis connection options
const redisOptions = {
  host: "localhost",
  port: 6379,
};

interface FetchOptions {
  sort?: Record<string, 1 | -1>;
  limit?: number;
}

const fetchReels = async (
  query: mongoose.FilterQuery<typeof Reel>,
  options: FetchOptions = {}
) => {
  return Reel.find(query)
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 50)
    .select("-likes -comments")
    .populate("location", "name")
    .populate("category", "name popularityPercentage")
    .exec();
};

interface LikedVideo {
  reel: {
    _id: mongoose.Types.ObjectId;
    toJSON: () => any;
  };
}

const getLikedVideos = async (req: Request, res: Response) => {
  const { limit = 10, offset = 0 } = req.query;
  const userId = req.params.userId;
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }
  try {
    let likedVideos = (await Like.find({
      user: userId,
      reel: { $exists: true },
    })
      .populate({
        path: "reel",
        populate: [
          { path: "location", select: "name" },
          { path: "category", select: "name popularityPercentage" },
        ],
        select: "-likes -comments",
      })
      .skip(Number(offset))
      .limit(Number(limit))
      .sort({ createdAt: -1 })) as LikedVideo[];

    likedVideos = likedVideos.filter((like) => like.reel !== null);
    if (!likedVideos || likedVideos.length === 0) {
      return res.status(StatusCodes.OK).json({ reelData: [] });
    }

    const reelIds = likedVideos.map((like) => like.reel._id);

    const [likesCounts, commentsCounts] = await Promise.all([
      Like.aggregate([
        { $match: { reel: { $in: reelIds } } },
        { $group: { _id: "$reel", count: { $sum: 1 } } },
      ]),
      Comment.aggregate([
        { $match: { reel: { $in: reelIds } } },
        { $group: { _id: "$reel", count: { $sum: 1 } } },
      ]),
    ]);

    const likesCountMap = new Map(
      likesCounts.map((item) => [item._id.toString(), item.count])
    );
    const commentsCountMap = new Map(
      commentsCounts.map((item) => [item._id.toString(), item.count])
    );

    const likedVideosWithCounts = likedVideos.map((like) => {
      const reel = like.reel.toJSON();
      return {
        ...reel,
        likesCount: likesCountMap.get(reel._id.toString()) || 0,
        commentsCount: commentsCountMap.get(reel._id.toString()) || 0,
        isLiked: true,
      };
    });

    res.status(StatusCodes.OK).json({ reelData: likedVideosWithCounts });
  } catch (error) {
    console.error(error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Internal Server Error" });
  }
};

interface PopulatedLocation {
  _id: mongoose.Types.ObjectId;
  name: string;
}

interface PopulatedCategory {
  _id: mongoose.Types.ObjectId;
  name: string;
  popularityPercentage: number;
}

const getReelPosts = async (req: Request, res: Response) => {
  const { limit = 10, offset = 0 } = req.query;
  const locationId = req.params.locationId;
  const location = await Location.findById(locationId);
  if (!location) {
    throw new NotFoundError("Location not found");
  }
  try {
    const reelPosts = await Reel.find({ location: locationId })
      .sort({ createdAt: -1 })
      .skip(Number(offset))
      .limit(Number(limit))
      .populate("location", "name")
      .populate("category", "name popularityPercentage")
      .select("-likes -comments")
      .exec();

    const reelIds = reelPosts.map((reel) => reel._id);
    const [likesCounts, commentsCounts] = await Promise.all([
      Like.aggregate([
        { $match: { reel: { $in: reelIds } } },
        { $group: { _id: "$reel", count: { $sum: 1 } } },
      ]),
      Comment.aggregate([
        { $match: { reel: { $in: reelIds } } },
        { $group: { _id: "$reel", count: { $sum: 1 } } },
      ]),
    ]);

    const likesCountMap = new Map(
      likesCounts.map((item) => [item._id.toString(), item.count])
    );
    const commentsCountMap = new Map(
      commentsCounts.map((item) => [item._id.toString(), item.count])
    );

    const reelPostsWithCounts: IReelWithCounts[] = reelPosts.map((reel) => {
      const reelJSON = reel.toJSON();
      return {
        ...reelJSON,
        likesCount: likesCountMap.get(reel.id.toString()) || 0,
        commentsCount: commentsCountMap.get(reel.id.toString()) || 0,
        isLiked: false,
        location: {
          _id: (reelJSON.location as PopulatedLocation)._id,
          name: (reelJSON.location as PopulatedLocation).name,
        },
        category: {
          _id: (reelJSON.category as PopulatedCategory)._id,
          name: (reelJSON.category as PopulatedCategory).name,
          popularityPercentage: (reelJSON.category as PopulatedCategory)
            .popularityPercentage,
        },
      };
    });

    res.status(StatusCodes.OK).json({ reelData: reelPostsWithCounts });
  } catch (error) {
    console.error(error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Internal Server Error" });
  }
};

const getAllHistoryReels = async (req: Request, res: Response) => {
  const { limit = 10, offset = 0 } = req.query;
  const userId = req.params.userId;
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }
  try {
    const userHistory = await UserHistory.findOne({ user: userId })
      .limit(Number(limit))
      .skip(Number(offset));
    if (!userHistory) {
      return res.status(StatusCodes.OK).json({ watchedReels: [] });
    }

    const historyReelIds = userHistory.reels
      .reverse()
      .map((historyReel) => historyReel.reel);
    const reels = await Reel.find({ _id: { $in: historyReelIds } })
      .select("-likes -comments")
      .populate("location", "name")
      .populate("category", "name popularityPercentage")
      .exec();

    const [likesCounts, commentsCounts] = await Promise.all([
      Like.aggregate([
        { $match: { reel: { $in: historyReelIds } } },
        { $group: { _id: "$reel", count: { $sum: 1 } } },
      ]),
      Comment.aggregate([
        { $match: { reel: { $in: historyReelIds } } },
        { $group: { _id: "$reel", count: { $sum: 1 } } },
      ]),
    ]);

    const likesCountMap = new Map(
      likesCounts.map((item) => [item._id.toString(), item.count])
    );
    const commentsCountMap = new Map(
      commentsCounts.map((item) => [item._id.toString(), item.count])
    );

    const watchedReelsWithCounts = reels.map((reel) => {
      const reelJSON = reel.toJSON();
      return {
        ...reelJSON,
        likesCount: likesCountMap.get(reel.id.toString()) || 0,
        commentsCount: commentsCountMap.get(reel.id.toString()) || 0,
        isLiked: false,
        location: {
          _id: (reelJSON.location as PopulatedLocation)._id,
          name: (reelJSON.location as PopulatedLocation).name,
        },
        category: {
          _id: (reelJSON.category as PopulatedCategory)._id,
          name: (reelJSON.category as PopulatedCategory).name,
          popularityPercentage: (reelJSON.category as PopulatedCategory)
            .popularityPercentage,
        },
      } as IReelWithCounts;
    });

    res.status(StatusCodes.OK).json({ reelData: watchedReelsWithCounts });
  } catch (error) {
    console.error(error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Internal Server Error" });
  }
};

const markReelsWatched = async (req: AuthenticatedRequest, res: Response) => {
  const { reelIds } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    throw new UnauthenticatedError("User not authenticated");
  }

  try {
    let userHistory = await UserHistory.findOne({ user: userId });
    if (!userHistory) {
      userHistory = new UserHistory({ user: userId, reels: [] });
    }

    for (const reelId of reelIds) {
      if (
        !userHistory.reels.some(
          (r: { reel: mongoose.Types.ObjectId }) => r.reel.toString() === reelId
        )
      ) {
        userHistory.reels.push({ reel: reelId, watchedAt: new Date() });

        // Increment view count for the reel
        await Reel.findByIdAndUpdate(reelId, { $inc: { viewCount: 1 } });
      }
    }

    await userHistory.save();

    res
      .status(StatusCodes.OK)
      .json({ message: "Reels marked as watched successfully" });
  } catch (error) {
    console.error(error);
    throw new BadRequestError(
      error instanceof Error ? error.message : String(error)
    );
  }
};

const getHomeFeed = async (req: AuthenticatedRequest, res: Response) => {
  let { limit = 50, offset = 0 } = req.query;
  limit = Number(limit);
  offset = Number(offset);

  const userId = req.user?.userId;

  if (!userId) {
    throw new UnauthenticatedError("User not authenticated");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  try {
    const userHistory = await UserHistory.findOne({ user: userId });
    const watchedReelIds = userHistory
      ? userHistory.reels.map((r) => r.reel)
      : [];

    const uniqueReelsMap = new Map();
    let totalReels = 0;

    const addReelsToMap = async (reels: any) => {
      const reelIds = reels.map((reel: any) => reel._id);
      const [likesCounts, commentsCounts, likedReels] = await Promise.all([
        Like.aggregate([
          { $match: { reel: { $in: reelIds } } },
          { $group: { _id: "$reel", count: { $sum: 1 } } },
        ]),
        Comment.aggregate([
          { $match: { reel: { $in: reelIds } } },
          { $group: { _id: "$reel", count: { $sum: 1 } } },
        ]),
        Like.find({ user: userId, reel: { $in: reelIds } }).distinct("reel"),
      ]);

      const likesCountMap = new Map(
        likesCounts.map((item) => [item._id.toString(), item.count])
      );
      const commentsCountMap = new Map(
        commentsCounts.map((item) => [item._id.toString(), item.count])
      );
      const likedReelsSet = new Set(likedReels.map((id) => id?.toString()));

      for (const reel of reels) {
        if (!uniqueReelsMap.has(reel._id.toString())) {
          reel.isLiked = likedReelsSet.has(reel._id.toString());
          reel.likesCount = likesCountMap.get(reel._id.toString()) || 0;
          reel.commentsCount = commentsCountMap.get(reel._id.toString()) || 0;
          uniqueReelsMap.set(reel._id.toString(), reel);
          totalReels += 1;
        }
      }
    };

    // Fetch reels based on category popularity
    const popularReels = await fetchReels(
      {
        _id: { $nin: watchedReelIds },
      },
      { sort: { "category.popularityPercentage": -1 } }
    );

    await addReelsToMap(popularReels);

    // Fetch most liked reels
    if (totalReels < limit + offset) {
      const remainingLimit = limit + offset - totalReels;
      const mostLikedReels = await Reel.aggregate([
        { $match: { _id: { $nin: watchedReelIds } } },
        {
          $project: {
            location: 1,
            category: 1,
            videoUri: 1,
            thumbUri: 1,
            caption: 1,
            likesCount: { $size: "$likes" },
            commentsCount: { $size: "$comments" },
            createdAt: 1,
          },
        },
        { $sort: { likesCount: -1, commentsCount: -1, createdAt: -1 } },
        { $limit: remainingLimit },
        {
          $lookup: {
            from: "locations",
            localField: "location",
            foreignField: "_id",
            as: "location",
          },
        },
        { $unwind: "$location" },
        {
          $lookup: {
            from: "categories",
            localField: "category",
            foreignField: "_id",
            as: "category",
          },
        },
        { $unwind: "$category" },
        {
          $project: {
            videoUri: 1,
            thumbUri: 1,
            caption: 1,
            createdAt: 1,
            likesCount: 1,
            commentsCount: 1,
            location: {
              _id: "$location._id",
              name: "$location.name",
            },
            category: {
              _id: "$category._id",
              name: "$category.name",
              popularityPercentage: "$category.popularityPercentage",
            },
          },
        },
      ]);

      await addReelsToMap(mostLikedReels);
    }

    // Fetch latest reels
    if (totalReels < limit + offset) {
      const remainingLimit = limit + offset - totalReels;
      const latestReels = await fetchReels(
        {
          _id: { $nin: watchedReelIds },
        },
        { limit: remainingLimit }
      );

      await addReelsToMap(latestReels);
    }

    const uniqueReels = Array.from(uniqueReelsMap.values());

    if (offset >= uniqueReels.length) {
      return res.status(StatusCodes.OK).json({ reels: [] });
    }

    const response = uniqueReels.slice(offset, offset + limit).map((reel) => ({
      _id: reel._id,
      videoUri: reel.videoUri,
      thumbUri: reel.thumbUri,
      caption: reel.caption,
      createdAt: reel.createdAt,
      location: {
        _id: reel.location._id,
        name: reel.location.name,
      },
      category: {
        _id: reel.category._id,
        name: reel.category.name,
        popularityPercentage: reel.category.popularityPercentage,
      },
      likesCount: reel.likesCount,
      commentsCount: reel.commentsCount,
      isLiked: !!reel.isLiked,
    }));

    res.status(StatusCodes.OK).json({ reels: response });
  } catch (error) {
    console.error(error);
    throw new BadRequestError(
      error instanceof Error ? error.message : String(error)
    );
  }
};

// Assuming Reel model is already imported in your controller file
// import Reel from '../models/Reel';

// Constants
const TYPICAL_REEL_DURATION = 60; // in seconds
const WATCH_DURATION_THRESHOLD = 42; // 70% of 60 seconds
const WATCH_WEIGHT = 0.6;
const COMPLETE_WEIGHT = 0.2;
const LIKE_WEIGHT = 0.2;
const DECAY_FACTOR = 0.05;
const CACHE_TTL = 3600; // 1 hour
const MAX_USER_INTERACTIONS = 120;

// Partial type for category in user interactions
type PartialCategory = Pick<ICategory, "_id" | "name">;

// Interfaces
interface IUserInteraction extends Document {
  userId: string;
  videoId: string;
  category: PartialCategory;
  watchDuration: number;
  completed: boolean;
  liked: boolean;
  timestamp: Date;
}

interface IUserPreference extends Document {
  userId: string;
  preferences: {
    category: PartialCategory;
    score: number;
    lastUpdated: Date;
  }[];
  totalScore: number;
  lastInteractionDate: Date;
}

// MongoDB Schemas
const UserInteractionSchema = new Schema<IUserInteraction>({
  userId: { type: String, index: true },
  videoId: { type: String, index: true },
  category: {
    _id: { type: Schema.Types.ObjectId, ref: "Category", index: true },
    name: { type: String, index: true },
  },
  watchDuration: Number,
  completed: Boolean,
  liked: Boolean,
  timestamp: { type: Date, default: Date.now },
});

const UserPreferenceSchema = new Schema<IUserPreference>({
  userId: { type: String, index: true, unique: true },
  preferences: [
    {
      category: {
        _id: Schema.Types.ObjectId,
        name: String,
      },
      score: Number,
      lastUpdated: Date,
    },
  ],
  totalScore: Number,
  lastInteractionDate: Date,
});

const UserInteraction: Model<IUserInteraction> = mongoose.model(
  "UserInteraction",
  UserInteractionSchema
);
const UserPreference: Model<IUserPreference> = mongoose.model(
  "UserPreference",
  UserPreferenceSchema
);

// Utility Functions
function calculateScore(
  watchDurationSeconds: number,
  totalDurationSeconds: number,
  completed: boolean,
  liked: boolean
): number {
  totalDurationSeconds = Math.max(totalDurationSeconds, 1);

  let watchScore: number;

  if (completed) {
    watchScore = WATCH_WEIGHT;
  } else if (watchDurationSeconds >= WATCH_DURATION_THRESHOLD) {
    watchScore = WATCH_WEIGHT;
  } else {
    watchScore =
      WATCH_WEIGHT *
      Math.pow(watchDurationSeconds / WATCH_DURATION_THRESHOLD, 2);
  }

  const completeScore = completed ? COMPLETE_WEIGHT : 0;
  const likeScore = liked ? LIKE_WEIGHT : 0;

  return watchScore + completeScore + likeScore;
}

// Utility function to decay old scores
function decayScore(score: number, lastUpdated: Date, now: Date): number {
  const daysSinceLastUpdate =
    (now.getTime() - lastUpdated.getTime()) / (1000 * 3600 * 24);
  return score * Math.exp(-DECAY_FACTOR * daysSinceLastUpdate);
}
function normalizeScores(preferences: any): any {
  const totalScore = preferences.reduce(
    (sum: any, pref: any) => sum + pref.score,
    0
  );

  if (totalScore === 0) {
    // console.warn('Total score is 0. Setting all preferences to 0.');
    return preferences.map((pref: any) => ({ ...pref, score: 0 }));
  }

  let normalizedPreferences = preferences.map((pref: any) => ({
    ...pref,
    score: pref.score / totalScore,
  }));

  // Check if the sum is exactly 1 (allowing for small floating-point errors)
  const sum = normalizedPreferences.reduce(
    (sum: any, pref: any) => sum + pref.score,
    0
  );
  const diff = 1 - sum;

  if (Math.abs(diff) > 1e-10) {
    // If the difference is significant
    // console.warn(`Sum of normalized scores (${sum}) is not 1. Adjusting...`);

    // Distribute the difference proportionally among all preferences
    normalizedPreferences = normalizedPreferences.map((pref: any) => ({
      ...pref,
      score: pref.score + diff * (pref.score / sum),
    }));

    // Final check and adjustment to ensure sum is exactly 1
    const finalSum = normalizedPreferences.reduce(
      (sum: any, pref: any) => sum + pref.score,
      0
    );
    const finalDiff = 1 - finalSum;
    if (Math.abs(finalDiff) > 1e-15) {
      const highestScoreIndex = normalizedPreferences.reduce(
        (maxIndex: any, pref: any, currentIndex: any, arr: any) =>
          pref.score > arr[maxIndex].score ? currentIndex : maxIndex,
        0
      );
      normalizedPreferences[highestScoreIndex].score += finalDiff;
    }
  }

  // Final verification
  const verificationSum = normalizedPreferences.reduce(
    (sum: any, pref: any) => sum + pref.score,
    0
  );
  // console.log(`Final sum of normalized scores: ${verificationSum}`);
  if (Math.abs(verificationSum - 1) > 1e-10) {
    // console.error(`Normalization failed. Final sum (${verificationSum}) is not 1.`);
  }

  return normalizedPreferences;
}

async function updateUserPreferences(job: Job): Promise<void> {
  const { userId, videoId, category, watchDurationSeconds, completed, liked } =
    job.data;

  const reel = await Reel.findById(videoId);
  if (!reel) {
    // console.warn(`Reel not found for videoId: ${videoId}`);
    return;
  }

  const score = calculateScore(
    watchDurationSeconds,
    TYPICAL_REEL_DURATION,
    completed,
    liked
  );
  const now = new Date();

  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Handle UserInteraction
      const userInteractions = await UserInteraction.find({ userId })
        .sort({ timestamp: 1 })
        .session(session);

      if (userInteractions.length >= MAX_USER_INTERACTIONS) {
        await UserInteraction.findByIdAndDelete(
          userInteractions[0]._id
        ).session(session);
      }

      const newInteraction = new UserInteraction({
        userId,
        videoId,
        category: {
          _id: category._id,
          name: category.name,
        },
        watchDuration: watchDurationSeconds,
        completed,
        liked,
        timestamp: now,
      });

      await newInteraction.save({ session });

      // Handle UserPreference
      let userPreference = await UserPreference.findOne({ userId }).session(
        session
      );

      if (!userPreference) {
        userPreference = new UserPreference({
          userId,
          preferences: [],
          totalScore: 0,
          lastInteractionDate: now,
        });
      }

      // Decay all existing scores
      userPreference.preferences = userPreference.preferences.map((pref) => ({
        ...pref,
        score: decayScore(pref.score, pref.lastUpdated, now),
      }));

      const existingPrefIndex = userPreference.preferences.findIndex(
        (pref) =>
          pref.category &&
          pref.category._id &&
          pref.category._id.toString() === category._id.toString()
      );

      if (existingPrefIndex !== -1) {
        userPreference.preferences[existingPrefIndex].score += score;
        userPreference.preferences[existingPrefIndex].lastUpdated = now;
      } else {
        userPreference.preferences.push({
          category: {
            _id: category._id,
            name: category.name,
          },
          score,
          lastUpdated: now,
        });
      }

      // Recalculate total score
      userPreference.totalScore = userPreference.preferences.reduce(
        (sum, pref) => sum + pref.score,
        0
      );

      // Normalize scores
      userPreference.preferences = normalizeScores(userPreference.preferences);

      // Sort preferences by normalized score in descending order
      userPreference.preferences.sort((a, b) => b.score - a.score);

      userPreference.lastInteractionDate = now;

      await userPreference.save({ session });

      await session.commitTransaction();
      session.endSession();

      // console.log(`Updated preferences for user ${userId}, video ${videoId}, category: ${category.name}, watch duration: ${watchDurationSeconds}s, completed: ${completed}, score: ${score}`);
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    // console.error('Error updating user preferences:', error);
    throw error;
  }
}

// Utility function to set up logging for a queue
function setupQueueLogging(queueName: string) {
  const queueEvents = new QueueEvents(queueName);

  queueEvents.on("waiting", ({ jobId }) => {
    // console.log(`[${queueName}] Job ${jobId} is waiting`);
  });

  queueEvents.on("active", ({ jobId, prev }) => {
    // console.log(`[${queueName}] Job ${jobId} is now active; previous status was ${prev}`);
  });

  queueEvents.on("completed", ({ jobId, returnvalue }) => {
    // console.log(`[${queueName}] Job ${jobId} has completed and returned ${returnvalue}`);
  });

  queueEvents.on("failed", ({ jobId, failedReason }) => {
    // console.log(`[${queueName}] Job ${jobId} has failed with reason ${failedReason}`);
  });

  queueEvents.on("progress", ({ jobId, data }, timestamp) => {
    // console.log(`[${queueName}] Job ${jobId} reported progress ${data} at ${timestamp}`);
  });
}

// Set up queues with logging
const interactionQueue = new Queue("interaction", { connection: redisOptions });

setupQueueLogging("interaction");
setupQueueLogging("categoryUpdate");

// Set up workers with additional logging
const interactionWorker = new Worker("interaction", updateUserPreferences, {
  connection: redisOptions,
});

interactionWorker.on("completed", (job) => {
  // console.log(`[interaction] Worker completed job ${job.id}`);
});

interactionWorker.on("failed", (job, err) => {
  // console.error(`[interaction] Worker failed job ${job?.id} with error: ${err.message}`);
});

// API Endpoints
const logInteraction = async (req: Request, res: Response): Promise<void> => {
  const { userId, videoId, category, watchDuration, completed, liked } =
    req.body;

  if (
    !userId ||
    !videoId ||
    !category ||
    !category._id ||
    !category.name ||
    watchDuration === undefined
  ) {
    // console.warn('Invalid request body for log-interaction');
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  try {
    // Add job to the interaction queue
    await interactionQueue.add("updatePreferences", {
      userId,
      videoId,
      category: {
        _id: category._id,
        name: category.name,
      },
      watchDurationSeconds: watchDuration,
      completed,
      liked,
    });

    res.status(200).json({ message: "Interaction logged successfully" });
  } catch (error) {
    // console.error('Error queueing interaction job:', error);
    res.status(500).json({ error: "Internal server error" });
  }
};

async function getUserCategoryPreferences(userId: string) {
  const userPreferences = await UserPreference.findOne({ userId });
  if (!userPreferences) {
    return {};
  }

  return userPreferences.preferences.reduce(
    (acc: Record<string, number>, pref: any) => {
      acc[pref.category._id.toString()] = pref.score;
      return acc;
    },
    {}
  );
}

async function getPersonalizedReels(
  req: Request,
  res: Response
): Promise<void> {
  console.log("getPersonalizedReels function called");
  const userId = req.params.userId;
  const { limit = 20 } = req.query;
  const totalLimit = parseInt(limit as string);

  const startTime = performance.now();

  try {
    // Step 1: Get user preferences and watched reels
    const userPreferences = await getUserCategoryPreferences(userId);
    console.log("User preferences:", userPreferences);

    const watchedReels = await UserInteraction.distinct("videoId", { userId });
    console.log(`User ${userId} has watched ${watchedReels.length} reels`);

    const totalPreferenceScore = Object.values(userPreferences).reduce(
      (sum: number, score: number) => sum + score,
      0
    );

    // Step 2: Calculate the number of reels to fetch for each category
    const categoryLimits = Object.entries(userPreferences).map(
      ([categoryId, score]) => ({
        categoryId,
        limit: Math.max(
          1,
          Math.round((score / totalPreferenceScore) * totalLimit)
        ),
      })
    );

    console.log("Calculated category limits:", categoryLimits);

    // Step 3 & 4: Fetch reels for each category
    let fetchedReels: any[] = [];
    for (const { categoryId, limit } of categoryLimits) {
      const reels = await Reel.find({
        category: categoryId,
        _id: { $nin: watchedReels },
      })
        .limit(limit)
        .lean();

      console.log(
        `Fetched ${reels.length} reels for category ${categoryId} (limit was ${limit})`
      );
      fetchedReels = fetchedReels.concat(reels);
    }

    console.log(
      `Total reels fetched from preferred categories: ${fetchedReels.length}`
    );

    // If we don't have enough reels, fetch from random categories
    if (fetchedReels.length < totalLimit) {
      const remainingLimit = totalLimit - fetchedReels.length;
      console.log(
        `Fetching ${remainingLimit} additional reels from random categories`
      );

      const additionalReels = await Reel.find({
        _id: { $nin: [...watchedReels, ...fetchedReels.map((r) => r._id)] },
      })
        .limit(remainingLimit)
        .lean();

      console.log(`Fetched ${additionalReels.length} additional reels`);
      fetchedReels = fetchedReels.concat(additionalReels);
    }

    console.log(`Final number of fetched reels: ${fetchedReels.length}`);

    // Step 5: Shuffle the reels
    fetchedReels = fetchedReels.sort(() => 0.5 - Math.random());

    // Step 6: Check if more reels are available
    const totalReelsCount = await Reel.countDocuments({
      _id: { $nin: [...watchedReels, ...fetchedReels.map((r) => r._id)] },
    });
    const hasMore = totalReelsCount > 0;
    console.log(
      `Has more reels: ${hasMore}, Remaining reels count: ${totalReelsCount}`
    );

    // Prepare the final reels with necessary information
    const finalReels = await Promise.all(
      fetchedReels.map(async (reel) => {
        const category = await Category.findById(reel.category).lean();
        const location = await Location.findById(reel.location).lean();
        return {
          _id: reel._id,
          videoUri: reel.videoUri,
          thumbUri: reel.thumbUri,
          caption: reel.caption,
          category: {
            _id: category?._id,
            name: category?.name,
          },
          location: {
            _id: location?._id,
            name: location?.name,
            // prompt: location?.prompt
          },
          likesCount: reel.likes?.length || 0,
          commentsCount: reel.comments?.length || 0,
          viewCount: reel.viewCount,
          createdAt: reel.createdAt,
          updatedAt: reel.updatedAt,
          isLiked: reel.likes?.includes(userId) || false,
        };
      })
    );

    // Log the final distribution
    const finalDistribution = finalReels.reduce(
      (acc: Record<string, number>, reel: any) => {
        const categoryId = reel.category._id.toString();
        acc[categoryId] = (acc[categoryId] || 0) + 1;
        return acc;
      },
      {}
    );

    console.log("Final reel distribution:");
    Object.entries(finalDistribution).forEach(([categoryId, count]) => {
      const categoryName = finalReels.find(
        (r) => r.category._id?.toString() === categoryId
      )?.category.name;
      const originalLimit = categoryLimits.find(
        (cl) => cl.categoryId === categoryId
      )?.limit;
      console.log(
        `Category ${categoryName} (${categoryId}): ${count} reels (original limit: ${originalLimit})`
      );
    });

    // Step 7: Respond with the reels and hasMore flag
    res.status(200).json({
      reels: finalReels,
      hasMore,
    });

    const endTime = performance.now();
    console.log(
      `Personalized reels fetched for user ${userId} in ${
        endTime - startTime
      } ms`
    );
  } catch (error) {
    console.error("Error fetching personalized reels:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export {
  getLikedVideos,
  getReelPosts,
  getAllHistoryReels,
  markReelsWatched,
  getHomeFeed,
  logInteraction,
  getPersonalizedReels,
};
