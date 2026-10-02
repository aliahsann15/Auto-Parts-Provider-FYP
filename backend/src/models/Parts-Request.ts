import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IPartsRequest extends Document {
  userId?: mongoose.Types.ObjectId | string
  sellerIds?: mongoose.Types.ObjectId[]
  assignedSeller?: mongoose.Types.ObjectId
  acceptedOffer?: mongoose.Types.ObjectId
  requestNumber?: string
  companyName?: string
  carName?: string
  category?: string
  variant?: string
  partName?: string
  year?: string
  description?: string
  quantity?: number
  images?: {
    filename: string
    contentType: string
    path: string
    size?: number
  }[]
  status?: 'Pending' | 'Offer Sent' | 'In Progress' | 'Completed' | 'Rejected'
  acceptedAt?: Date
  createdAt?: Date
  updatedAt?: Date
}

const ImageSchema = new Schema(
  {
    filename: { type: String },
    contentType: { type: String },
    path: { type: String },
    size: { type: Number }
  },
  { _id: false }
)

const PartsRequestSchema = new Schema<IPartsRequest>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // <-- track requester
    requestNumber: { type: String, unique: true, required: true },
    companyName: { type: String, required: true },
    carName: { type: String, required: true },
    category: { type: String },
    variant: { type: String },
    partName: { type: String, required: true },
    year: { type: String },
    description: { type: String },
    quantity: { type: Number, default: 1 },
    images: { type: [ImageSchema], default: [] },
    sellerIds: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
    assignedSeller: { type: Schema.Types.ObjectId, ref: 'User' },
    acceptedOffer: { type: Schema.Types.ObjectId, ref: 'Offer' },
    acceptedAt: { type: Date },
    status: { type: String, enum: ['Pending', 'Offer Sent', 'In Progress', 'Completed', 'Rejected'], default: 'Pending' }
  },
  {
    timestamps: true,
    collection: 'parts-requests'
  }
)

const PartsRequest: Model<IPartsRequest> =
  (mongoose.models.PartsRequest as any) ||
  mongoose.model<IPartsRequest>('PartsRequest', PartsRequestSchema)

export default PartsRequest
