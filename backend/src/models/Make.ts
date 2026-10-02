import mongoose, { Document, Schema } from 'mongoose'

export interface IMake extends Document {
  name: string
  description?: string
  image?: string
  slug: string
  createdAt: Date
  updatedAt: Date
}

const MakeSchema = new Schema<IMake>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String },
    image: { type: String },
    slug: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true }
)

export default mongoose.model<IMake>('Make', MakeSchema)