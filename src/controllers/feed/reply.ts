import { StatusCodes } from "http-status-codes";
import { NotFoundError, BadRequestError } from "../../errors";
import Like from "../../models/Like";
import Comment from "../../models/Comment";
import Reply from "../../models/Reply";
import { Request, Response } from "express";
import { AuthenticatedRequest } from '../../middleware/authentication';
import { IReel } from "../../models/Reel";

const createReply = async (req: AuthenticatedRequest, res: Response) => {
  const { reply, mentionedUsers, gifUrl, commentId } = req.body;
  if ((!commentId || !gifUrl) && !reply) {
    throw new BadRequestError("Either reply or gifUrl is required");
  }
  const userId = req.user?.userId;
  if (!userId) {
    throw new BadRequestError("User not authenticated");
  }
  try {
    const comment = await Comment.findById(commentId).populate<{ reel: IReel }>('reel');
    if (!comment) {
      throw new NotFoundError("comment not found");
    }

    const newReply = new Reply({
      user: userId,
      reply: reply || null,
      mentionedUsers: mentionedUsers || null,
      hasGif: !!gifUrl,
      gifUrl: gifUrl || null,
      comment: commentId,
      reel: comment.reel._id,
    });
    await newReply.save();

    res
      .status(StatusCodes.CREATED)
      .json({ id: newReply.id, ...newReply.toJSON() });
  } catch (error) {
    console.error(error);
    throw new BadRequestError(error as string);
  }
};

const deleteReply = async (req: Request, res: Response) => {
  const { replyId } = req.params;
  try {
    const reply = await Reply.findByIdAndDelete(replyId);

    res
      .status(StatusCodes.OK)
      .json({ msg: "Reply deleted successfully", reply });
  } catch (error) {
    console.error(error);
    throw new BadRequestError(error instanceof Error ? error.message : String(error));
  }
};

const getPaginatedReplies = async (req: AuthenticatedRequest, res: Response) => {
  const { commentId, limit = 10, offset = 0 } = req.query;
  const userId = req.user?.userId;
  if (!userId) {
    throw new BadRequestError("User not authenticated");
  }
  try {
    // Fetch comments and sort them based on the defined criteria
    const replies = await Reply.find({ comment: commentId })
      .limit(Number(limit))
      .skip(Number(offset))
      .select("-likes")
      .populate("user", "username userImage")
      .exec();

    const finalReplies = await Promise.all(
      replies.map(async (reply) => {
        const likesCount = await Like.countDocuments({ reply: reply._id });
        const isLiked = await Like.countDocuments({
          reply: reply.id,
          user: userId,
          reel: reply.reel,
        });
        return {
          ...reply.toJSON(),
          likesCount,
          isLiked: isLiked == 0 ? false : true,
        };
      })
    );

    res.status(StatusCodes.OK).json(finalReplies);
  } catch (error) {
    console.error(error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Internal Server Error" });
  }
};

export {
  createReply,
  deleteReply,
  getPaginatedReplies,
};
