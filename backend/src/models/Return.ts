import mongoose, { Document, Schema } from 'mongoose'

const { ObjectId } = Schema.Types

export interface IReturnItem {
  orderItemId?: mongoose.Types.ObjectId
  product?: mongoose.Types.ObjectId
  productSnapshot?: Record<string, any>
  quantity: number
  unitPrice: number
  subtotal: number
  reason?: string
  images?: string[]
  returnDays?: number
  isTemporaryProduct?: boolean
  [key: string]: any
}

export interface IReturn extends Document {
  returnNumber: string
  order: mongoose.Types.ObjectId
  buyer: mongoose.Types.ObjectId
  seller: mongoose.Types.ObjectId
  items: IReturnItem[]
  status:
    | 'requested'
    | 'approved'
    | 'rejected'
    | 'pickup_scheduled'
    | 'shipped'
    | 'shipped_back'
    | 'received'
    | 'refunded'
    | 'cancelled'
  reason?: string
  note?: string
  sellerNote?: string
  sellerRejectionReason?: string
  sellerRejectionMessage?: string
  refundAccountName?: string
  refundBankName?: string
  refundAccountNumber?: string
  refundAccountLast4?: string
  images?: string[]
  returnMethod?: string
  trackingId?: string
  refundAmount: number
  refundCurrency: string
  returnWindowDays?: number
  returnDeadline?: Date
  requestedAt: Date
  approvedAt?: Date
  rejectedAt?: Date
  receivedAt?: Date
  refundedAt?: Date
  cancelledAt?: Date
  createdAt: Date
  updatedAt: Date
  [key: string]: any
}

const ReturnItemSchema = new Schema<IReturnItem>(
  {
    orderItemId: {
      type: ObjectId,
      ref: 'Order'
    },
    product: {
      type: ObjectId,
      ref: 'Product'
    },
    productSnapshot: {
      type: Schema.Types.Mixed
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    reason: {
      type: String
    },
    images: {
      type: [String],
      default: []
    },
    returnDays: {
      type: Number,
      min: 0
    },
    isTemporaryProduct: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
)

const ReturnSchema = new Schema<IReturn>(
  {
    returnNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    order: {
      type: ObjectId,
      ref: 'Order',
      required: true
    },
    buyer: {
      type: ObjectId,
      ref: 'User',
      required: true
    },
    seller: {
      type: ObjectId,
      ref: 'User',
      required: true
    },
    items: {
      type: [ReturnItemSchema],
      default: []
    },
    status: {
      type: String,
      enum: [
        'requested',
        'approved',
        'rejected',
        'pickup_scheduled',
        'shipped',
        'shipped_back',
        'received',
        'refunded',
        'cancelled'
      ],
      default: 'requested'
    },
    reason: {
      type: String
    },
    note: {
      type: String
    },
    sellerNote: {
      type: String
    },
    sellerRejectionReason: {
      type: String
    },
    sellerRejectionMessage: {
      type: String
    },
    images: {
      type: [String],
      default: []
    },
    returnMethod: {
      type: String
    },
    trackingId: {
      type: String
    },
    refundAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    refundCurrency: {
      type: String,
      required: true,
      default: 'PKR'
    },
    refundAccountName: {
      type: String
    },
    refundBankName: {
      type: String
    },
    refundAccountNumber: {
      type: String
    },
    refundAccountLast4: {
      type: String
    },
    returnWindowDays: {
      type: Number,
      min: 0
    },
    returnDeadline: {
      type: Date
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
    receivedAt: {
      type: Date
    },
    refundedAt: {
      type: Date
    },
    cancelledAt: {
      type: Date
    }
  },
  { timestamps: true }
)

ReturnSchema.pre<IReturn>('validate', function (next) {
  if (!this.returnNumber) {
    const now = Date.now().toString()
    const suffix = Math.floor(Math.random() * 9000 + 1000).toString()
    this.returnNumber = `RTN-${now.slice(-6)}-${suffix}`
  }

  if (Array.isArray(this.items)) {
    this.items = this.items.map(item => {
      const quantity = Number(item.quantity ?? 1)
      const price = Number(item.unitPrice ?? 0)
      const images = Array.isArray(item.images) ? item.images.filter(Boolean) : []
      if (typeof item.subtotal !== 'number') {
        item.subtotal = quantity * price
      }
      return {
        ...item,
        quantity,
        unitPrice: price,
        subtotal: Number(item.subtotal ?? quantity * price),
        images
      }
    })
  }

  next()
})

ReturnSchema.index({ order: 1 })
ReturnSchema.index({ buyer: 1 })
ReturnSchema.index({ seller: 1 })

const ReturnModel = mongoose.models.Return || mongoose.model<IReturn>('Return', ReturnSchema)
export default ReturnModel
