import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from '../src/models/Order';
import Product from '../src/models/Product';
import User from '../src/models/User';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/autopartsprovider';

// Provided IDs
const PRODUCT_IDS = [
  '693ae2f04b9e9acc535dda90',
  '693aeb0a7bbde9327ed65ab4',
];
const BUYER_ID = '6939e3cd4df40cdcae06d037';

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const products = await Product.find({ _id: { $in: PRODUCT_IDS } });
  if (!products.length) {
    throw new Error(`No products found for ids: ${PRODUCT_IDS.join(',')}`);
  }

  let buyer = await User.findById(BUYER_ID);
  if (!buyer) {
    throw new Error(`Buyer ${BUYER_ID} not found. Please create it first or update BUYER_ID.`);
  }

  // helper to build staggered dates
  const now = new Date();
  const buildDate = (daysAgo: number, offsetHours = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(d.getHours() - offsetHours);
    return d;
  };

  const makeOrderPayload = (product: any, daysAgo: number, offsetHours = 0) => {
    const unitPrice = product.salePrice ?? product.price ?? 0;
    const quantity = 1;
    return {
      user: buyer._id,
      customer: {
        firstName: buyer.name?.split(' ')[0] || 'Buyer',
        lastName: buyer.name?.split(' ').slice(1).join(' ') || 'Seed',
        email: buyer.email || 'buyer@example.com',
        phoneNumber: buyer.phoneNumber || '03000000000',
      },
      items: [
        {
          product: product._id,
          seller: product.seller,
          quantity,
          price: product.price ?? unitPrice,
          ...(product.salePrice ? { salePrice: product.salePrice } : {}),
        },
      ],
      totalAmount: unitPrice * quantity,
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
      createdAt: buildDate(daysAgo, offsetHours),
      updatedAt: buildDate(daysAgo, offsetHours),
    };
  };

  const payloads: any[] = [];

  products.forEach((product, idx) => {
    const offsets = [0, 1, 2, 3, 5].map(n => n + idx);
    offsets.forEach((daysAgo, i) => {
      payloads.push(makeOrderPayload(product, daysAgo, i));
    });
  });

  const orders = await Order.insertMany(payloads);

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
