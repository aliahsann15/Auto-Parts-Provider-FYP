import mongoose, { Schema, Document, Types } from 'mongoose';


export interface IReview extends Document {
  product: Types.ObjectId;    
  user?: Types.ObjectId;      
  rating: number;             
  comment?: string;           
  createdAt: Date;            
  replies?: {
    user?: Types.ObjectId;
    seller?: Types.ObjectId;
    comment: string;
    createdAt: Date;
  }[];
}


const reviewSchema: Schema<IReview> = new Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Product',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: false,
    },
    rating: {
      type: Number,                         
      min: 1,                               
      max: 5,                               
      required: true,                       
    },
    comment: {
      type: String,                         
      trim: true,                           
      default: '',                          
    },
    replies: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        comment: { type: String, trim: true },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    createdAt: {
      type: Date,                           
      default: Date.now,                    
    },
  },
  {
    
    timestamps: true,
  }
);


const Review = mongoose.model<IReview>('Review', reviewSchema);
export default Review;
