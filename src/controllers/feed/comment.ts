import { AuthenticatedRequest } from '../../middleware/authentication';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { NotFoundError } from '../../errors';
import User from '../../models/User';
import Reel from '../../models/Reel';
import Like from '../../models/Like';
import Comment from '../../models/Comment';
import Reply from '../../models/Reply';
import { IComment } from '../../models/Comment'; // Add this import
import mongoose from 'mongoose';

const getPaginatedComments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { reelId, limit = '10', offset = '0' } = req.query;
  const userId = req.user?.userId;
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }
  try {
    // Fetch comments with the required fields and sort them by createdAt initially
    const comments = await Comment.find({ reel: reelId })
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(offset))
      .select("-likes")
      .populate("user", "username userImage id name")
      .populate("replies.user", "username userImage id name")
      .exec();

    // Get all comment IDs for batch operations
    const commentIds = comments.map((comment) => comment._id);

    // Fetch likes and replies counts in a single batch query using aggregation
    const [likesCounts, repliesCounts, userLikes] = await Promise.all([
      Like.aggregate([
        { $match: { comment: { $in: commentIds } } },
        { $group: { _id: "$comment", count: { $sum: 1 } } },
      ]),
      Reply.aggregate([
        { $match: { comment: { $in: commentIds } } },
        { $group: { _id: "$comment", count: { $sum: 1 } } },
      ]),
      Like.find({ user: userId, comment: { $in: commentIds } }).distinct(
        "comment"
      ),
    ]);

    // Convert arrays to maps for quick lookup
    const likesCountMap = new Map(
      likesCounts.map((item) => [item._id.toString(), item.count])
    );
    const repliesCountMap = new Map(
      repliesCounts.map((item) => [item._id.toString(), item.count])
    );
    const userLikesSet = new Set(userLikes.map((id: any) => id.toString()));

    // Enrich comments with counts and liked status
    const enrichedComments = comments.map((comment: IComment) => {
      const commentJSON = comment.toJSON() as IComment & {
        likesCount: number;
        repliesCount: number;
        isLiked: boolean;
      };
      commentJSON.likesCount = likesCountMap.get(comment._id?.toString()) || 0;
      commentJSON.repliesCount = repliesCountMap.get(comment._id?.toString()) || 0;
      commentJSON.isLiked = userLikesSet.has(comment._id?.toString());
      return commentJSON;
    });

    // Sort comments based on custom criteria
    const sortedComments = enrichedComments.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      if (a.isLikedByAuthor && !b.isLikedByAuthor) return -1;
      if (!a.isLikedByAuthor && b.isLikedByAuthor) return 1;

      const aHasUserReply = a.replies.some(
        (reply: any) => reply.user._id.toString() === userId
      );
      const bHasUserReply = b.replies.some(
        (reply: any) => reply.user._id.toString() === userId
      );

      if (aHasUserReply && !bHasUserReply) return -1;
      if (!aHasUserReply && bHasUserReply) return 1;

      if (a.likesCount > b.likesCount) return -1;
      if (a.likesCount < b.likesCount) return 1;

      const aUserFollowing = (a.user as ICommentUser).followers?.includes(userId!) ?? false;
      const bUserFollowing = (b.user as ICommentUser).followers?.includes(userId!) ?? false;

      if (aUserFollowing && !bUserFollowing) return -1;
      if (!aUserFollowing && bUserFollowing) return 1;

      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    res.status(StatusCodes.OK).json(sortedComments);
  } catch (error) {
    console.error(error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Internal Server Error" });
  }
};

interface ICommentUser {
  _id: mongoose.Types.ObjectId;
  followers?: string[];
}

const createComment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { comment, mentionedUsers, gifUrl, reelId } = req.body;
  if ((!comment || !gifUrl) && !reelId) {
    // Handle this case (e.g., throw an error or return)
  }
  const { userId } = req.user as { userId: string };
  try {
    const reel = await Reel.findById(reelId);
    if (!reel) {
      throw new NotFoundError("Reel not found");
    }

    const newComment = new Comment({
      user: userId,
      comment: comment ? comment : null,
      mentionedUsers: mentionedUsers ? mentionedUsers : null,
      hasGif: gifUrl ? true : false,
      gifUrl: gifUrl ? gifUrl : null,
      reel: reelId,
    });
    await newComment.save();


    res
      .status(StatusCodes.CREATED)
      .json({ ...newComment.toJSON(), repliesCount: 0 });
  } catch (error) {
    console.error(error);
    if (error instanceof NotFoundError) {
      res.status(StatusCodes.NOT_FOUND).json({ error: error.message });
    } else {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: "Internal Server Error" });
    }
  }
};

const deleteComment = async (req: Request, res: Response): Promise<void> => {
  const { commentId } = req.params;

  try {
    const comment = await Comment.findByIdAndDelete(commentId);

    res
      .status(StatusCodes.OK)
      .json({ msg: "Comment deleted successfully", comment });
  } catch (error) {
    console.error(error);
    if (error instanceof NotFoundError) {
      res.status(StatusCodes.NOT_FOUND).json({ error: error.message });
    } else {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: "Internal Server Error" });
    }
  }
};

const markPin = async (req: Request, res: Response): Promise<void> => {
  const { commentId } = req.body;
  try {
    const comment = await Comment.findById(commentId);
    if (!comment) {
      throw new NotFoundError("Comment not found");
    }
    comment.isPinned = !comment.isPinned;
    await comment.save();
    res.status(StatusCodes.OK).json(comment);
  } catch (error) {
    console.error(error);
    if (error instanceof NotFoundError) {
      res.status(StatusCodes.NOT_FOUND).json({ error: error.message });
    } else {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: "Internal Server Error" });
    }
  }
};

export {
  getPaginatedComments,
  createComment,
  deleteComment,
  markPin,
};
