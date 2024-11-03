import mongoose, { Document, Schema } from "mongoose";
import { ICategory } from "./Category";

// Interface for the geometry location
interface IGeometryLocation {
  lat: number;
  lng: number;
}

// Interface for the viewport
interface IViewport {
  northeast: IGeometryLocation;
  southwest: IGeometryLocation;
}

// Interface for the geometry
interface IGeometry {
  location: IGeometryLocation;
  viewport: IViewport;
}

// Main Location interface
export interface ILocation extends Document {
  name: string;
  formattedAddress: string;
  placeId: string;
  geometry: IGeometry;
  category: ICategory | Schema.Types.ObjectId;
  instagramId: string;
  instagramUsername: string;
  instagramBio: string;
  createdAt: Date;
  updatedAt: Date;
}

const LocationSchema = new Schema<ILocation>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    formattedAddress: {
      type: String,
      required: true,
    },
    placeId: {
      type: String,
      required: true,
    },
    geometry: {
      location: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
      },
      viewport: {
        northeast: {
          lat: { type: Number, required: true },
          lng: { type: Number, required: true },
        },
        southwest: {
          lat: { type: Number, required: true },
          lng: { type: Number, required: true },
        },
      },
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    instagramId: {
      type: String,
      required: true,
    },
    instagramUsername: {
      type: String,
      required: true,
    },
    instagramBio: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
LocationSchema.index({ name: 1 });
LocationSchema.index({ placeId: 1 });
LocationSchema.index({ instagramUsername: 1 });
LocationSchema.index({ "geometry.location": "2dsphere" }); // For geospatial queries

const Location = mongoose.model<ILocation>("Location", LocationSchema);

export default Location;
