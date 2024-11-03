import mongoose, { Document, Schema } from "mongoose";

export interface ICategory extends Document {
  name: string;
  popularityPercentage: number;
  type: string;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, unique: true },
    popularityPercentage: { type: Number, required: true, min: 0, max: 100 },
    type: { type: String, required: true },

  },
  { timestamps: true }
);

CategorySchema.index({ name: 1 });
CategorySchema.index({ popularityPercentage: -1 });

const Category = mongoose.model<ICategory>("Category", CategorySchema);

export default Category;