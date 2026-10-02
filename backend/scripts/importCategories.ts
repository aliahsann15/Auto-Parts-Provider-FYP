import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse'
import mongoose from 'mongoose'
import Category from '../src/models/Category'

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/autopartsprovider'

const slugify = (value: string) =>
  (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

async function run() {
  await mongoose.connect(MONGO_URI)

  const file = path.join(__dirname, '../data/categories.csv')
  if (!fs.existsSync(file)) {
    throw new Error(`CSV not found at ${file}`)
  }

  const parser = fs.createReadStream(file).pipe(parse({ columns: true, trim: true, skip_empty_lines: true }))
  const bulk: any[] = []
  const seen = new Set<string>()

  for await (const row of parser) {
    const name = (row.name || '').trim()
    if (!name || name.toLowerCase() === 'all') continue // skip placeholder row

    const slug = slugify(row.onPress || name)
    if (!slug || seen.has(slug)) continue
    seen.add(slug)

    const description = (row.description || '').toString().trim()

    bulk.push({
      updateOne: {
        filter: { slug },
        update: {
          $set: { name, ...(description ? { description } : {}) },
          $setOnInsert: { slug },
        },
        upsert: true,
      },
    })
  }

  if (bulk.length) {
    const res = await Category.bulkWrite(bulk)
    console.log(`Upserted ${res.upsertedCount}, modified ${res.modifiedCount}`)
  } else {
    console.log('No category rows to import.')
  }

  await mongoose.disconnect()
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
