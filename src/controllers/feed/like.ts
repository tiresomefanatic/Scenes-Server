import { StatusCodes } from "http-status-codes";
import { NotFoundError, BadRequestError } from "../../errors";
import Like from "../../models/Like";
import User from "../../models/User";
import Reel from "../../models/Reel";
import Comment from "../../models/Comment";
import Reply from "../../models/Reply";
import { Request, Response } from "express";
import { AuthenticatedRequest } from '../../middleware/authentication';




const likeComment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const commentId = req.params.commentId;
  if (!commentId) {
    throw new BadRequestError("Comment Id not available");
  }

  const userId = req.user?.userId;

  try {
    const comment = await Comment.findById(commentId).populate<{ reel: { user: string } }>("reel");
    if (!comment) {
      throw new NotFoundError("Comment not found");
    }

    const existingLike = await Like.findOne({
      user: userId,
      comment: commentId,
    });
    if (existingLike) {
      await Like.findByIdAndDelete(existingLike.id);
      if (comment.reel?.user?.toString() === userId) {
        comment.isLikedByAuthor = false;
        await comment.save();
      }
      res.status(StatusCodes.OK).json({ msg: "Unliked", data: existingLike });
    } else {
      const newLike = new Like({ user: userId, comment: commentId });
      await newLike.save();

      if (comment.reel?.user?.toString() === userId) {
        comment.isLikedByAuthor = true;
        await comment.save();
      }
      res.status(StatusCodes.OK).json({ msg: "Liked", data: newLike });
    }
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

const likeReply = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const replyId = req.params.replyId;
  if (!replyId) {
    throw new BadRequestError("Reply Id not available");
  }

  const userId = req.user?.userId;

  try {
    const reply = await Reply.findById(replyId).populate<{ comment: { _id: string } }>("comment");
    if (!reply) {
      throw new NotFoundError("reply not found");
    }

    const comment = await Comment.findById(reply.comment._id).populate<{ reel: { user: string } }>("reel");
    if (!comment) {
      throw new NotFoundError("Comment not found");
    }

    const existingLike = await Like.findOne({
      user: userId,
      reply: replyId,
    });
    if (existingLike) {
      await Like.findByIdAndDelete(existingLike.id);
      if (comment.reel.user.toString() === userId) {
        reply.isLikedByAuthor = false;
        await reply.save();
      }
      res.status(StatusCodes.OK).json({ msg: "Unliked", data: existingLike });
    } else {
      const newLike = new Like({ user: userId, reply: replyId });
      await newLike.save();

      if (comment.reel.user.toString() === userId) {
        reply.isLikedByAuthor = true;
        await reply.save();
      }

      res.status(StatusCodes.OK).json({ msg: "Liked", data: newLike });
    }
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      throw new BadRequestError(error.message);
    } else {
      throw new BadRequestError('An unknown error occurred');
    }
  }
};

const likeReel = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const reelId = req.params.reelId;
  if (!reelId) {
    throw new BadRequestError("Reel Id not available");
  }

  const userId = req.user?.userId;

  const reel = await Reel.findById(reelId);
  if (!reel) {
    throw new NotFoundError("reel not found");
  }

  try {
    const existingLike = await Like.findOne({ user: userId, reel: reel.id });
    if (existingLike) {
      await Like.findByIdAndDelete(existingLike.id);
      res.status(StatusCodes.OK).json({ msg: "Unliked", data: existingLike });
    } else {
      const newLike = new Like({ user: userId, reel: reel.id });
      await newLike.save();
      res.status(StatusCodes.OK).json({ msg: "Liked", data: newLike });
    }
  } catch (error) {
    console.error(error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Internal Server Error" });
  }
};

const listLikes = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { type, entityId, searchQuery, page = 1, limit = 15 } = req.query;
  const userId = req.user?.userId;

  try {
    let likes;
    let query = {};
    let populateQuery: {
      path: string;
      select: string;
      match?: {
        $or: Array<{ [key: string]: { $regex: string; $options: string } }>;
      };
    } = {
      path: "user",
      select: "username userImage name id",
    };
    if (type === "reel") {
      query = { reel: entityId };
    } else if (type === "comment") {
      query = { comment: entityId };
    } else if (type === "reply") {
      query = { reply: entityId };
    } else {
      throw new BadRequestError("Invalid type");
    }

    if (typeof searchQuery === 'string') {
      populateQuery.match = {
        $or: [
          { username: { $regex: searchQuery, $options: "i" } },
          { name: { $regex: searchQuery, $options: "i" } },
        ],
      };
    }

    likes = await Like.find(query).populate(populateQuery).lean();

    likes = likes.filter((like) => like.user);

    const userFollowing = await User.findById(userId)
      .select("following")
      .lean();
    const followingIds = new Set(
      userFollowing?.following?.map((id) => id.toString()) || []
    );

    likes = likes.map((like) => {
      return {
        ...like.user,
        isFollowing: followingIds.has(like.user._id.toString()),
      };
    });

    likes.sort((a, b) => {
      const aFollow = a.isFollowing;
      const bFollow = b.isFollowing;
      return aFollow === bFollow ? 0 : aFollow ? -1 : 1;
    });

    const startIndex = (Number(page) - 1) * Number(limit);
    const endIndex = Number(page) * Number(limit);
    const paginatedLikes = likes.slice(startIndex, endIndex);

    res.status(StatusCodes.OK).json(paginatedLikes);
  } catch (error) {
    console.error(error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Internal Server Error" });
  }
};

export { likeComment, likeReply, listLikes, likeReel };
