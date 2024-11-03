import mongoose, { Document, Schema } from "mongoose";
import { IUser } from "./User";
import { IReel } from "./Reel";
import { IComment } from "./Comment";
import { IReply } from "./Reply";

export interface ILike extends Document {
  user: IUser["_id"];
  reel?: IReel["_id"];
  comment?: IComment["_id"];
  reply?: IReply["_id"];
  createdAt: Date;
  updatedAt: Date;
}

const LikeSchema = new Schema<ILike>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reel: { type: Schema.Types.ObjectId, ref: "Reel" },
    comment: { type: Schema.Types.ObjectId, ref: "Comment" },
    reply: { type: Schema.Types.ObjectId, ref: "Reply" },
  },
  { timestamps: true }
);

LikeSchema.index({ user: 1, reel: 1 });
LikeSchema.index({ user: 1, comment: 1 });
LikeSchema.index({ user: 1, reply: 1 });

const Like = mongoose.model<ILike>("Like", LikeSchema);

export default Like;
