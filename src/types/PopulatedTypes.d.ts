import { Document } from "mongoose";
import { ILike } from "../models/Like";
import { IReel } from "../models/Reel";
import { IUser } from "../models/User";

export interface PopulatedReel extends Omit<IReel, "user"> {
  user: Omit<IUser, "password">;
}

export interface PopulatedLike extends Omit<Document<unknown, {}, ILike> & ILike & Required<{ _id: unknown }>, "reel"> {
  reel: PopulatedReel;
}