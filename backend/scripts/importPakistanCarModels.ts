import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { parse } from 'csv-parse/sync';
import CarModel from '../src/models/CarModel';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/autopartsprovider';
const DATA_FILE = path.join(__dirname, '../data/pakistan_car_models_variants_years_RESEARCHED.csv');

type CsvRow = {
  year?: string;
  make?: string;
  modelName?: string;
  variant?: string;
};

async function run() {
  await mongoose.connect(MONGO_URI);

  const csv = fs.readFileSync(DATA_FILE, 'utf8');
  const rows = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CsvRow[];

  const grouped = new Map<string, { year: number; make: string; modelName: string; variants: Set<string> }>();

  rows.forEach(r => {
    const year = Number(r.year);
    const make = (r.make || '').trim();
    const modelName = (r.modelName || '').trim();
    const variant = (r.variant || '').trim();
    if (!year || !make || !modelName) return;
    const key = `${make.toLowerCase()}||${modelName.toLowerCase()}||${year}`;
    const entry =
      grouped.get(key) ||
      {
        year,
        make,
        modelName,
        variants: new Set<string>(),
      };
    if (variant) entry.variants.add(variant);
    grouped.set(key, entry);
  });

  const bulkOps = Array.from(grouped.values()).map(doc => ({
    updateOne: {
      filter: { year: doc.year, make: doc.make, modelName: doc.modelName },
      update: {
        $set: {
          year: doc.year,
          make: doc.make,
          modelName: doc.modelName,
          variants: Array.from(doc.variants).sort(),
        },
      },
      upsert: true,
    },
  }));

  if (bulkOps.length) {
    const res = await CarModel.bulkWrite(bulkOps);
  } else {
    console.log('No rows to import');
  }

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Import failed', err);
  process.exit(1);
});
