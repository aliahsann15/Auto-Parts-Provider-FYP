import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../../models/Product';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/autopartsprovider';

// Default seller for the sample products
const DEFAULT_SELLER_ID = '681e42ad9cdefe7fcd0ae948';

type ProductSeed = {
  name: string;
  description: string;
  price: number;
  salePrice?: number;
  categories: string[];
  brand: string;
  sku: string;
  make: string;
  carModel: string;
  variant?: string;
  stock: number;
  images: string[];
  technicalDescription?: string;
  status: 'active' | 'draft';
  averageRating?: number;
  totalReviews?: number;
};

// Use existing images from web/public/images (served at /images/*)
const products: ProductSeed[] = [
  {
    name: 'Honda Ceramic Brake Pads',
    description: 'Low-dust ceramic brake pad set optimized for quiet stopping and long rotor life.',
    price: 3200,
    salePrice: 2850,
    categories: ['Brakes'],
    brand: 'Brembo',
    sku: 'SKU-AP-001',
    make: 'honda',
    carModel: 'Civic',
    variant: '2021-2024',
    stock: 120,
    images: ['/images/requests/front-brake-kit-audi-rs6.jpg'],
    technicalDescription: 'Chamfered edges, shims included, rotor-friendly compound.',
    status: 'active',
    averageRating: 4.6,
    totalReviews: 143,
  },
  {
    name: 'Toyota Performance Air Filter',
    description: 'High-flow reusable panel filter for improved throttle response.',
    price: 1950,
    salePrice: 1750,
    categories: ['Filters', 'Engine'],
    brand: 'K&N',
    sku: 'SKU-AP-002',
    make: 'toyota',
    carModel: 'Corolla',
    variant: '2018-2023',
    stock: 90,
    images: ['/images/air-filter.jpg'],
    technicalDescription: 'Oiled cotton media, washable up to 50,000 km intervals.',
    status: 'active',
    averageRating: 4.7,
    totalReviews: 205,
  },
  {
    name: 'BMW High-Flow Fuel Pump',
    description: 'Direct-fit high-pressure pump to stabilize fuel delivery under load.',
    price: 8200,
    salePrice: 7800,
    categories: ['Pumps', 'Engine'],
    brand: 'Bosch',
    sku: 'SKU-AP-003',
    make: 'bmw',
    carModel: '3 Series',
    variant: 'F30 2016-2019',
    stock: 45,
    images: ['/images/air-pump.jpg'],
    technicalDescription: 'Flow matched for turbo engines, includes new seals and hardware.',
    status: 'active',
    averageRating: 4.5,
    totalReviews: 88,
  },
  {
    name: 'Mercedes Paint Correction Polisher',
    description: 'Dual-action polisher kit for swirl removal and gloss enhancement.',
    price: 12500,
    salePrice: 11000,
    categories: ['Detailing', 'Accessories'],
    brand: 'Meguiars',
    sku: 'SKU-AP-004',
    make: 'mercedes',
    carModel: 'C-Class',
    variant: 'W205',
    stock: 30,
    images: ['/images/car-polisher.webp'],
    technicalDescription: '8mm throw DA polisher, variable speed with foam pad starter set.',
    status: 'active',
    averageRating: 4.4,
    totalReviews: 56,
  },
  {
    name: 'Tesla All-Weather Floor Mat Set',
    description: 'Laser-measured TPE mats to protect against mud and spills.',
    price: 9800,
    salePrice: 9200,
    categories: ['Interior', 'Accessories'],
    brand: 'WeatherTech',
    sku: 'SKU-AP-005',
    make: 'tesla',
    carModel: 'Model 3',
    variant: '2020-2024',
    stock: 75,
    images: ['/images/mat-cover.webp'],
    technicalDescription: 'Raised edges, anti-slip backing, easy hose-down cleaning.',
    status: 'active',
    averageRating: 4.8,
    totalReviews: 310,
  },
  {
    name: 'Volvo OEM Cabin Filter',
    description: 'Activated carbon cabin filter to keep dust and odors out.',
    price: 3400,
    categories: ['Filters', 'HVAC'],
    brand: 'Volvo',
    sku: 'SKU-AP-006',
    make: 'volvo',
    carModel: 'XC60',
    variant: '2019-2024',
    stock: 110,
    images: ['/images/placeholder-product.png'],
    technicalDescription: 'Multi-layer media, OE fit with perimeter gasket.',
    status: 'active',
    averageRating: 4.2,
    totalReviews: 67,
  },
  {
    name: 'Toyota LED Headlight Conversion Kit',
    description: 'CANbus-ready LED bulbs with focused beam pattern.',
    price: 13500,
    salePrice: 11900,
    categories: ['Lighting'],
    brand: 'Philips',
    sku: 'SKU-AP-007',
    make: 'toyota',
    carModel: 'Camry',
    variant: '2017-2023',
    stock: 60,
    images: ['/images/home6-2.jpg'],
    technicalDescription: '6500K color temp, aluminum heat sink, plug-and-play harness.',
    status: 'active',
    averageRating: 4.6,
    totalReviews: 190,
  },
  {
    name: 'Honda Trunk Liner Cargo Mat',
    description: 'Custom-fit cargo liner with raised lips to contain spills.',
    price: 4800,
    salePrice: 4500,
    categories: ['Interior', 'Accessories'],
    brand: 'Honda',
    sku: 'SKU-AP-008',
    make: 'honda',
    carModel: 'CR-V',
    variant: '2019-2024',
    stock: 85,
    images: ['/images/home6-1.jpg'],
    technicalDescription: 'Odorless rubberized material, textured surface to prevent sliding.',
    status: 'active',
    averageRating: 4.3,
    totalReviews: 75,
  },
  {
    name: 'BMW Carbon Mirror Caps',
    description: 'Gloss carbon fiber mirror caps to sharpen exterior styling.',
    price: 15800,
    categories: ['Exterior', 'Accessories'],
    brand: 'M Performance',
    sku: 'SKU-AP-009',
    make: 'bmw',
    carModel: 'M3',
    variant: 'G80',
    stock: 25,
    images: ['/images/home4.png'],
    technicalDescription: 'Pre-preg carbon, UV clear coat, direct clip-on replacement.',
    status: 'active',
    averageRating: 4.7,
    totalReviews: 62,
  },
  {
    name: 'Mercedes Iridium Spark Plug Set (6pcs)',
    description: 'Long-life iridium plugs for smooth idle and efficiency.',
    price: 7400,
    salePrice: 6990,
    categories: ['Ignition'],
    brand: 'NGK',
    sku: 'SKU-AP-010',
    make: 'mercedes',
    carModel: 'GLA',
    variant: '2021-2024',
    stock: 140,
    images: ['/images/interest1.jpg'],
    technicalDescription: 'Pre-gapped, nickel ground electrode, OE heat range.',
    status: 'active',
    averageRating: 4.5,
    totalReviews: 210,
  },
  {
    name: 'Tesla Front Brake Rotor Pair',
    description: 'Vented rotors engineered for heavy EV braking loads.',
    price: 28500,
    salePrice: 26900,
    categories: ['Brakes'],
    brand: 'Brembo',
    sku: 'SKU-AP-011',
    make: 'tesla',
    carModel: 'Model Y',
    variant: '2020-2024',
    stock: 40,
    images: ['/images/addtocart1.webp'],
    technicalDescription: 'Balanced rotors with anti-corrosion coating and OE vane design.',
    status: 'active',
    averageRating: 4.6,
    totalReviews: 124,
  },
  {
    name: 'Volvo Complete Strut Assembly',
    description: 'Pre-assembled front strut for quick ride-height restoration.',
    price: 21400,
    salePrice: 19900,
    categories: ['Suspension'],
    brand: 'Bilstein',
    sku: 'SKU-AP-012',
    make: 'volvo',
    carModel: 'S60',
    variant: '2016-2021',
    stock: 35,
    images: ['/images/addtocart2.jpg'],
    technicalDescription: 'Gas-charged strut with spring, mount, and bearing pre-installed.',
    status: 'active',
    averageRating: 4.4,
    totalReviews: 91,
  },
  {
    name: 'Bugatti Performance Intake Kit',
    description: 'High-flow intake system for maximum airflow and induction sound.',
    price: 52000,
    salePrice: 50000,
    categories: ['Engine'],
    brand: 'Bugatti',
    sku: 'SKU-AP-013',
    make: 'bugatti',
    carModel: 'Chiron',
    variant: 'All',
    stock: 5,
    images: ['/images/auto-car.png'],
    technicalDescription: 'Carbon intake tube, oversized filter, CNC machined fittings.',
    status: 'active',
    averageRating: 4.9,
    totalReviews: 18,
  },
  {
    name: 'Toyota Battery Maintenance Bundle',
    description: 'Battery terminal cleaner and maintainer kit to extend battery life.',
    price: 6200,
    salePrice: 5900,
    categories: ['Electrical'],
    brand: 'Optima',
    sku: 'SKU-AP-014',
    make: 'toyota',
    carModel: 'Hilux',
    variant: '2015-2022',
    stock: 70,
    images: ['/images/placeholder-product-2.png'],
    technicalDescription: 'Anti-corrosion pads, terminal spray, smart trickle charger.',
    status: 'active',
    averageRating: 4.2,
    totalReviews: 58,
  },
  {
    name: 'Honda Aero Wiper Blade Set',
    description: 'Beam-style wipers with even pressure for streak-free performance.',
    price: 2100,
    salePrice: 1900,
    categories: ['Wipers'],
    brand: 'Bosch',
    sku: 'SKU-AP-015',
    make: 'honda',
    carModel: 'City',
    variant: '2017-2023',
    stock: 160,
    images: ['/images/red-car.png'],
    technicalDescription: 'Quick-fit adapters, graphite-coated rubber, aerodynamic spoiler.',
    status: 'active',
    averageRating: 4.1,
    totalReviews: 132,
  },
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const sellerId = new mongoose.Types.ObjectId(DEFAULT_SELLER_ID);
    const skus = products.map(p => p.sku);

    // Remove existing products with the same SKUs to keep the seed idempotent
    await Product.deleteMany({ sku: { $in: skus } });

    const inserted = await Product.insertMany(
      products.map(p => ({
        ...p,
        seller: sellerId,
      }))
    );

    console.log(`Inserted ${inserted.length} products!`);
  } catch (err) {
    console.error('Error seeding products:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
}

seed();
