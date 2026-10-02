import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IStore extends Document {
  user: Types.ObjectId;
  storeName?: string;
  storeProfileImage?: string;
  storeCoverImage?: string;
  storeBio?: string;
  storeBanners?: string[];
  storeSalesBanners?: string[];
  featuredProductIds?: Types.ObjectId[];
  saleProductIds?: Types.ObjectId[];
  sectionsOrder?: string[];
  sectionsVisibility?: Record<string, boolean>;
  itemsSold?: number;
  reviewsCount?: number;
  averageRating?: number;
  addresses?: {
    street?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    country?: string;
    [key: string]: any;
  }[];
  managers?: Types.ObjectId[];
  currentBalance?: number;
}

const StoreSchema = new Schema<IStore>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    storeName: { type: String },
    storeProfileImage: { type: String },
    storeCoverImage: { type: String },
    storeBio: { type: String },
    storeBanners: [{ type: String }],
    storeSalesBanners: [{ type: String }],
    featuredProductIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    saleProductIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    sectionsOrder: {
      type: [String],
      default: ['banner', 'salesBanner', 'featured', 'sale', 'best', 'reviews'],
    },
  sectionsVisibility: {
    type: Schema.Types.Mixed,
    default: { banner: true, salesBanner: true, featured: true, sale: true, best: true, reviews: true },
  },
  itemsSold: { type: Number, default: 0 },
  reviewsCount: { type: Number, default: 0 },
  averageRating: { type: Number, default: 0 },
  currentBalance: { type: Number, default: 0 },
    addresses: {
      type: [
        {
          street: String,
          city: String,
          province: String,
          postalCode: String,
          country: String,
        },
      ],
      default: [],
    },
    managers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

export default mongoose.model<IStore>('Store', StoreSchema);
