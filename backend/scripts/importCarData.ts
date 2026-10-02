import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import mongoose from 'mongoose';
import CarModel from '../src/models/CarModel';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/autopartsprovider';

async function run() {
  await mongoose.connect(MONGO_URI);
  const file = path.join(__dirname, '../data/car-data.csv');
  const parser = fs.createReadStream(file).pipe(parse({ columns: true, trim: true }));
  const bulk: any[] = [];

  for await (const row of parser) {
    const bodyStyles = JSON.parse(row.body_styles || '[]');
    bulk.push({
      updateOne: {
        filter: { year: Number(row.year), make: row.make, modelName: row.model },
        update: { $set: { year: Number(row.year), make: row.make, modelName: row.model, bodyStyles } },
        upsert: true,
      },
    });
  }

  if (bulk.length) {
    await CarModel.bulkWrite(bulk);
  
  }
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
