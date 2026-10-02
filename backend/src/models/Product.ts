import mongoose, { Document, Schema } from 'mongoose'

export interface IProduct extends Document {
  name: string
  description: string
  price: number
  salePrice?: number
  categories: string[]
  brand: string
  sku: string
  make: string;
  carModel: string
  variant: string
  year?: string
  stock: number
  images: string[]
  specifications: Record<string, string>
  seller: mongoose.Types.ObjectId
  status: 'active' | 'draft' | 'deleted'
  createdAt: Date
  updatedAt: Date
  technicalDescription: string
  averageRating?: number
  totalReviews?: number
  isQuote?: boolean
  quoteBuyer?: mongoose.Types.ObjectId
  quoteRequest?: mongoose.Types.ObjectId
  quoteOffer?: mongoose.Types.ObjectId
  dimensions?: {
    width?: number
    length?: number
    height?: number
  }
  warrantyDurationValue?: number
  warrantyDurationUnit?: 'DAY' | 'MONTH' | 'YEAR'
  returnDays?: number
}

const ProductSchema = new Schema<IProduct>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  salePrice: {
    type: Number,
    min: 0
  },
  categories: [{
    type: String,
    required: true
  }],
  brand: {
    type: String,
    required: true
  },
  make: {
    type: String,
    required: true
  },
  carModel: {
    type: String,
    required: true
  },
  variant: {
    type: String,
    required: false
  },
  year: {
    type: String,
    required: false
  },
  sku: {
    type: String,
    required: true,
    unique: true
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  images: [{
    type: String,
    required: true
  }],
  technicalDescription: {
    type: String,
    required: false
  },
  seller: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'draft', 'deleted'],
    default: 'active',
    required: true
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0,
    min: 0
  },
  isQuote: { type: Boolean, default: false },
  quoteBuyer: { type: Schema.Types.ObjectId, ref: 'User' },
  quoteRequest: { type: Schema.Types.ObjectId, ref: 'PartsRequest' },
  quoteOffer: { type: Schema.Types.ObjectId, ref: 'Offer' },
  dimensions: {
    width: { type: Number, min: 0 },
    length: { type: Number, min: 0 },
    height: { type: Number, min: 0 },
  },
  warrantyDurationValue: { type: Number, min: 0 },
  warrantyDurationUnit: { type: String, enum: ['DAY', 'MONTH', 'YEAR'] },
  returnDays: { type: Number, min: 0, default: 0 },
}, {
  timestamps: true
})

// Index for better search performance
ProductSchema.index({ name: 'text', description: 'text', sku: 'text' })

export default mongoose.model<IProduct>('Product', ProductSchema)
