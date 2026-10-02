import mongoose, { Document, Schema } from 'mongoose'

export type PushProvider = 'expo' | 'fcm'
export type PushPlatform = 'ios' | 'android' | 'web' | 'unknown'

export interface IPushToken extends Document {
  user: mongoose.Types.ObjectId
  token: string
  provider: PushProvider
  platform?: PushPlatform
  deviceId?: string
  lastUsedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const PushTokenSchema = new Schema<IPushToken>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    token: { type: String, required: true, unique: true },
    provider: { type: String, enum: ['expo', 'fcm'], required: true },
    platform: { type: String, enum: ['ios', 'android', 'web', 'unknown'], default: 'unknown' },
    deviceId: { type: String },
    lastUsedAt: { type: Date }
  },
  { timestamps: true }
)

PushTokenSchema.index({ user: 1, provider: 1 })

export default mongoose.model<IPushToken>('PushToken', PushTokenSchema)
