import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../../middleware/authentication';

import Reel, { IReelWithCounts } from '../../models/Reel';
import User from '../../models/User';
import Like from '../../models/Like';
import Comment from '../../models/Comment';
import Location from '../../models/Location';
import Category from '../../models/Category';
import { BadRequestError, NotFoundError, UnauthenticatedError } from '../../errors';
import mongoose from 'mongoose';

const createReel = async (req: Request, res: Response): Promise<void> => {
  const { videoUri, thumbUri, caption, locationId, categoryId } = req.body;
  if (!videoUri || !thumbUri || !caption || !locationId || !categoryId) {
    throw new BadRequestError("Invalid Body");
  }
  const accessToken = req.headers.authorization?.split(" ")[1];

  if (!accessToken) {
    throw new UnauthenticatedError("No access token provided");
  }

  try {
    const decodedToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET!) as jwt.JwtPayload;
    const userId = decodedToken.userId;

    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const location = await Location.findById(locationId);
    if (!location) {
      throw new NotFoundError("Location not found");
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      throw new NotFoundError("Category not found");
    }

    const newReel = new Reel({ location: locationId, category: categoryId, videoUri, caption, thumbUri });
    await newReel.save();

    res.status(StatusCodes.CREATED).json(newReel);
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthenticatedError("Invalid token");
    }
    throw new BadRequestError(error instanceof Error ? error.message : String(error));
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

interface ReelResponse {
  _id: mongoose.Types.ObjectId;
  videoUri: string;
  thumbUri: string;
  caption?: string;
  likesCount: number;
  commentsCount: number;
  location: {
    _id: mongoose.Types.ObjectId;
    name: string;
  };
  category: {
    _id: mongoose.Types.ObjectId;
    name: string;
    popularityPercentage: number;
  };
  createdAt: Date;
  updatedAt: Date;
  viewCount: number;
  isLiked: boolean;
}

const getReelById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { reelId } = req.params;
  const userId = req.user?.userId;

  if (!userId) {
    throw new UnauthenticatedError("User not authenticated");
  }

  try {
    const reel = await Reel.findById(reelId)
      .populate("location", "name")
      .populate("category", "name popularityPercentage")
      .select("-likes -comments");

    if (!reel) {
      throw new NotFoundError("Reel not found");
    }

    const likesCount = await Like.countDocuments({ reel: reelId });
    const commentsCount = await Comment.countDocuments({ reel: reelId });

    const isLiked = await Like.exists({ reel: reelId, user: userId });

    const reelData: ReelResponse = {
      _id: reel._id as mongoose.Types.ObjectId,
      videoUri: reel.videoUri,
      thumbUri: reel.thumbUri,
      caption: reel.caption,
      likesCount,
      commentsCount,
      location: {
        _id: (reel.location as PopulatedLocation)._id,
        name: (reel.location as PopulatedLocation).name
      },
      category: {
        _id: (reel.category as PopulatedCategory)._id,
        name: (reel.category as PopulatedCategory).name,
        popularityPercentage: (reel.category as PopulatedCategory).popularityPercentage
      },
      createdAt: reel.createdAt,
      updatedAt: reel.updatedAt,
      viewCount: reel.viewCount,
      isLiked: !!isLiked,
    };

    res.status(StatusCodes.OK).json(reelData);
  } catch (error) {
    console.error(error);
    throw new BadRequestError(error instanceof Error ? error.message : String(error));
  }
};

const deleteReel = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { reelId } = req.params;
  const userId = req.user?.userId;

  if (!userId) {
    throw new UnauthenticatedError("User not authenticated");
  }

  try {
    const reel = await Reel.findById(reelId);
    if (!reel) {
      throw new NotFoundError("Reel not found");
    }

    // TODO: Implement authorization logic
    // For example, check if the user is an admin or has special permissions to delete reels
    // You might want to add a field to the User model to store user roles or permissions

    await Reel.deleteOne({ _id: reelId });

    res.status(StatusCodes.OK).json({ msg: "Reel deleted successfully" });
  } catch (error) {
    console.error(error);
    throw new BadRequestError(error instanceof Error ? error.message : String(error));
  }
};

