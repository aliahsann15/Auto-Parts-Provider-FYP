import mongoose, { Document, Schema } from 'mongoose'

export type WarrantyStatus =
  | 'REQUESTED'
  | 'REJECTED'
  | 'APPROVED'
  | 'BUYER_SHIPPED'
  | 'SELLER_RECEIVED'
  | 'SELLER_SHIPPED'
  | 'COMPLETED'

export type WarrantyDecision = 'REPLACE' | 'REPAIR'

export interface IWarrantyClaim extends Document {
  claimNumber: string
  buyerId: mongoose.Types.ObjectId
  sellerId: mongoose.Types.ObjectId
  orderId: mongoose.Types.ObjectId
  orderItemId?: mongoose.Types.ObjectId
  orderNumber?: string
  productId?: mongoose.Types.ObjectId
  productSku?: string
  productName?: string
  productImage?: string
  orderedQuantity: number
  claimQuantity: number
  notes?: string
  images: string[]
  sellerDecision?: WarrantyDecision
  rejection?: {
    reasonCode?: string
    reasonText?: string
    sellerMessage?: string
  }
  tracking?: {
    buyerToSellerTrackingId?: string
    sellerToBuyerTrackingId?: string
  }
  status: WarrantyStatus
  requestedAt: Date
  approvedAt?: Date
  rejectedAt?: Date
  buyerShippedAt?: Date
  sellerReceivedAt?: Date
  sellerShippedAt?: Date
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const WarrantyRejectionSchema = new Schema(
  {
    reasonCode: { type: String },
    reasonText: { type: String },
    sellerMessage: { type: String },
  },
  { _id: false }
)

const WarrantyTrackingSchema = new Schema(
  {
    buyerToSellerTrackingId: { type: String },
    sellerToBuyerTrackingId: { type: String },
  },
  { _id: false }
)

const WarrantyClaimSchema = new Schema<IWarrantyClaim>(
  {
    claimNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true
    },
    orderItemId: {
      type: Schema.Types.ObjectId,
      required: false
    },
    orderNumber: {
      type: String
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product'
    },
    productSku: {
      type: String
    },
    productName: {
      type: String
    },
    productImage: {
      type: String
    },
    orderedQuantity: {
      type: Number,
      required: true,
      min: 1
    },
    claimQuantity: {
      type: Number,
      required: true,
      min: 1
    },
    notes: {
      type: String
    },
    images: {
      type: [String],
      default: []
    },
    sellerDecision: {
      type: String,
      enum: ['REPLACE', 'REPAIR']
    },
    rejection: {
      type: WarrantyRejectionSchema
    },
    tracking: {
      type: WarrantyTrackingSchema,
      default: {}
    },
    status: {
      type: String,
      enum: ['REQUESTED', 'REJECTED', 'APPROVED', 'BUYER_SHIPPED', 'SELLER_RECEIVED', 'SELLER_SHIPPED', 'COMPLETED'],
      default: 'REQUESTED'
    },
    requestedAt: {
      type: Date,
      default: () => new Date()
    },
    approvedAt: {
      type: Date
    },
    rejectedAt: {
      type: Date
    },
    buyerShippedAt: {
      type: Date
    },
    sellerReceivedAt: {
      type: Date
    },
    sellerShippedAt: {
      type: Date
    },
    completedAt: {
      type: Date
    },
  },
  { timestamps: true }
)

WarrantyClaimSchema.pre<IWarrantyClaim>('validate', async function () {
  if (this.claimNumber) return
  const Model = this.constructor as mongoose.Model<IWarrantyClaim>
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = Math.floor(100000 + Math.random() * 900000).toString()
    const exists = await Model.exists({ claimNumber: candidate })
    if (!exists) {
      this.claimNumber = candidate
      return
    }
  }
  this.claimNumber = Math.floor(100000 + Math.random() * 900000)
    .toString()
    .padStart(6, '0')
})

WarrantyClaimSchema.index({ orderItemId: 1 })

const WarrantyClaimModel =
  mongoose.models.WarrantyClaim || mongoose.model<IWarrantyClaim>('WarrantyClaim', WarrantyClaimSchema)

export default WarrantyClaimModel
