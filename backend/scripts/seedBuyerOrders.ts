import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from '../src/models/Order';
import Product from '../src/models/Product';
import User from '../src/models/User';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/autopartsprovider';

// Target buyer to seed orders for
const BUYER_ID = '693eb29f71c930b54aaec651';

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const buyer = await User.findById(BUYER_ID);
  if (!buyer) {
    throw new Error(`Buyer ${BUYER_ID} not found. Update BUYER_ID before seeding.`);
  }

  // Grab a few products to attach to orders
  const products = await Product.find().sort({ createdAt: -1 }).limit(3).lean();
  if (!products.length) {
    throw new Error('No products found to seed orders with. Please create products first.');
  }

  const now = new Date();
  const buildDate = (daysAgo: number, offsetHours = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(d.getHours() - offsetHours);
    return d;
  };

  const payloads: any[] = [];

  products.forEach((product, idx) => {
    const basePrice = product.salePrice ?? product.price ?? 0;
    const qty = Math.max(1, (idx % 2) + 1);
    const total = basePrice * qty;
    const shippingFee = 400;
    const inspectionFee = idx % 2 === 0 ? 0 : 250;
    const promoDiscount = idx === 0 ? 0 : 150;
    const grandTotal = total + shippingFee + inspectionFee - promoDiscount;

    const customerNameParts = (buyer.name || 'Buyer Seed').split(' ');
    const firstName = customerNameParts[0] || 'Buyer';
    const lastName = customerNameParts.slice(1).join(' ') || 'Seed';

    payloads.push({
      user: buyer._id,
      customer: {
        firstName,
        lastName,
        email: buyer.email || 'buyer@example.com',
        phoneNumber: buyer.phoneNumber || '03000000000',
      },
      items: [
        {
          product: product._id,
          seller: product.seller,
          quantity: qty,
          price: product.price ?? basePrice,
          ...(product.salePrice ? { salePrice: product.salePrice } : {}),
        },
      ],
      totalAmount: total,
      grandTotal,
      shippingFee,
      inspectionFee,
      promoDiscount,
      status: 'processing',
      paymentStatus: 'completed',
      paymentMethod: 'Online',
      shippingAddress: {
        street: '123 Seed Street',
        city: 'Lahore',
        state: 'Punjab',
        country: 'Pakistan',
        zipCode: '54000',
      },
      trackingNumber: `SEED-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      createdAt: buildDate(idx + 1, idx),
      updatedAt: buildDate(idx + 1, idx),
    });
  });

  if (!payloads.length) {
    console.log('No payloads created, exiting.');
    return;
  }

  const result = await Order.insertMany(payloads);
  console.log(`Inserted ${result.length} orders for buyer ${BUYER_ID}.`);
}

main()
  .catch(err => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
