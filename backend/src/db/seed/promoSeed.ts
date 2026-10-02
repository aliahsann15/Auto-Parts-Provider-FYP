import mongoose from 'mongoose';
import PromoCode from '../../models/PromoCode';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/autopartsprovider';
const SELLER_ID = '693ad29abb66a5227842258a';

const promos = [
  {
    code: 'ALL10',
    seller: SELLER_ID,
    scope: 'all',
    type: 'percentage',
    value: 10,
  },
  {
    code: 'FLAT500',
    seller: SELLER_ID,
    scope: 'all',
    type: 'amount',
    value: 500,
  },
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    await PromoCode.deleteMany({ seller: SELLER_ID, code: { $in: promos.map(p => p.code) } });
    const inserted = await PromoCode.insertMany(promos);
    console.log(`Inserted ${inserted.length} promo codes for seller ${SELLER_ID}`);
  } catch (err) {
    console.error('Error seeding promo codes:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
}

seed();
