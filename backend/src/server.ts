import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import authRoutes from './routes/auth'
import productRoutes from './routes/productRoutes'
import orderRoutes from './routes/orderRoutes'
import categoryRoutes from './routes/categoryRoutes'
import makeRoutes from './routes/makeRoutes'
import publicRoutes from './routes/publicRoutes'
import reviewRoutes from './routes/reviewRoutes'
import cartRoutes from './routes/cartRoutes'
import requestRoutes from './routes/requestRoutes' // ensure path is correct
import wishlistRoutes from './routes/wishlistRoutes'
import userRoutes from './routes/userRoutes'
import uploadRoutes from './routes/uploadRoutes'
import returnRoutes from './routes/returnRoutes'
import notificationRoutes from './routes/notificationRoutes'
import addressRoutes from './routes/addressRoutes'
import storeRoutes from './routes/storeRoutes'
import chatRoutes from './routes/chatRoutes'
import offerRoutes from './routes/offerRoutes'
import promoCodeRoutes from './routes/promoCodeRoutes'
import withdrawalRoutes from './routes/withdrawalRoutes'
import adminWithdrawalRoutes from './routes/adminWithdrawalRoutes'
import carDataRoutes from './routes/carDataRoutes'
import paymentRoutes from './routes/paymentRoutes'
import warrantyRoutes from './routes/warrantyRoutes'
import supportRoutes from './routes/supportRoutes'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { initSocket, getHttpServer } from './socket'
import { UPLOADS_FOLDER } from './utils/constants'
import Store from './models/Store'

dotenv.config()
const app = express()

const PORT = process.env.PORT || 4000
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/autopartsprovider'
const CORS_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:19006,exp://localhost:19000').split(',')

app.use(express.json())
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true)
      if (CORS_ORIGINS.includes(origin)) return callback(null, true)
      return callback(null, false)
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  })
)

// routes
// http://localhost:4001/uploads
// http://localhost:4001/api/auth

app.use('/uploads', express.static(UPLOADS_FOLDER))
const projectRoot = path.resolve(__dirname, '..', '..') // from backend/dist or backend/src to repo root
const imageCandidates = [
  path.join(projectRoot, 'web', 'public', 'images'),              // <repo>/web/public/images
  path.resolve(process.cwd(), 'web', 'public', 'images'),         // when running from repo root
  path.resolve(process.cwd(), '..', 'web', 'public', 'images'),   // when running from backend/
  path.resolve(process.cwd(), '..', '..', 'web', 'public', 'images') // deeper fallback
]
const PUBLIC_IMAGES =
  imageCandidates.find(dir => {
    try {
      fs.mkdirSync(dir, { recursive: true })
      return true
    } catch {
      return false
    }
  }) || path.join(__dirname, '..', '..', 'web', 'public', 'images')
app.use('/images', express.static(PUBLIC_IMAGES))
app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/public', publicRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/makes', makeRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/cart', cartRoutes)
app.use('/parts-requests', requestRoutes)
app.use('/api/parts-requests', requestRoutes) // new route for parts requests
app.use('/api/chats', chatRoutes)
app.use('/api/support', supportRoutes)
app.use('/api/wishlist', wishlistRoutes) // wishlist routes
app.use('/api/user', userRoutes) // user routes
app.use('/api/upload', uploadRoutes) // mount API upload routes (handles POST /api/upload/image)
app.use('/api/notifications', notificationRoutes) // notification routes
app.use('/api/returns', returnRoutes) // return routes
app.use('/api/warranty-claims', warrantyRoutes)
app.use('/api/store', storeRoutes)
app.use('/api/offers', offerRoutes)
app.use('/api/addresses', addressRoutes)
app.use('/api/promocodes', promoCodeRoutes)
app.use('/api/withdrawals', withdrawalRoutes)
app.use('/api/admin/withdrawals', adminWithdrawalRoutes)
app.use('/api/car-data', carDataRoutes)
app.use('/api/payments', paymentRoutes)
const stripe = require('stripe')(process.env.STRIPE_PUBLISHABLE_KEY);
app.post('/payment-sheet', async (req, res) => {
  // Use an existing Customer ID if this is a returning customer.
  const customer = await stripe.customers.create();
  const customerSession = await stripe.customerSessions.create({
    customer: customer.id,
    components: {
      mobile_payment_element: {
        enabled: true,
        features: {
          payment_method_save: 'enabled',
          payment_method_redisplay: 'enabled',
          payment_method_remove: 'enabled'
        }
      },
    },
  });
  const paymentIntent = await stripe.paymentIntents.create({
    amount: req.body.amount,
    currency: 'usd',
    customer: customer.id,
    // In the latest version of the API, specifying the `automatic_payment_methods` parameter
    // is optional because Stripe enables its functionality by default.
    automatic_payment_methods: {
      enabled: true,
    },
  });

  res.json({
    paymentIntent: paymentIntent.client_secret,
    customerSessionClientSecret: customerSession.client_secret,
    customer: customer.id,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
  });
});
// initialize socket server (wraps express app)
initSocket(app, CORS_ORIGINS)

mongoose
  .connect(MONGO_URI, {
    // options if needed
  } as any)
  .then(async () => {
    console.log('✅ MongoDB connected', {
      host: mongoose.connection.host,
      db: mongoose?.connection?.db?.databaseName,
      readyState: mongoose.connection.readyState
    })
    try {
      await Store.updateMany({ currentBalance: { $exists: false } }, { $set: { currentBalance: 0 } })
      console.log('✅ Store balances initialized')
    } catch (err) {
      console.warn('⚠️ Failed to initialize store balances', err)
    }
    const server = getHttpServer()
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`)
    })
  })
  .catch(err => {
    console.error('❌ DB connection error:', err)
  })
