import mongoose, { Document, Schema } from 'mongoose'

export interface ICartItem {
  product: mongoose.Types.ObjectId
  quantity: number
  tempProductData?: any // For temporary products from accepted offers
}

export interface ICart extends Document {
  user: mongoose.Types.ObjectId
  items: ICartItem[]
  createdAt: Date
  updatedAt: Date
}

const CartSchema = new Schema<ICart>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },
    tempProductData: {
      type: Schema.Types.Mixed,
      required: false
    }
  }]
}, {
  timestamps: true
})

// Index for better query performance
CartSchema.index({ user: 1 })

export default mongoose.model<ICart>('Cart', CartSchema) 