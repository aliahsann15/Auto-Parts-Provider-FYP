import mongoose, { Document, Schema, Types } from 'mongoose'

export interface IAddress {
  country?: string
  province?: string
  city?: string
  postalCode?: string
  fullAddress?: string
  street?: string
  [key: string]: any
}

export interface ICards {
  provider?: string            // e.g. "stripe", "paypal", "checkout"
  providerCustomerId?: string  // customer id at payment provider
  providerCardId?: string      // card id/token at payment provider
  brand?: string               // VISA, Mastercard, etc.
  cardholderName?: string
  last4?: string               // last 4 digits only (never store full PAN)
  expMonth?: number
  expYear?: number
  token?: string               // tokenized card reference from provider
  default?: boolean
  metadata?: Record<string, any>
}

export interface IBankAccount {
  _id?: Types.ObjectId
  bankName: string
  bankCode?: string
  accountNumber: string
  branchCode?: string
  isIban?: boolean
  last4?: string
  isDefault?: boolean
  accountTitle?: string
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string
  phoneNumber?: string
  nickname?: string
  occupation?: string
  dateOfBirth?: Date
  address?: IAddress            // <-- typed address subdocument
  addresses?: IAddress[]
  password?: string
  name: string
  lastName?: string
  role: 'SuperAdmin' | 'SubAdmin' | 'Seller' | 'StoreManager' | 'Buyer'
  isEmailVerified: boolean
  emailVerificationCode?: string
  stripeCustomerId?: string
  // Store Manager specific field
  assignedSeller?: Types.ObjectId  // The seller this store manager works for
  // Seller specific fields
  cnic?: string
  businessName?: string
  businessType?: string
  licenseNumber?: string
  bankAccountNumber?: string
  accountTitle?: string
  branchCode?: string
  bankAccounts?: IBankAccount[]
  cnicImages?: string[]
  sellerMakes?: string[]
  sellerCategories?: string[]
  storeName?: string
  storeProfileImage?: string
  storeCoverImage?: string
  storeBio?: string
  storeBanners?: string[]
  storeSalesBanners?: string[]
  featuredProductIds?: Types.ObjectId[]
  saleProductIds?: Types.ObjectId[]
  sectionsOrder?: string[]
  sectionsVisibility?: Record<string, boolean>
  // Buyer specific fields
  cards?: ICards[]
  interests?: string[]
  googleId?: string
  profileImage?: string
  facebookId?: string
  appleSub?: string
  resetPasswordTokenHash?: string
  resetPasswordOtpHash?: string
  resetPasswordExpiresAt?: Date
  lastLoginAt?: Date
}

// Address sub-schema
const AddressSchema = new Schema<IAddress>({
  country: { type: String },
  province: { type: String },
  city: { type: String },
  postalCode: { type: String },
  fullAddress: { type: String },
  street: { type: String },
  isDefault: { type: Boolean, default: false }
}, { _id: false })

const BankAccountSchema = new Schema<IBankAccount>({
  bankName: { type: String, required: true },
  bankCode: { type: String },
  accountNumber: { type: String, required: true },
  branchCode: { type: String },
  isIban: { type: Boolean, default: false },
  last4: { type: String },
  isDefault: { type: Boolean, default: false },
  accountTitle: { type: String },
}, { _id: true, timestamps: true })

const UserSchema = new Schema<IUser>({
  name: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: false,
    trim: true,
  },
  nickname: {
    type: String,
    required: false,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phoneNumber: {
    type: String,
    required: false,
    trim: true,
  },
  password: {
    type: String,
    required: false,
  },
  occupation: {
    type: String,
    required: false,
    trim: true
  },
  dateOfBirth: {
    type: Date,
    required: false
  },
  role: {
    type: String,
    enum: ['SuperAdmin', 'SubAdmin', 'StoreManager', 'Seller', 'Buyer'],
    required: true,
    default: 'Buyer'
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationCode: {
    type: String
  },
  stripeCustomerId: { type: String },
  // Store Manager specific field
  assignedSeller: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: function (this: IUser) {
      return this.role === 'StoreManager';
    }
  },
  addresses: {
    type: [AddressSchema],
    default: []
  },
  // Seller specific fields
  cnic: {
    type: String,
    required: function (this: IUser) {
      return this.role === 'Seller';
    }
  },
  businessName: {
    type: String,
    required: function (this: IUser) {
      return this.role === 'Seller';
    }
  },
  businessType: {
    type: String,
    required: function (this: IUser) {
      return this.role === 'Seller';
    }
  },
  licenseNumber: {
    type: String,
    required: function (this: IUser) {
      return this.role === 'Seller';
    }
  },
  bankAccountNumber: {
    type: String,
    required: false
  },
  accountTitle: {
    type: String,
    required: false
  },
  branchCode: {
    type: String,
    required: false
  },
  bankAccounts: {
    type: [BankAccountSchema],
    default: []
  },
  cnicImages: [{
    type: String,
    required: function (this: IUser) {
      return this.role === 'Seller';
    }
  }],
  sellerMakes: {
    type: [String],
    default: [],
  },
  sellerCategories: {
    type: [String],
    default: [],
  },
  storeName: { type: String },
  storeProfileImage: { type: String },
  storeCoverImage: { type: String },
  storeBio: { type: String },
  storeBanners: [{ type: String }],
  storeSalesBanners: [{ type: String }],
  featuredProductIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  saleProductIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  sectionsOrder: [{ type: String }],
  sectionsVisibility: { type: Schema.Types.Mixed },
  // Buyer specific fields
  cards: [{
    provider: { type: String },
    providerCustomerId: { type: String },
    providerCardId: { type: String },
    brand: { type: String },
    cardholderName: { type: String },
    last4: { type: String },
    expMonth: { type: Number },
    expYear: { type: Number },
    token: { type: String }, // token from payment provider
    default: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed }
  }],
  interests: [{
    type: String
  }],
  googleId: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple documents to have a null googleId, but ensures uniqueness if a value is present
    required: false // Not required for all users
  },
  profileImage: {
    type: String,
    required: false
  },
  facebookId: {
    type: String,
    unique: true,
    sparse: true,
    required: false
  },
  appleSub: {
    type: String,
    unique: true,
    sparse: true,
    required: false
  },
  resetPasswordTokenHash: {
    type: String,
    required: false
  },
  resetPasswordOtpHash: {
    type: String,
    required: false
  },
  resetPasswordExpiresAt: {
    type: Date,
    required: false
  },
  lastLoginAt: {
    type: Date,
    required: false
  }
}, {
  timestamps: true
})

export default mongoose.model<IUser>('User', UserSchema)
