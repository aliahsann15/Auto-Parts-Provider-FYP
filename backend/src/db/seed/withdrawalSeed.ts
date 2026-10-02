import mongoose from 'mongoose';
import Withdrawal from '../../models/Withdrawal';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/autopartsprovider';
const SELLER_ID = '693ad29abb66a5227842258a';

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const existing = await Withdrawal.findOne({ seller: SELLER_ID });
    if (!existing) {
      await Withdrawal.create({
        seller: SELLER_ID,
        amount: 12000,
        currency: 'PKR',
        status: 'completed',
        note: 'Placeholder seeded withdrawal',
        processedAt: new Date(),
      });
      console.log('Inserted placeholder withdrawal for seller', SELLER_ID);
    } else {
      console.log('Withdrawal already exists for seller', SELLER_ID);
    }
  } catch (err) {
    console.error('Error seeding withdrawal:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
}

seed();
