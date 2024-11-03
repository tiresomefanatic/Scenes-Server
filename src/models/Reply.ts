import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User';
import { IComment } from './Comment';
import { IReel } from './Reel';
import { ILike } from './Like';

export interface IReply extends Document {
  comment: IComment['_id'];
  reel: IReel['_id'];
  user: IUser['_id'];
  reply: string;
  likes: ILike['_id'][];
  mentionedUsers: IUser['_id'][];
  hasGif: boolean;
  isLikedByAuthor: boolean;
  gifUrl?: string;
  timestamp: Date;
}

const ReplySchema: Schema = new Schema({
  comment: {
    type: Schema.Types.ObjectId,
    ref: 'Comment',
    required: true,
  },
  reel: {
    type: Schema.Types.ObjectId,
    ref: 'Reel',
    required: true,
  },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reply: { type: String, maxlength: 500 },
  likes: [{ type: Schema.Types.ObjectId, ref: 'Like' }],
  mentionedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  hasGif: { type: Boolean, default: false },
  isLikedByAuthor: { type: Boolean, default: false },
  gifUrl: { type: String },
  timestamp: { type: Date, default: Date.now },
});

ReplySchema.index({ comment: 1 });
ReplySchema.index({ user: 1 });
ReplySchema.index({ likes: 1 });

const Reply = mongoose.model<IReply>('Reply', ReplySchema);

export default Reply;
