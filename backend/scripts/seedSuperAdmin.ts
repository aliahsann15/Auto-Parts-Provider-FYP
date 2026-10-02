import path from 'path'
import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'
import User from '../src/models/User'

dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/autopartsprovider'
const SUPER_ADMIN_EMAIL = 'info@autopartsproviders.com'
const SUPER_ADMIN_PASSWORD = '12345678'
const SUPER_ADMIN_NAME = 'Super Admin'

async function main() {
  await mongoose.connect(MONGO_URI)
  console.log('Connected to MongoDB')

  const normalizedEmail = SUPER_ADMIN_EMAIL.toLowerCase()
  const hashedPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10)

  const superAdminData = {
    name: SUPER_ADMIN_NAME,
    email: normalizedEmail,
    role: 'SuperAdmin' as const,
    password: hashedPassword,
    isEmailVerified: true,
  }

  const existing = await User.findOne({ email: normalizedEmail })
  if (existing) {
    await User.updateOne({ _id: existing._id }, { $set: superAdminData })
    console.log(`Updated existing SuperAdmin (${normalizedEmail})`)
  } else {
    await new User(superAdminData).save()
    console.log(`Created SuperAdmin (${normalizedEmail})`)
  }
}

main()
  .then(async () => {
    await mongoose.disconnect()
  })
  .catch(async (error) => {
    console.error('Failed to seed SuperAdmin', error)
    await mongoose.disconnect()
    process.exit(1)
  })
