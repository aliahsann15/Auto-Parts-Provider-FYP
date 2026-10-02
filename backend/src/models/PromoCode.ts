import mongoose, { Schema, Document } from 'mongoose';

export type PromoScope = 'all' | 'product' | 'category';
export type PromoType = 'percentage' | 'amount';
export type PromoDurationType = 'days' | 'custom';

export interface IPromoCode extends Document {
  code: string;
  seller: mongoose.Types.ObjectId;
  scope: PromoScope;
  type: PromoType;
  value: number;
  products?: mongoose.Types.ObjectId[];
  categories?: string[];
  active: boolean;
  durationType?: PromoDurationType;
  durationDays?: number;
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PromoCodeSchema = new Schema<IPromoCode>(
  {
    code: { type: String, required: true, uppercase: true, trim: true },
    seller: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    scope: { type: String, enum: ['all', 'product', 'category'], default: 'all' },
    type: { type: String, enum: ['percentage', 'amount'], required: true },
    value: { type: Number, required: true, min: 0 },
    products: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    categories: [{ type: String }],
    durationType: { type: String, enum: ['days', 'custom'] },
    durationDays: { type: Number, min: 0 },
    startDate: { type: Date },
    endDate: { type: Date },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

PromoCodeSchema.index({ code: 1, seller: 1 }, { unique: true });

export default mongoose.model<IPromoCode>('PromoCode', PromoCodeSchema);
