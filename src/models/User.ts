import mongoose, { Document, Schema } from "mongoose";
import jwt from "jsonwebtoken";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  username: string;
  name?: string;
  userImage?: string;
  bio?: string;
  followers: mongoose.Types.ObjectId[];
  following: mongoose.Types.ObjectId[];
  interests: string[]; // Add this line
  createAccessToken: () => string;
  createRefreshToken: () => string;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      match: [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        "Please provide a valid email",
      ],
      unique: true,
    },
    username: {
      type: String,
      required: true,
      match: [/^[a-zA-Z0-9_]{3,30}$/, "Please provide a valid username"],
      unique: true,
    },
    name: {
      type: String,
      maxlength: 50,
      minlength: 3,
    },
    userImage: {
      type: String,
    },
    bio: {
      type: String,
    },
    followers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: Schema.Types.ObjectId, ref: "User" }],
    interests: [{ type: String }], // Add this line
  },
  { timestamps: true }
);

UserSchema.methods.createAccessToken = function (this: IUser): string {
  return jwt.sign(
    { userId: this._id, name: this.name },
    process.env.ACCESS_TOKEN_SECRET as string,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );
};

UserSchema.methods.createRefreshToken = function (this: IUser): string {
  return jwt.sign(
    { userId: this._id },
    process.env.REFRESH_TOKEN_SECRET as string,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

UserSchema.index({ followers: 1 });
UserSchema.index({ following: 1 });
UserSchema.index({ interests: 1 }); // Add this line to improve query performance on interests

const User = mongoose.model<IUser>("User", UserSchema);

export default User;
