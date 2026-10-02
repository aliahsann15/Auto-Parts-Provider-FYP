import mongoose, { Schema, Document } from 'mongoose';

export interface ICarModel extends Document {
  year: number;
  make: string;
  modelName: string;
  variants: string[];
}

const CarModelSchema = new Schema<ICarModel>({
  year: { type: Number, required: true },
  make: { type: String, required: true, index: true },
  modelName: { type: String, required: true },
  variants: [{ type: String }]
});

CarModelSchema.index({ make: 1, modelName: 1, year: 1 }, { unique: true });

export default mongoose.model<ICarModel>('CarModel', CarModelSchema);
