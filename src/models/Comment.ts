import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User';
import { IReel } from './Reel';
import { ILike } from './Like';
import { IReply } from './Reply';

export interface IComment extends Document {
  id: mongoose.Types.ObjectId;
  user: IUser['_id'];
  reel: IReel['_id'];
  comment?: string;
  likes: ILike['_id'][];
  isPinned: boolean;
  isLikedByAuthor: boolean;
  timestamp: Date;
  hasGif: boolean;
  gifUrl?: string;
  mentionedUsers: IUser['_id'][];
  replies: IReply['_id'][];
  createdAt: Date;
}

const CommentSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reel: { type: Schema.Types.ObjectId, ref: 'Reel', required: true },
  comment: { type: String, maxlength: 500 },
  likes: [{ type: Schema.Types.ObjectId, ref: 'Like' }],
  isPinned: { type: Boolean, default: false },
  isLikedByAuthor: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
  hasGif: { type: Boolean, default: false },
  gifUrl: { type: String },
  mentionedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  replies: [{ type: Schema.Types.ObjectId, ref: 'Reply' }],
});

CommentSchema.index({ user: 1 });
CommentSchema.index({ reel: 1 });
CommentSchema.index({ likes: 1 });
CommentSchema.index({ mentionedUsers: 1 });
CommentSchema.index({ replies: 1 });

const Comment = mongoose.model<IComment>('Comment', CommentSchema);

export default Comment;
