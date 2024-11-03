import mongoose, { Document, Schema } from "mongoose";
import { IUser } from "./User"; // Assuming you have a User model
import { IReel } from "./Reel"; // Assuming you have a Reel model

interface IUserHistory extends Document {
  user: IUser["_id"];
  reels: Array<{
    reel: mongoose.Types.ObjectId;
    watchedAt: Date;
  }>;
}

const UserHistorySchema = new Schema<IUserHistory>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  reels: [
    {
      reel: {
        type: Schema.Types.ObjectId,
        ref: "Reel",
        required: true,
      },
      watchedAt: { type: Date, default: Date.now },
    },
  ],
});

UserHistorySchema.index({ user: 1 });

const UserHistory = mongoose.model<IUserHistory>("UserHistory", UserHistorySchema);

export default UserHistory;
export { IUserHistory };
