import mongoose, { Document, Schema } from 'mongoose'

export interface IOrderItem {
  product: mongoose.Types.ObjectId | null
  seller?: mongoose.Types.ObjectId
  quantity: number
  price: number
  salePrice?: number
  productSnapshot?: any // For temporary products from accepted offers
  returnDays?: number
  _id?: mongoose.Types.ObjectId
}
export interface ICustomerDetails {
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
}

export interface IOrder extends Document {
  user: mongoose.Types.ObjectId
  customer: ICustomerDetails[]
  items: IOrderItem[]
  totalAmount: number
  orderNumber?: string
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  shippingAddress: {
    street: string
    city: string
    state: string
    country: string
    zipCode: string
  }
  paymentStatus: 'pending' | 'completed' | 'failed'
  paymentMethod: string
  shippingFee?: number
  inspectionFee?: number
  promoDiscount?: number
  grandTotal?: number
  trackingNumber?: string
  shippingMethod?: string
  arrivalText?: string
  sellerShipping?: Record<string, number>
  cancellationReason?: string
  cancelledAt?: Date
  deliveredAt?: Date
  autoPartsInspection?: boolean
  createdAt: Date
  updatedAt: Date
}

const OrderSchema = new Schema<IOrder>({
  // seller: {
  //   type: Schema.Types.ObjectId,
  //   ref: 'User',
  //   required: true
  // },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customer: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phoneNumber: { type: String, required: true }
  },
  items: [{
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: false // Allow null for temporary products
    },
    seller: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
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
    productSnapshot: {
      type: Schema.Types.Mixed,
      required: false // Store complete product data for temp products
    },
    returnDays: {
      type: Number,
      min: 0
    }
  }],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  deliveredAt: {
    type: Date
  },
  shippingAddress: {
    street: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true
    },
    zipCode: {
      type: String,
      required: true
    }
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    required: true
  },
  shippingFee: { type: Number, default: 0 },
  inspectionFee: { type: Number, default: 0 },
  promoDiscount: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  shippingMethod: { type: String },
  arrivalText: { type: String },
  sellerShipping: { type: Schema.Types.Mixed },
  cancellationReason: { type: String },
  cancelledAt: { type: Date },
  trackingNumber: {
    type: String
  }
  ,
  autoPartsInspection: { type: Boolean, default: false },
  orderNumber: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
  },
}, {
  timestamps: true
})

// Indexes for better query performance
OrderSchema.index({ user: 1 })
OrderSchema.index({ 'items.seller': 1 }) // Index for seller order queries
OrderSchema.index({ status: 1 })
OrderSchema.index({ createdAt: -1 })

export default mongoose.model<IOrder>('Order', OrderSchema) 