const updateReelCaption = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { reelId } = req.params;
  const { caption } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    throw new UnauthenticatedError("User not authenticated");
  }

  try {
    const reel = await Reel.findById(reelId);
    if (!reel) {
      throw new NotFoundError("Reel not found");
    }

    // TODO: Implement authorization logic
    // For example, check if the user is an admin or has special permissions to update reels
    // You might want to add a field to the User model to store user roles or permissions

    reel.caption = caption;
    await reel.save();

    res.status(StatusCodes.OK).json(reel);
  } catch (error) {
    throw new BadRequestError(error instanceof Error ? error.message : String(error));
  }
};

const updateReelCategory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { reelId } = req.params;
  const { categoryId } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    throw new UnauthenticatedError("User not authenticated");
  }

  try {
    const reel = await Reel.findById(reelId);
    if (!reel) {
      throw new NotFoundError("Reel not found");
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      throw new NotFoundError("Category not found");
    }

    // TODO: Implement authorization logic
    // For example, check if the user is an admin or has special permissions to update reels
    // You might want to add a field to the User model to store user roles or permissions

    reel.category = categoryId;
    await reel.save();

    res.status(StatusCodes.OK).json(reel);
  } catch (error) {
    throw new BadRequestError(error instanceof Error ? error.message : String(error));
  }
};

const updateReelLocation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { reelId } = req.params;
  const { locationId } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    throw new UnauthenticatedError("User not authenticated");
  }

  try {
    const reel = await Reel.findById(reelId);
    if (!reel) {
      throw new NotFoundError("Reel not found");
    }

    const location = await Location.findById(locationId);
    if (!location) {
      throw new NotFoundError("Location not found");
    }

    // TODO: Implement authorization logic
    // For example, check if the user is an admin or has special permissions to update reels
    // You might want to add a field to the User model to store user roles or permissions

    reel.location = locationId;
    await reel.save();

    res.status(StatusCodes.OK).json(reel);
  } catch (error) {
    throw new BadRequestError(error instanceof Error ? error.message : String(error));
  }
};

const locationIds = [
  "66d48f9e1a4e65ea9feaf762", "66d48f9e1a4e65ea9feaf763", "66d48f9e1a4e65ea9feaf764",
  "66d48f9e1a4e65ea9feaf765", "66d48f9e1a4e65ea9feaf766", "66d48f9e1a4e65ea9feaf767",
  "66d48f9e1a4e65ea9feaf768", "66d48f9e1a4e65ea9feaf769", "66d48f9e1a4e65ea9feaf76a",
  "66d48f9e1a4e65ea9feaf76b", "66d48f9e1a4e65ea9feaf76c", "66d48f9e1a4e65ea9feaf76d",
  "66d48f9e1a4e65ea9feaf76e", "66d48f9e1a4e65ea9feaf76f", "66d48f9e1a4e65ea9feaf770",
  "66d48f9e1a4e65ea9feaf771", "66d48f9e1a4e65ea9feaf772", "66d48f9e1a4e65ea9feaf773",
  "66d48f9e1a4e65ea9feaf774", "66d48f9e1a4e65ea9feaf775"
];

// Category IDs from the previous bulk insert (unchanged)
const categoryIds = [
 "66d4883f2434806067cef59a",
  "66d4883f2434806067cef599",
  "66d4883f2434806067cef5ba",
  "66d4883f2434806067cef5b4",
  "66d4883f2434806067cef5a0"
];

const videoUrls = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4"
];

const getRandomElement = (array: any[]) => array[Math.floor(Math.random() * array.length)];

const createSampleReel = () => ({
  location: new mongoose.Types.ObjectId(getRandomElement(locationIds)),
  category: new mongoose.Types.ObjectId(getRandomElement(categoryIds)),
  videoUri: getRandomElement(videoUrls),
  thumbUri: "https://picsum.photos/seed/user1beach/300/300",
  caption: `Sample reel caption ${Math.floor(Math.random() * 1000)}`,
  viewCount: Math.floor(Math.random() * 10000),
});

const bulkInsertReels = async (req: Request, res: Response): Promise<void> => {
  try {
    const numberOfReels = 100; // Fixed number of reels
    const sampleReels = Array.from({ length: numberOfReels }, createSampleReel);

    const result = await Reel.insertMany(sampleReels);

    res.status(StatusCodes.CREATED).json({
      message: 'Reels bulk inserted successfully',
      count: result.length
    });
  } catch (error) {
    console.error('Error bulk inserting reels:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Error bulk inserting reels',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export { 
  createReel, 
  getReelById, 
  deleteReel, 
  updateReelCaption, 
  updateReelCategory, 
  updateReelLocation,
  bulkInsertReels
};