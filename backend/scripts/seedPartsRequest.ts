import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PartsRequest from '../src/models/Parts-Request';
import User from '../src/models/User';
import { createNotification } from '../src/utils/notificationService';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/autopartsprovider';
const BUYER_ID = '6939e3cd4df40cdcae06d037';

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const buyer = await User.findById(BUYER_ID);
  if (!buyer) {
    throw new Error(`Buyer ${BUYER_ID} not found`);
  }

  const requests = [
    {
      companyName: 'Toyota',
      carName: 'Corolla',
      partName: 'Front Bumper',
      variant: 'Altis',
      year: '2019',
      description: 'Need genuine bumper, color black preferred.',
      quantity: 1,
      userId: buyer._id,
      status: 'Pending',
    },
    {
      companyName: 'Honda',
      carName: 'Civic',
      partName: 'LED Headlights',
      variant: 'Oriel',
      year: '2020',
      description: 'Pair of LEDs with DRL.',
      quantity: 1,
      userId: buyer._id,
      status: 'Pending',
    },
    {
      companyName: 'Hyundai',
      carName: 'Tucson',
      partName: 'Brake Pads',
      variant: 'AWD',
      year: '2021',
      description: 'Front pads only.',
      quantity: 2,
      userId: buyer._id,
      status: 'Pending',
    },
  ];

  const inserted = await PartsRequest.insertMany(requests);
  console.log('Inserted requests:', inserted.map((r: any) => r._id?.toString?.()));

  // Notify requester and broadcast to sellers so request-type notifications show actions
  const sellers = await User.find({ role: 'Seller' }).select('_id').lean();
  const notifs: any[] = [];
  inserted.forEach((req: any) => {
    notifs.push(
      createNotification(
        buyer._id,
        'Your Request has been posted',
        'Go to your dashboard to check request and offers',
        'order',
        { requestId: req._id }
      )
    );
    sellers.forEach((s) => {
      const desc = [req.companyName, req.carName, req.variant, req.year].filter(Boolean).join(' ');
      const notificationDesc = `A buyer requested a request for ${desc || 'a part'}. Send a quote or chat.`;
      notifs.push(
        createNotification(
          s._id,
          'New Parts Request',
          notificationDesc,
          'request',
          { requestId: req._id }
        )
      );
    });
  });
  await Promise.all(notifs);


  await mongoose.disconnect();
  console.log('Done.');
}

run().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
