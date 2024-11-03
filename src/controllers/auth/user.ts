import { StatusCodes } from "http-status-codes";
import jwt from "jsonwebtoken";
import { Request, Response } from "express";
import mongoose from "mongoose";

import { AuthenticatedRequest } from '../../middleware/authentication';


import { BadRequestError, NotFoundError } from "../../errors";
import User, { IUser } from "../../models/User";
import Reel from "../../models/Reel";


// Get user profile
const getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new BadRequestError("User ID is missing");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  try {
    const followersCount = await User.countDocuments({ following: user._id });
    const followingCount = await User.countDocuments({ followers: user._id });
    const reelsCount = await Reel.countDocuments({ user: user._id });

    res.status(StatusCodes.OK).json({
      user: {
        name: user.name,
        id: user.id,
        username: user.username,
        userImage: user.userImage,
        email: user.email,
        bio: user.bio,
        followersCount,
        followingCount,
        reelsCount,
      },
    });
  } catch (error) {
    throw new BadRequestError(error instanceof Error ? error.message : String(error));
  }
};

const viewUserByHandle = async (req: AuthenticatedRequest, res: Response) => {
  const username = req.params.username;

  if (!username) {
    throw new BadRequestError("Missing username in path parameter");
  }

  const user = await User.findOne({ username: username }).select(
    "-followers -following"
  );

  if (!user) {
    throw new NotFoundError("User not found");
  }

  const followersCount = await User.countDocuments({ following: user._id });
  const isFollowing = await User.countDocuments({
    following: user._id,
    _id: req.user?.userId,
  });
  const followingCount = await User.countDocuments({ followers: user._id });
  const reelsCount = await Reel.countDocuments({ user: user._id });

  res.status(StatusCodes.OK).json({
    user: {
      id: user.id,
      userImage: user.userImage,
      username: user.username,
      bio: user.bio,
      followersCount,
      followingCount,
      reelsCount,
      isFollowing: isFollowing > 0,
    },
  });
};

// Update user profile
const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new BadRequestError("User ID is missing");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  const { name, bio, userImage } = req.body;

  if (!name && !bio && !userImage) {
    throw new BadRequestError("No Update Fields provided");
  }

  try {
    if (name) user.name = name;
    if (bio) user.bio = bio;
    if (userImage) user.userImage = userImage;

    await user.save();

    res.status(StatusCodes.OK).json({ msg: "Profile updated successfully" });
  } catch (error) {
    throw new BadRequestError(error instanceof Error ? error.message : String(error));
  }
};

const toggleFollowing = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new BadRequestError("User ID is missing");
  }

  const targetUserId = new mongoose.Types.ObjectId(req.params.userId);

  if (!targetUserId) {
    throw new BadRequestError("Missing target user ID");
  }

  // Check if the target user exists
  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    throw new NotFoundError("User not found");
  }

  const currentUser = await User.findById(userId);
  if (!currentUser) {
    throw new NotFoundError("User not found");
  }

  try {
    const isFollowing = currentUser.following.includes(targetUserId); // Check if already following

    if (isFollowing) {
      // Unfollow
      await User.updateOne({ _id: userId }, { $pull: { following: targetUserId } });
      await User.updateOne({ _id: targetUserId }, { $pull: { followers: userId } });
    } else {
      // Follow (update this part similarly)
      await User.updateOne({ _id: userId }, { $push: { following: targetUserId } });
      await User.updateOne({ _id: targetUserId }, { $push: { followers: userId } });
    }

    // Remove these lines
    // await currentUser.save();
    // await targetUser.save();

    res
      .status(StatusCodes.OK)
      .json({ msg: isFollowing ? "Unfollowed" : "Followed" });
  } catch (error) {
    throw new BadRequestError(error instanceof Error ? error.message : String(error));
  }
};

const getFollowers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.params.userId;
  const currentUserId = (req.user as { userId: string }).userId;
  const searchText = req.query.searchText as string;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = parseInt(req.query.offset as string) || 0;

  if (!userId) {
    throw new BadRequestError("Missing user ID in query parameter");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  const followers = await User.aggregate([
    {
      $match: {
        _id: { $in: user.followers },
        $or: [
          { name: { $regex: searchText, $options: "i" } },
          { username: { $regex: searchText, $options: "i" } },
        ],
      },
    },
    {
      $addFields: {
        isFollowing: { $in: [currentUserId, "$following"] },
      },
    },
    {
      $project: {
        name: 1,
        username: 1,
        userImage: 1,
        id: 1,
        isFollowing: 1,
      },
    },
    {
      $sort: {
        isFollowing: -1,
      },
    },
    {
      $skip: offset,
    },
    {
      $limit: limit,
    },
  ]);

  res.status(StatusCodes.OK).json(followers);
};

const getFollowing = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.params.userId;
  const currentUserId = new mongoose.Types.ObjectId((req.user as { userId: string }).userId);
  const searchText = req.query.searchText as string;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = parseInt(req.query.offset as string) || 0;

  if (!userId) {
    throw new BadRequestError("Missing user ID in query parameter");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new NotFoundError("User not found");
  }

  const following = await User.aggregate([
    {
      $match: { _id: { $in: user.following } },
    },
    {
      $addFields: {
        isFollowing: { $in: [currentUserId, "$followers"] },
      },
    },
    {
      $match: {
        $or: [
          { name: { $regex: searchText, $options: "i" } },
          { username: { $regex: searchText, $options: "i" } },
        ],
      },
    },
    {
      $project: {
        name: 1,
        username: 1,
        userImage: 1,
        id: 1,
        isFollowing: 1,
      },
    },
    {
      $sort: {
        isFollowing: -1,
      },
    },
    {
      $skip: offset,
    },
    {
      $limit: limit,
    },
  ]);

  res.status(StatusCodes.OK).json(following);
};

const getUsersBySearch = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const searchText = req.query.text as string;
  const limit = parseInt(req.query.limit as string) || 10;
  const userId = (req.user as { userId: string }).userId;
  let searchQuery: any = {};

  if (searchText) {
    searchQuery = {
      $or: [
        { name: { $regex: searchText, $options: "i" } },
        { username: { $regex: searchText, $options: "i" } },
      ],
    };
  }

  let users = await User.aggregate([
    {
      $match: searchQuery,
    },
    {
      $addFields: {
        isFollowing: { $in: [userId, "$followers"] },
      },
    },
    {
      $match: {
        _id: { $ne: userId },
      },
    },
    {
      $project: {
        _id: 1,
        username: 1,
        userImage: 1,
        name: 1,
      },
    },
    {
      $sort: {
        isFollowing: -1,
        createdAt: -1,
      },
    },
    {
      $limit: limit,
    },
  ]);

  res.status(StatusCodes.OK).json({ users });
};

// Replace the existing module.exports with this:
export {
  getProfile,
  updateProfile,
  toggleFollowing,
  getFollowers,
  getFollowing,
  viewUserByHandle,
  getUsersBySearch,
};
