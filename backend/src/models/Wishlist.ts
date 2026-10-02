import mongoose, { Document, Model, Schema } from 'mongoose'

export interface IWishlist extends Document {
  userId: mongoose.Types.ObjectId
  items: mongoose.Types.ObjectId[]
  createdAt?: Date
  updatedAt?: Date
}

const WishlistSchema = new Schema<IWishlist>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
      unique: true // one wishlist per user
    },
    items: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Product'
      }
    ]
  },
  {
    timestamps: true
  }
)

const Wishlist: Model<IWishlist> = (mongoose.models.Wishlist as Model<IWishlist>) || mongoose.model<IWishlist>('Wishlist', WishlistSchema)

export default Wishlist