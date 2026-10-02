import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IChatMessage extends Document {
  requestId: mongoose.Types.ObjectId;
  seller?: mongoose.Types.ObjectId; // seller thread owner (required for multi-seller threads)
  sender: mongoose.Types.ObjectId;
  text?: string;
  imageUrl?: string;
  readBy?: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    requestId: { type: Schema.Types.ObjectId, ref: 'PartsRequest', required: true, index: true },
    seller: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String },
    imageUrl: { type: String },
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

ChatMessageSchema.index({ requestId: 1, createdAt: 1 });

const ChatMessage: Model<IChatMessage> =
  (mongoose.models.ChatMessage as any) || mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);

export default ChatMessage;
