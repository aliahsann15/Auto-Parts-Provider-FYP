import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IOffer extends Document {
  request: Types.ObjectId
  seller: Types.ObjectId
  price: number
  message?: string
  warranty?: string
  returnDays?: number
  dimensions?: {
    width?: number
    length?: number
    height?: number
  }
  offerNumber: string
  createdAt: Date
}

const OfferSchema = new Schema<IOffer>(
  {
    request: { type: Schema.Types.ObjectId, ref: 'PartsRequest', required: true },
    seller: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    price: { type: Number, required: true },
    message: { type: String },
    warranty: { type: String },
    returnDays: { type: Number },
    offerNumber: { type: String, required: true, unique: true },
    dimensions: {
      width: { type: Number },
      length: { type: Number },
      height: { type: Number },
    },
  },
  { timestamps: true }
)

export default (mongoose.models.Offer as any) || mongoose.model<IOffer>('Offer', OfferSchema)
