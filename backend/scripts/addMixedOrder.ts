import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import Order from '../src/models/Order';
import Product from '../src/models/Product';
import User from '../src/models/User';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/autopartsprovider';
const PRODUCT_IDS = (process.env.PRODUCT_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
const SELLER_IDS = (process.env.SELLER_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
const buyerEmail = 'seed-buyer@example.com';
const buyerPassword = 'Password123!';

async function ensureBuyer() {
  let buyer = await User.findOne({ email: buyerEmail });
  if (!buyer) {
    const hash = await bcrypt.hash(buyerPassword, 10);
    buyer = await User.create({
      name: 'Seed Buyer',
      email: buyerEmail,
      password: hash,
      role: 'Buyer',
      isEmailVerified: true,
      phoneNumber: '03001234567',
    });
   
  }
  return buyer;
}

async function run() {
  if (PRODUCT_IDS.length === 0) throw new Error('Provide PRODUCT_IDS env (comma-separated)');
  await mongoose.connect(MONGO_URI);
  console.log('Connected to Mongo:', MONGO_URI);

  const buyer = await ensureBuyer();

  const items: any[] = [];
  for (let i = 0; i < PRODUCT_IDS.length; i++) {
    const pid = PRODUCT_IDS[i];
    const product = await Product.findById(pid);
    if (!product) throw new Error(`Product ${pid} not found`);
    const seller = SELLER_IDS[i] || product.seller;
    items.push({
      product: product._id,
      seller,
      quantity: 1,
      price: product.price,
      salePrice: product.salePrice,
    });
  }

  const totalAmount = items.reduce((sum, it) => {
    const unit = typeof it.salePrice === 'number' ? it.salePrice : it.price;
    return sum + unit * (it.quantity || 1);
  }, 0);

  const order = await Order.create({
    user: buyer._id,
    customer: {
      firstName: 'Seed',
      lastName: 'Buyer',
      email: buyer.email,
      phoneNumber: buyer.phoneNumber || '03001234567',
    },
    items,
    totalAmount,
    status: 'processing',
    paymentStatus: 'pending',
    paymentMethod: 'Cash on Delivery',
    shippingAddress: {
      street: '123 Seed Street',
      city: 'Lahore',
      state: 'Punjab',
      country: 'Pakistan',
      zipCode: '54000',
    },
    trackingNumber: `SEED-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
  });

  
  await mongoose.disconnect();
  console.log('Done.');
}

run().catch(err => {
  console.error(err);
  mongoose.disconnect();
  process.exit(1);
});
