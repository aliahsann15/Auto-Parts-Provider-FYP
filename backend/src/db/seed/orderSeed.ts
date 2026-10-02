// seedOrders.js
import mongoose from 'mongoose';
import Order from '../../models/Order';

// 1. Your MongoDB connection string
const MONGO_URI = 'mongodb://localhost:27017/autopartsprovider';

const orders = [
  {
    user: '6925e0e9b575b2973f19726f',
    customer: {firstName: 'Bilal',
  lastName: 'Zahid',
  email: 'bilalzhd0@gmail.com',
  phoneNumber: '+10000000000'},
    items: [
      { product: '6939e3cd4df40cdcae06d03d', quantity: 1, price: 36000 },
    ],
    totalAmount: 36000,
    status: 'delivered',
    shippingAddress: {
      street: '321 Gear Blvd.',
      city: 'Peshawar',
      state: 'Khyber Pakhtunkhwa',
      country: 'Pakistan',
      zipCode: '25000'
    },
    paymentStatus: 'completed',
    paymentMethod: 'Cash on Delivery',
    trackingNumber: 'TRK1122334455',
    createdAt: new Date('2025-04-22T16:45:00Z'),
    updatedAt: new Date('2025-05-02T08:20:00Z')
  }
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const inserted = await Order.insertMany(orders);
    console.log(`Inserted ${inserted.length} orders!`);

  } catch (err) {
    console.error('Error seeding orders:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
}

seed();
