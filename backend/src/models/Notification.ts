import mongoose, { Document, Schema } from 'mongoose'

export type NotificationType = 'message' | 'order' | 'promo' | 'system' | 'request'

export interface INotification extends Document {
  user: mongoose.Types.ObjectId
  title: string
  description?: string
  type: NotificationType
  isRead: boolean
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

const NotificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    description: { type: String },
    type: {
      type: String,
      enum: ['message', 'order', 'promo', 'system', 'request'],
      default: 'system'
    },
    isRead: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
)

NotificationSchema.index({ user: 1, createdAt: -1 })

export default mongoose.model<INotification>('Notification', NotificationSchema)
