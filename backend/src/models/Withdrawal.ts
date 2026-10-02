import mongoose, { Schema, Types, Document } from 'mongoose';

export interface IWithdrawal extends Document {
  seller: Types.ObjectId;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'rejected';
  note?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  reference: string;
}

const WithdrawalSchema = new Schema<IWithdrawal>(
  {
    seller: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'PKR' },
    status: { type: String, enum: ['pending', 'completed', 'rejected'], default: 'pending' },
    note: { type: String },
    processedAt: { type: Date },
    reference: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export default mongoose.model<IWithdrawal>('Withdrawal', WithdrawalSchema);
