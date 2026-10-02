// seedMakes.ts
import mongoose from 'mongoose';
import Make from '../../models/Make';

// MongoDB connection string
const MONGO_URI = 'mongodb://localhost:27017/autopartsprovider';

const makes = [
  {
    name: 'Honda',
    description: 'Honda Motor Company - Japanese automotive manufacturer known for reliability and innovation',
    image: '/assets/icons/honda.png',
    slug: 'honda'
  },
  {
    name: 'Toyota',
    description: 'Toyota Motor Corporation - Leading Japanese automaker known for durability and efficiency',
    image: '/assets/icons/toyota.png',
    slug: 'toyota'
  },
  {
    name: 'Tesla',
    description: 'Tesla Inc - American electric vehicle manufacturer pioneering sustainable transportation',
    image: '/assets/icons/tesla.png',
    slug: 'tesla'
  },
  {
    name: 'BMW',
    description: 'Bayerische Motoren Werke - German luxury automotive manufacturer known for performance',
    image: '/assets/icons/bmw.png',
    slug: 'bmw'
  },
  {
    name: 'Mercedes',
    description: 'Mercedes-Benz - Premium German automaker renowned for luxury and engineering excellence',
    image: '/assets/icons/mercedes.png',
    slug: 'mercedes'
  },
  {
    name: 'Volvo',
    description: 'Volvo Cars - Swedish automaker focused on safety, quality, and environmental responsibility',
    image: '/assets/icons/volvo.png',
    slug: 'volvo'
  },
  {
    name: 'Bugatti',
    description: 'Bugatti - Luxury hypercar manufacturer known for extreme performance and exclusivity',
    image: '/assets/icons/bugatti.png',
    slug: 'bugatti'
  }
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const inserted = await Make.insertMany(makes);
    console.log(`Inserted ${inserted.length} car makes!`);

  } catch (err) {
    console.error('Error seeding makes:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
}

seed();
