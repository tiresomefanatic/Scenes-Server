import mongoose, { Document, Schema } from "mongoose";
import { ILocation } from "./Location";
import { ICategory } from "./Category";
import { IComment } from "./Comment";

export interface IReel extends Document {
  location: ILocation | ILocation["_id"];
  category: ICategory | ICategory["_id"];
  videoUri: string;
  thumbUri: string;
  caption?: string;
  likes: mongoose.Types.ObjectId[];
  comments: IComment["_id"][];
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IReelWithCounts extends Omit<IReel, 'likes' | 'comments' | 'location' | 'category'> {
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  location: {
    _id: ILocation['_id'];
    name: string;
  };
  category: {
    _id: ICategory['_id'];
    name: string;
    popularityPercentage: number;
  },
  createdAt: Date;
  updatedAt: Date;
  viewCount: number;
}

const ReelSchema = new Schema<IReel>(
  {
    location: { type: Schema.Types.ObjectId, ref: "Location", required: true },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    videoUri: { type: String, required: true },
    thumbUri: { type: String, required: true },
    caption: { type: String, maxlength: 500 },
    likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    comments: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ReelSchema.index({ location: 1 });
ReelSchema.index({ category: 1 });
ReelSchema.index({ likes: 1 });
ReelSchema.index({ comments: 1 });

const Reel = mongoose.model<IReel>("Reel", ReelSchema);

export default Reel;