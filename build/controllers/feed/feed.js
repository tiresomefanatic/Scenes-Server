"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPersonalizedReels = exports.logInteraction = exports.getHomeFeed = exports.markReelsWatched = exports.getAllHistoryReels = exports.getReelPosts = exports.getLikedVideos = void 0;
const http_status_codes_1 = require("http-status-codes");
const Like_1 = __importDefault(require("../../models/Like"));
const Reel_1 = __importDefault(require("../../models/Reel"));
const UserHistory_1 = __importDefault(require("../../models/UserHistory"));
const User_1 = __importDefault(require("../../models/User"));
const Comment_1 = __importDefault(require("../../models/Comment"));
const Location_1 = __importDefault(require("../../models/Location"));
const errors_1 = require("../../errors");
const mongoose_1 = __importStar(require("mongoose"));
const Category_1 = __importDefault(require("../../models/Category"));
const bullmq_1 = require("bullmq");
// Define your Redis connection options
const redisOptions = {
    host: "localhost",
    port: 6379
};
const fetchReels = (query, options = {}) => __awaiter(void 0, void 0, void 0, function* () {
    return Reel_1.default.find(query)
        .sort(options.sort || { createdAt: -1 })
        .limit(options.limit || 50)
        .select("-likes -comments")
        .populate("location", "name")
        .populate("category", "name popularityPercentage")
        .exec();
});
const getLikedVideos = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { limit = 10, offset = 0 } = req.query;
    const userId = req.params.userId;
    const user = yield User_1.default.findById(userId);
    if (!user) {
        throw new errors_1.NotFoundError("User not found");
    }
    try {
        let likedVideos = yield Like_1.default.find({
            user: userId,
            reel: { $exists: true },
        })
            .populate({
            path: "reel",
            populate: [
                { path: "location", select: "name" },
                { path: "category", select: "name popularityPercentage" }
            ],
            select: "-likes -comments",
        })
            .skip(Number(offset))
            .limit(Number(limit))
            .sort({ createdAt: -1 });
        likedVideos = likedVideos.filter((like) => like.reel !== null);
        if (!likedVideos || likedVideos.length === 0) {
            return res.status(http_status_codes_1.StatusCodes.OK).json({ reelData: [] });
        }
        const reelIds = likedVideos.map((like) => like.reel._id);
        const [likesCounts, commentsCounts] = yield Promise.all([
            Like_1.default.aggregate([
                { $match: { reel: { $in: reelIds } } },
                { $group: { _id: "$reel", count: { $sum: 1 } } },
            ]),
            Comment_1.default.aggregate([
                { $match: { reel: { $in: reelIds } } },
                { $group: { _id: "$reel", count: { $sum: 1 } } },
            ]),
        ]);
        const likesCountMap = new Map(likesCounts.map((item) => [item._id.toString(), item.count]));
        const commentsCountMap = new Map(commentsCounts.map((item) => [item._id.toString(), item.count]));
        const likedVideosWithCounts = likedVideos.map((like) => {
            const reel = like.reel.toJSON();
            return Object.assign(Object.assign({}, reel), { likesCount: likesCountMap.get(reel._id.toString()) || 0, commentsCount: commentsCountMap.get(reel._id.toString()) || 0, isLiked: true });
        });
        res.status(http_status_codes_1.StatusCodes.OK).json({ reelData: likedVideosWithCounts });
    }
    catch (error) {
        console.error(error);
        res
            .status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR)
            .json({ error: "Internal Server Error" });
    }
});
exports.getLikedVideos = getLikedVideos;
const getReelPosts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { limit = 10, offset = 0 } = req.query;
    const locationId = req.params.locationId;
    const location = yield Location_1.default.findById(locationId);
    if (!location) {
        throw new errors_1.NotFoundError("Location not found");
    }
    try {
        const reelPosts = yield Reel_1.default.find({ location: locationId })
            .sort({ createdAt: -1 })
            .skip(Number(offset))
            .limit(Number(limit))
            .populate("location", "name")
            .populate("category", "name popularityPercentage")
            .select("-likes -comments")
            .exec();
        const reelIds = reelPosts.map((reel) => reel._id);
        const [likesCounts, commentsCounts] = yield Promise.all([
            Like_1.default.aggregate([
                { $match: { reel: { $in: reelIds } } },
                { $group: { _id: "$reel", count: { $sum: 1 } } },
            ]),
            Comment_1.default.aggregate([
                { $match: { reel: { $in: reelIds } } },
                { $group: { _id: "$reel", count: { $sum: 1 } } },
            ]),
        ]);
        const likesCountMap = new Map(likesCounts.map((item) => [item._id.toString(), item.count]));
        const commentsCountMap = new Map(commentsCounts.map((item) => [item._id.toString(), item.count]));
        const reelPostsWithCounts = reelPosts.map((reel) => {
            const reelJSON = reel.toJSON();
            return Object.assign(Object.assign({}, reelJSON), { likesCount: likesCountMap.get(reel.id.toString()) || 0, commentsCount: commentsCountMap.get(reel.id.toString()) || 0, isLiked: false, location: {
                    _id: reelJSON.location._id,
                    name: reelJSON.location.name
                }, category: {
                    _id: reelJSON.category._id,
                    name: reelJSON.category.name,
                    popularityPercentage: reelJSON.category.popularityPercentage
                } });
        });
        res.status(http_status_codes_1.StatusCodes.OK).json({ reelData: reelPostsWithCounts });
    }
    catch (error) {
        console.error(error);
        res
            .status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR)
            .json({ error: "Internal Server Error" });
    }
});
exports.getReelPosts = getReelPosts;
const getAllHistoryReels = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { limit = 10, offset = 0 } = req.query;
    const userId = req.params.userId;
    const user = yield User_1.default.findById(userId);
    if (!user) {
        throw new errors_1.NotFoundError("User not found");
    }
    try {
        const userHistory = yield UserHistory_1.default.findOne({ user: userId })
            .limit(Number(limit))
            .skip(Number(offset));
        if (!userHistory) {
            return res.status(http_status_codes_1.StatusCodes.OK).json({ watchedReels: [] });
        }
        const historyReelIds = userHistory.reels
            .reverse()
            .map((historyReel) => historyReel.reel);
        const reels = yield Reel_1.default.find({ _id: { $in: historyReelIds } })
            .select("-likes -comments")
            .populate("location", "name")
            .populate("category", "name popularityPercentage")
            .exec();
        const [likesCounts, commentsCounts] = yield Promise.all([
            Like_1.default.aggregate([
                { $match: { reel: { $in: historyReelIds } } },
                { $group: { _id: "$reel", count: { $sum: 1 } } },
            ]),
            Comment_1.default.aggregate([
                { $match: { reel: { $in: historyReelIds } } },
                { $group: { _id: "$reel", count: { $sum: 1 } } },
            ]),
        ]);
        const likesCountMap = new Map(likesCounts.map((item) => [item._id.toString(), item.count]));
        const commentsCountMap = new Map(commentsCounts.map((item) => [item._id.toString(), item.count]));
        const watchedReelsWithCounts = reels.map((reel) => {
            const reelJSON = reel.toJSON();
            return Object.assign(Object.assign({}, reelJSON), { likesCount: likesCountMap.get(reel.id.toString()) || 0, commentsCount: commentsCountMap.get(reel.id.toString()) || 0, isLiked: false, location: {
                    _id: reelJSON.location._id,
                    name: reelJSON.location.name
                }, category: {
                    _id: reelJSON.category._id,
                    name: reelJSON.category.name,
                    popularityPercentage: reelJSON.category.popularityPercentage
                } });
        });
        res.status(http_status_codes_1.StatusCodes.OK).json({ reelData: watchedReelsWithCounts });
    }
    catch (error) {
        console.error(error);
        res
            .status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR)
            .json({ error: "Internal Server Error" });
    }
});
exports.getAllHistoryReels = getAllHistoryReels;
const markReelsWatched = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { reelIds } = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    if (!userId) {
        throw new errors_1.UnauthenticatedError("User not authenticated");
    }
    try {
        let userHistory = yield UserHistory_1.default.findOne({ user: userId });
        if (!userHistory) {
            userHistory = new UserHistory_1.default({ user: userId, reels: [] });
        }
        for (const reelId of reelIds) {
            if (!userHistory.reels.some((r) => r.reel.toString() === reelId)) {
                userHistory.reels.push({ reel: reelId, watchedAt: new Date() });
                // Increment view count for the reel
                yield Reel_1.default.findByIdAndUpdate(reelId, { $inc: { viewCount: 1 } });
            }
        }
        yield userHistory.save();
        res
            .status(http_status_codes_1.StatusCodes.OK)
            .json({ message: "Reels marked as watched successfully" });
    }
    catch (error) {
        console.error(error);
        throw new errors_1.BadRequestError(error instanceof Error ? error.message : String(error));
    }
});
exports.markReelsWatched = markReelsWatched;
const getHomeFeed = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    let { limit = 50, offset = 0 } = req.query;
    limit = Number(limit);
    offset = Number(offset);
    const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.userId;
    if (!userId) {
        throw new errors_1.UnauthenticatedError("User not authenticated");
    }
    const user = yield User_1.default.findById(userId);
    if (!user) {
        throw new errors_1.NotFoundError("User not found");
    }
    try {
        const userHistory = yield UserHistory_1.default.findOne({ user: userId });
        const watchedReelIds = userHistory
            ? userHistory.reels.map((r) => r.reel)
            : [];
        const uniqueReelsMap = new Map();
        let totalReels = 0;
        const addReelsToMap = (reels) => __awaiter(void 0, void 0, void 0, function* () {
            const reelIds = reels.map((reel) => reel._id);
            const [likesCounts, commentsCounts, likedReels] = yield Promise.all([
                Like_1.default.aggregate([
                    { $match: { reel: { $in: reelIds } } },
                    { $group: { _id: "$reel", count: { $sum: 1 } } },
                ]),
                Comment_1.default.aggregate([
                    { $match: { reel: { $in: reelIds } } },
                    { $group: { _id: "$reel", count: { $sum: 1 } } },
                ]),
                Like_1.default.find({ user: userId, reel: { $in: reelIds } }).distinct("reel"),
            ]);
            const likesCountMap = new Map(likesCounts.map((item) => [item._id.toString(), item.count]));
            const commentsCountMap = new Map(commentsCounts.map((item) => [item._id.toString(), item.count]));
            const likedReelsSet = new Set(likedReels.map((id) => id === null || id === void 0 ? void 0 : id.toString()));
            for (const reel of reels) {
                if (!uniqueReelsMap.has(reel._id.toString())) {
                    reel.isLiked = likedReelsSet.has(reel._id.toString());
                    reel.likesCount = likesCountMap.get(reel._id.toString()) || 0;
                    reel.commentsCount = commentsCountMap.get(reel._id.toString()) || 0;
                    uniqueReelsMap.set(reel._id.toString(), reel);
                    totalReels += 1;
                }
            }
        });
        // Fetch reels based on category popularity
        const popularReels = yield fetchReels({
            _id: { $nin: watchedReelIds },
        }, { sort: { "category.popularityPercentage": -1 } });
        yield addReelsToMap(popularReels);
        // Fetch most liked reels
        if (totalReels < limit + offset) {
            const remainingLimit = limit + offset - totalReels;
            const mostLikedReels = yield Reel_1.default.aggregate([
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
            yield addReelsToMap(mostLikedReels);
        }
        // Fetch latest reels
        if (totalReels < limit + offset) {
            const remainingLimit = limit + offset - totalReels;
            const latestReels = yield fetchReels({
                _id: { $nin: watchedReelIds },
            }, { limit: remainingLimit });
            yield addReelsToMap(latestReels);
        }
        const uniqueReels = Array.from(uniqueReelsMap.values());
        if (offset >= uniqueReels.length) {
            return res.status(http_status_codes_1.StatusCodes.OK).json({ reels: [] });
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
        res.status(http_status_codes_1.StatusCodes.OK).json({ reels: response });
    }
    catch (error) {
        console.error(error);
        throw new errors_1.BadRequestError(error instanceof Error ? error.message : String(error));
    }
});
exports.getHomeFeed = getHomeFeed;
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
// MongoDB Schemas
const UserInteractionSchema = new mongoose_1.Schema({
    userId: { type: String, index: true },
    videoId: { type: String, index: true },
    category: {
        _id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Category', index: true },
        name: { type: String, index: true }
    },
    watchDuration: Number,
    completed: Boolean,
    liked: Boolean,
    timestamp: { type: Date, default: Date.now },
});
const UserPreferenceSchema = new mongoose_1.Schema({
    userId: { type: String, index: true, unique: true },
    preferences: [{
            category: {
                _id: mongoose_1.Schema.Types.ObjectId,
                name: String
            },
            score: Number,
            lastUpdated: Date
        }],
    totalScore: Number,
    lastInteractionDate: Date
});
const UserInteraction = mongoose_1.default.model('UserInteraction', UserInteractionSchema);
const UserPreference = mongoose_1.default.model('UserPreference', UserPreferenceSchema);
// Utility Functions
function calculateScore(watchDurationSeconds, totalDurationSeconds, completed, liked) {
    totalDurationSeconds = Math.max(totalDurationSeconds, 1);
    let watchScore;
    if (completed) {
        watchScore = WATCH_WEIGHT;
    }
    else if (watchDurationSeconds >= WATCH_DURATION_THRESHOLD) {
        watchScore = WATCH_WEIGHT;
    }
    else {
        watchScore = WATCH_WEIGHT * Math.pow(watchDurationSeconds / WATCH_DURATION_THRESHOLD, 2);
    }
    const completeScore = completed ? COMPLETE_WEIGHT : 0;
    const likeScore = liked ? LIKE_WEIGHT : 0;
    return watchScore + completeScore + likeScore;
}
// Utility function to decay old scores
function decayScore(score, lastUpdated, now) {
    const daysSinceLastUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 3600 * 24);
    return score * Math.exp(-DECAY_FACTOR * daysSinceLastUpdate);
}
function normalizeScores(preferences) {
    const totalScore = preferences.reduce((sum, pref) => sum + pref.score, 0);
    if (totalScore === 0) {
        // console.warn('Total score is 0. Setting all preferences to 0.');
        return preferences.map((pref) => (Object.assign(Object.assign({}, pref), { score: 0 })));
    }
    let normalizedPreferences = preferences.map((pref) => (Object.assign(Object.assign({}, pref), { score: pref.score / totalScore })));
    // Check if the sum is exactly 1 (allowing for small floating-point errors)
    const sum = normalizedPreferences.reduce((sum, pref) => sum + pref.score, 0);
    const diff = 1 - sum;
    if (Math.abs(diff) > 1e-10) { // If the difference is significant
        // console.warn(`Sum of normalized scores (${sum}) is not 1. Adjusting...`);
        // Distribute the difference proportionally among all preferences
        normalizedPreferences = normalizedPreferences.map((pref) => (Object.assign(Object.assign({}, pref), { score: pref.score + (diff * (pref.score / sum)) })));
        // Final check and adjustment to ensure sum is exactly 1
        const finalSum = normalizedPreferences.reduce((sum, pref) => sum + pref.score, 0);
        const finalDiff = 1 - finalSum;
        if (Math.abs(finalDiff) > 1e-15) {
            const highestScoreIndex = normalizedPreferences.reduce((maxIndex, pref, currentIndex, arr) => pref.score > arr[maxIndex].score ? currentIndex : maxIndex, 0);
            normalizedPreferences[highestScoreIndex].score += finalDiff;
        }
    }
    // Final verification
    const verificationSum = normalizedPreferences.reduce((sum, pref) => sum + pref.score, 0);
    // console.log(`Final sum of normalized scores: ${verificationSum}`);
    if (Math.abs(verificationSum - 1) > 1e-10) {
        // console.error(`Normalization failed. Final sum (${verificationSum}) is not 1.`);
    }
    return normalizedPreferences;
}
function updateUserPreferences(job) {
    return __awaiter(this, void 0, void 0, function* () {
        const { userId, videoId, category, watchDurationSeconds, completed, liked } = job.data;
        const reel = yield Reel_1.default.findById(videoId);
        if (!reel) {
            // console.warn(`Reel not found for videoId: ${videoId}`);
            return;
        }
        const score = calculateScore(watchDurationSeconds, TYPICAL_REEL_DURATION, completed, liked);
        const now = new Date();
        try {
            const session = yield mongoose_1.default.startSession();
            session.startTransaction();
            try {
                // Handle UserInteraction
                const userInteractions = yield UserInteraction.find({ userId })
                    .sort({ timestamp: 1 })
                    .session(session);
                if (userInteractions.length >= MAX_USER_INTERACTIONS) {
                    yield UserInteraction.findByIdAndDelete(userInteractions[0]._id).session(session);
                }
                const newInteraction = new UserInteraction({
                    userId,
                    videoId,
                    category: {
                        _id: category._id,
                        name: category.name
                    },
                    watchDuration: watchDurationSeconds,
                    completed,
                    liked,
                    timestamp: now
                });
                yield newInteraction.save({ session });
                // Handle UserPreference
                let userPreference = yield UserPreference.findOne({ userId }).session(session);
                if (!userPreference) {
                    userPreference = new UserPreference({
                        userId,
                        preferences: [],
                        totalScore: 0,
                        lastInteractionDate: now
                    });
                }
                // Decay all existing scores
                userPreference.preferences = userPreference.preferences.map(pref => (Object.assign(Object.assign({}, pref), { score: decayScore(pref.score, pref.lastUpdated, now) })));
                const existingPrefIndex = userPreference.preferences.findIndex(pref => pref.category && pref.category._id && pref.category._id.toString() === category._id.toString());
                if (existingPrefIndex !== -1) {
                    userPreference.preferences[existingPrefIndex].score += score;
                    userPreference.preferences[existingPrefIndex].lastUpdated = now;
                }
                else {
                    userPreference.preferences.push({
                        category: {
                            _id: category._id,
                            name: category.name
                        },
                        score,
                        lastUpdated: now
                    });
                }
                // Recalculate total score
                userPreference.totalScore = userPreference.preferences.reduce((sum, pref) => sum + pref.score, 0);
                // Normalize scores
                userPreference.preferences = normalizeScores(userPreference.preferences);
                // Sort preferences by normalized score in descending order
                userPreference.preferences.sort((a, b) => b.score - a.score);
                userPreference.lastInteractionDate = now;
                yield userPreference.save({ session });
                yield session.commitTransaction();
                session.endSession();
                // console.log(`Updated preferences for user ${userId}, video ${videoId}, category: ${category.name}, watch duration: ${watchDurationSeconds}s, completed: ${completed}, score: ${score}`);
            }
            catch (error) {
                yield session.abortTransaction();
                session.endSession();
                throw error;
            }
        }
        catch (error) {
            // console.error('Error updating user preferences:', error);
            throw error;
        }
    });
}
// async function getUserCategoryPreferences(userId: string): Promise<Record<string, number>> {
//   const preferences: Record<string, number> = {};
//   const userPreference = await UserPreference.findOne({ userId });
//   // console.log(`User preference for ${userId}:`, userPreference);
//   if (userPreference) {
//     // console.log('User preferences array:', userPreference.preferences);
//     userPreference.preferences.forEach(pref => {
//       // console.log('Processing preference:', pref);
//       if (pref.category && pref.category._id) {
//         preferences[pref.category._id.toString()] = pref.score;
//       } else {
//         // console.warn('Invalid preference structure:', pref);
//       }
//     });
//   } else {
//     // console.warn(`No UserPreference found for userId: ${userId}`);
//   }
//   // console.log('-------------preferences', preferences);
//   return preferences;
// }
// Utility function to set up logging for a queue
function setupQueueLogging(queueName) {
    const queueEvents = new bullmq_1.QueueEvents(queueName);
    queueEvents.on('waiting', ({ jobId }) => {
        // console.log(`[${queueName}] Job ${jobId} is waiting`);
    });
    queueEvents.on('active', ({ jobId, prev }) => {
        // console.log(`[${queueName}] Job ${jobId} is now active; previous status was ${prev}`);
    });
    queueEvents.on('completed', ({ jobId, returnvalue }) => {
        // console.log(`[${queueName}] Job ${jobId} has completed and returned ${returnvalue}`);
    });
    queueEvents.on('failed', ({ jobId, failedReason }) => {
        // console.log(`[${queueName}] Job ${jobId} has failed with reason ${failedReason}`);
    });
    queueEvents.on('progress', ({ jobId, data }, timestamp) => {
        // console.log(`[${queueName}] Job ${jobId} reported progress ${data} at ${timestamp}`);
    });
}
// Set up queues with logging
const interactionQueue = new bullmq_1.Queue('interaction', { connection: redisOptions });
setupQueueLogging('interaction');
setupQueueLogging('categoryUpdate');
// Set up workers with additional logging
const interactionWorker = new bullmq_1.Worker('interaction', updateUserPreferences, {
    connection: redisOptions
});
interactionWorker.on('completed', (job) => {
    // console.log(`[interaction] Worker completed job ${job.id}`);
});
interactionWorker.on('failed', (job, err) => {
    // console.error(`[interaction] Worker failed job ${job?.id} with error: ${err.message}`);
});
// API Endpoints
const logInteraction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, videoId, category, watchDuration, completed, liked } = req.body;
    if (!userId || !videoId || !category || !category._id || !category.name || watchDuration === undefined) {
        // console.warn('Invalid request body for log-interaction');
        res.status(400).json({ error: 'Invalid request body' });
        return;
    }
    try {
        // Add job to the interaction queue
        yield interactionQueue.add('updatePreferences', {
            userId,
            videoId,
            category: {
                _id: category._id,
                name: category.name
            },
            watchDurationSeconds: watchDuration,
            completed,
            liked
        });
        res.status(200).json({ message: 'Interaction logged successfully' });
    }
    catch (error) {
        // console.error('Error queueing interaction job:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.logInteraction = logInteraction;
function getUserCategoryPreferences(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const userPreferences = yield UserPreference.findOne({ userId });
        if (!userPreferences) {
            return {};
        }
        return userPreferences.preferences.reduce((acc, pref) => {
            acc[pref.category._id.toString()] = pref.score;
            return acc;
        }, {});
    });
}
// async function getUserCategoryPreferences(userId: string) {
//   const userPreferences = await UserPreference.findOne({ userId });
//   if (!userPreferences) {
//     return {};
//   }
//   return userPreferences.preferences.reduce<Record<string, number>>((acc, pref) => {
//     if (pref.category && pref.category._id) {
//       acc[pref.category._id.toString()] = pref.score;
//     }
//     return acc;
//   }, {});
// }
function getPersonalizedReels(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('getPersonalizedReels function called');
        const userId = req.params.userId;
        const { limit = 20 } = req.query;
        const totalLimit = parseInt(limit);
        const startTime = performance.now();
        try {
            // Step 1: Get user preferences and watched reels
            const userPreferences = yield getUserCategoryPreferences(userId);
            console.log('User preferences:', userPreferences);
            const watchedReels = yield UserInteraction.distinct('videoId', { userId });
            console.log(`User ${userId} has watched ${watchedReels.length} reels`);
            const totalPreferenceScore = Object.values(userPreferences).reduce((sum, score) => sum + score, 0);
            // Step 2: Calculate the number of reels to fetch for each category
            const categoryLimits = Object.entries(userPreferences).map(([categoryId, score]) => ({
                categoryId,
                limit: Math.max(1, Math.round((score / totalPreferenceScore) * totalLimit))
            }));
            console.log('Calculated category limits:', categoryLimits);
            // Step 3 & 4: Fetch reels for each category
            let fetchedReels = [];
            for (const { categoryId, limit } of categoryLimits) {
                const reels = yield Reel_1.default.find({
                    category: categoryId,
                    _id: { $nin: watchedReels }
                })
                    .limit(limit)
                    .lean();
                console.log(`Fetched ${reels.length} reels for category ${categoryId} (limit was ${limit})`);
                fetchedReels = fetchedReels.concat(reels);
            }
            console.log(`Total reels fetched from preferred categories: ${fetchedReels.length}`);
            // If we don't have enough reels, fetch from random categories
            if (fetchedReels.length < totalLimit) {
                const remainingLimit = totalLimit - fetchedReels.length;
                console.log(`Fetching ${remainingLimit} additional reels from random categories`);
                const additionalReels = yield Reel_1.default.find({
                    _id: { $nin: [...watchedReels, ...fetchedReels.map(r => r._id)] }
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
            const totalReelsCount = yield Reel_1.default.countDocuments({
                _id: { $nin: [...watchedReels, ...fetchedReels.map(r => r._id)] }
            });
            const hasMore = totalReelsCount > 0;
            console.log(`Has more reels: ${hasMore}, Remaining reels count: ${totalReelsCount}`);
            // Prepare the final reels with necessary information
            const finalReels = yield Promise.all(fetchedReels.map((reel) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c;
                const category = yield Category_1.default.findById(reel.category).lean();
                const location = yield Location_1.default.findById(reel.location).lean();
                return {
                    _id: reel._id,
                    videoUri: reel.videoUri,
                    thumbUri: reel.thumbUri,
                    caption: reel.caption,
                    category: {
                        _id: category === null || category === void 0 ? void 0 : category._id,
                        name: category === null || category === void 0 ? void 0 : category.name
                    },
                    location: {
                        _id: location === null || location === void 0 ? void 0 : location._id,
                        name: location === null || location === void 0 ? void 0 : location.name,
                        prompt: location === null || location === void 0 ? void 0 : location.prompt
                    },
                    likesCount: ((_a = reel.likes) === null || _a === void 0 ? void 0 : _a.length) || 0,
                    commentsCount: ((_b = reel.comments) === null || _b === void 0 ? void 0 : _b.length) || 0,
                    viewCount: reel.viewCount,
                    createdAt: reel.createdAt,
                    updatedAt: reel.updatedAt,
                    isLiked: ((_c = reel.likes) === null || _c === void 0 ? void 0 : _c.includes(userId)) || false
                };
            })));
            // Log the final distribution
            const finalDistribution = finalReels.reduce((acc, reel) => {
                const categoryId = reel.category._id.toString();
                acc[categoryId] = (acc[categoryId] || 0) + 1;
                return acc;
            }, {});
            console.log('Final reel distribution:');
            Object.entries(finalDistribution).forEach(([categoryId, count]) => {
                var _a, _b;
                const categoryName = (_a = finalReels.find(r => { var _a; return ((_a = r.category._id) === null || _a === void 0 ? void 0 : _a.toString()) === categoryId; })) === null || _a === void 0 ? void 0 : _a.category.name;
                const originalLimit = (_b = categoryLimits.find(cl => cl.categoryId === categoryId)) === null || _b === void 0 ? void 0 : _b.limit;
                console.log(`Category ${categoryName} (${categoryId}): ${count} reels (original limit: ${originalLimit})`);
            });
            // Step 7: Respond with the reels and hasMore flag
            res.status(200).json({
                reels: finalReels,
                hasMore
            });
            const endTime = performance.now();
            console.log(`Personalized reels fetched for user ${userId} in ${endTime - startTime} ms`);
        }
        catch (error) {
            console.error('Error fetching personalized reels:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
}
exports.getPersonalizedReels = getPersonalizedReels;
