import mongoose, { Document, Schema } from 'mongoose';

export type SupportRole = 'Buyer' | 'Seller';
export type SupportSender = 'Buyer' | 'Seller' | 'SuperAdmin';

export interface ISupportMessage extends Document {
  userId: mongoose.Types.ObjectId;
  role: SupportRole;
  senderRole: SupportSender;
  text: string;
  seenByAdmin: boolean;
  createdAt: Date;
}

const SupportMessageSchema = new Schema<ISupportMessage>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['Buyer', 'Seller'], required: true, index: true },
    senderRole: { type: String, enum: ['Buyer', 'Seller', 'SuperAdmin'], required: true },
    text: { type: String, required: true },
    seenByAdmin: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const SupportMessageModel =
  mongoose.models.SupportMessage ||
  mongoose.model<ISupportMessage>('SupportMessage', SupportMessageSchema);

export default SupportMessageModel;
