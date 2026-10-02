// src/screens/SellerDashboardData.ts
// Demo data for SellerDashboard.tsx

import { images } from "@/constants";


export const avatar = 'https://via.placeholder.com/40'  // replace with actual uri

export const searchPlaceholder = 'Search products...'
export const welcomeMessage = 'Welcome, Ahmed Auto Parts'

export const stats = {
  totalOrders: 45,
  pendingOrders: 8,
  earnings: 'PKR 125,000',
  products: 12,
}
// ---- Reusable product type for edit screen ----
export interface NewProduct {
  id: string;
  image: string;
  gallery: string[];
  name: string;
  company: string;
  model: string;
  maker: string;
  sku: number;
  status: 'Active' | 'Draft';
  originalPrice: number;
  salePrice: number;
  stock: number;
  category: string[];
  description: string;
  technicalDescription: string;
}
// ---- Demo data for EditProductScreen ----
export const demoEditProducts: NewProduct[] = [
  {
    id: '1',
    image: images.honda1,
    gallery: [images.honda1],          // preloaded gallery image(s)
    name: 'Honda Brake Pad Set',
    company: 'Honda',
    model: 'Civic 2020',
    maker: 'Honda Motor Co.',
    sku: 12345,
    status: 'Active',
    originalPrice: 3200,
    salePrice: 2800,
    stock: 150,
    category: ['Brakes'],               // must match a category name
    description: 'High-performance semi-metallic brake pads.',
    technicalDescription: 'Semi-metallic friction material engineered for durability and stopping power.',
  },
  {
    id: '2',
    image: images.bmw3,
    gallery: [images.bmw3],
    name: 'BMW Oil Filter',
    company: 'BMW',
    model: 'X5 2018',
    maker: 'BMW Group',
    sku: 67890,
    status: 'Draft',
    originalPrice: 1350,
    salePrice: 1200,
    stock: 80,
    category: ['Filters', 'Ignition'],
    description: 'OEM replacement spin-on oil filter.',
    technicalDescription: 'High-efficiency filtration media for engine protection.',
  },
];

// Only the part-types actually used in popularParts
export const categoriesByParts = [
  {
    id: "0",
    name: "All",
    onPress: null
  },
  { id: "1", name: "Brakes", onPress: "categoryBrakes" },
  { id: "2", name: "Filters", onPress: "categoryFilters" },
  { id: "3", name: "Ignition", onPress: "categoryIgnition" },
  { id: "4", name: "Suspension", onPress: "categorySuspension" },
  { id: "5", name: "Radiators", onPress: "categoryRadiators" },
  { id: "6", name: "Pumps", onPress: "categoryPumps" },
  { id: "7", name: "Engine", onPress: "categoryEngine" },
  { id: "8", name: "Lighting", onPress: "categoryLighting" },
];

export interface ListedProductType {
  id: string;
  name: string;
  rawName: string;
  image: any;
  price: string;
  salePrice: string; // 🆕 Added
  numReviews: number;
  rating: number;
  stock: number;
  sold: number;
  itemsSold?: number;
  navigate: string;
  categoryId: string;
}



export const Listedproducts = [
  {
    id: "1",
    name: "Honda Brake Pad Set",
    image: images.honda1,
    price: "3200",
    salePrice: "2800",
    numReviews: 143,
    rating: 4.5,
    stock: 1200,
    sold: 9321,
    navigate: "hondadetails",
    categoryId: "1",
  },
  {
    id: "2",
    name: "BMW Oil Filter",
    image: images.bmw3,
    price: "1350",
    salePrice: "1100",
    numReviews: 205,
    rating: 4.8,
    stock: 600,
    sold: 1689,
    navigate: "bmwdetails",
    categoryId: "2",
  },
  {
    id: "3",
    name: "Mercedes Cabin Air Filter",
    image: images.mercedes4,
    price: "1950",
    salePrice: "1750",
    numReviews: 72,
    rating: 4.0,
    stock: 500,
    sold: 423,
    navigate: "mercedesdetails",
    categoryId: "2",
  },
  {
    id: "4",
    name: "Tesla Spark Plug Set",
    image: images.tesla5,
    price: "4200",
    salePrice: "3800",
    numReviews: 120,
    rating: 4.3,
    stock: 400,
    sold: 987,
    navigate: "tesladetails",
    categoryId: "3",
  },
  {
    id: "5",
    name: "Toyota Shock Absorber",
    image: images.toyota4,
    price: "2800",
    salePrice: "2400",
    numReviews: 72,
    rating: 4.0,
    stock: 700,
    sold: 423,
    navigate: "toyotadetails",
    categoryId: "4",
  },
  {
    id: "6",
    name: "Volvo Radiator",
    image: images.volvo3,
    price: "7500",
    salePrice: "6900",
    numReviews: 205,
    rating: 4.8,
    stock: 300,
    sold: 1689,
    navigate: "volvodetails",
    categoryId: "5",
  },
  {
    id: "7",
    name: "Bugatti Water Pump",
    image: images.bugatti1,
    price: "12000",
    salePrice: "10500",
    numReviews: 143,
    rating: 4.5,
    stock: 200,
    sold: 932,
    navigate: "bugattidetails",
    categoryId: "6",
  },
  {
    id: "8",
    name: "Honda Timing Belt Kit",
    image: images.honda2,
    price: "5500",
    salePrice: "4950",
    numReviews: 98,
    rating: 4.2,
    stock: 500,
    sold: 562,
    navigate: "hondadetails",
    categoryId: "7",
  },
  {
    id: "9",
    name: "BMW Headlight Bulb",
    image: images.bmw5,
    price: "1150",
    salePrice: "950",
    numReviews: 120,
    rating: 4.3,
    stock: 450,
    sold: 987,
    navigate: "bmwdetails",
    categoryId: "8",
  },
  {
    id: "10",
    name: "Mercedes Fuel Pump",
    image: images.mercedes5,
    price: "9200",
    salePrice: "8100",
    numReviews: 120,
    rating: 4.3,
    stock: 300,
    sold: 987,
    navigate: "mercedesdetails",
    categoryId: "6",
  },
];











// types/order.ts

export type OrderStatus = 'Completed' | 'Pending'; // extend as needed

export interface OrderItem {
  productId: number;
  productName: string;
  quantity: number;
  price: number;
}

export interface RecentOrder {
  id: string;
  date: string;
  status: OrderStatus;
  items: OrderItem[];
  customerFirstName: string;
  customerLastName: string;
  email: string;
  contact: string;
  country: string;
  city: string;
  postalcode: string;
  shippingAddress: string;
  totalAmount: string;
}




export const recentOrders = [
  {
    id: '#AP1234',
    date: '2025-04-20',
    status: 'Completed' as const,
    items: [
      { productId: 1, productName: 'Brake Pad', quantity: 2, price: 3500 },
      { productId: 2, productName: 'Clip', quantity: 4, price: 200 },
    ],
    customerFirstName: 'Ahmed',
    customerLastName: 'Afzal',
    email: 'alice@example.com',
    contact: '+923001234567',
    country: 'Pakistan',
    city: 'Faisalabad',
    postalcode: '38000',
    shippingAddress: 'House no 21, J Block, Eden Executive, 208 Chak Road, Kashmir Pull, Canal Road, Faisalabad',
    totalAmount: 'PKR 7,400',
  },
  {
    id: '#AL1235',
    date: '2025-04-22',
    status: 'Pending' as const,
    items: [
      { productId: 3, productName: 'Brake Pad', quantity: 2, price: 3500 },
      { productId: 4, productName: 'Clip', quantity: 4, price: 200 },
    ],
    customerFirstName: 'Ali',
    customerLastName: 'Ahsan',
    email: 'alice@example.com',
    contact: '+923001234567',
    country: 'Pakistan',
    city: 'Faisalabad',
    postalcode: '38000',
    shippingAddress: 'House no 21, J Block, Eden Executive, 208 Chak Road, Kashmir Pull, Canal Road, Faisalabad',
    totalAmount: 'PKR 400',
  },
]

export interface ChatItem {
  id: number
  name: string
  avatar: string
  message: string
  time: string
  unreadCount?: number
  isOnline: boolean
}
export const chatData: ChatItem[] = [
  {
    id: 1,
    name: 'Helen Brooks',
    avatar: 'https://via.placeholder.com/40',
    message: 'Hi, seats cover are available…',
    time: '15:56',
    unreadCount: 1,
    isOnline: true,
  },
  {
    id: 2,
    name: 'Kathryn Murphy',
    avatar: 'https://via.placeholder.com/40',
    message: 'Hi, seats cover are available…',
    time: 'Wed',
    unreadCount: 2,
    isOnline: true,
  },
  // …repeat as needed
]
export interface RequestImage {
  uri?: string;     // For external URL images
  source?: any;     // For local images (require statements)
}

export interface Request {
  id: string;
  customerName: string;
  partName: string;
  companyName: string;
  carModel: string;
  carVariant: string;
  year: string;
  quantity: number;
  description?: string;
  date: string;
  status: string;
  images: RequestImage[];
}

export const OrderRequest: Request[] = [
  {
    id: 'REQ-1001',
    customerName: 'Ahmed Afzal',
    partName: 'Front Brake Pads',
    companyName: 'BMW',
    carModel: 'X5',
    carVariant: 'M Sport',
    year: '2022',
    quantity: 2,
    description: 'Urgently required.',
    date: '2025-04-22',
    status: 'Pending',
    images: [
      { source: images.bmw1 },                   // Local image
      { uri: 'https://example.com/external.jpg' } // External image URL
    ],
  },
  {
    id: 'REQ-1002',
    customerName: 'Ali Ahsan',
    partName: 'Air Filter',
    companyName: 'Audi',
    carModel: 'A6',
    carVariant: 'Premium',
    year: '2021',
    quantity: 1,
    description: 'Original quality preferred.',
    date: '2025-04-21',
    status: 'In Progress',
    images: [
      { source: images.bmw1 },                  // Local image
    ],
  },
  // Additional demo data...
];





export const SalesData = [
  { date: '2025-04-20', sales: 1200 },
  { date: '2025-04-21', sales: 2100 },
  // …more
]

// 4. Messages
export const messagesData = [
  { id: "1", fullName: "Ahmed Afzal", userImg: images.user1, lastMessage: "Do you have OEM brake pads for Toyota Corolla?", messageInQueue: 1, lastMessageTime: "09:20 AM", isOnline: true, createdAt: "2025-04-22T09:20:00+05:00" },
  { id: "2", fullName: "Ali Ahsan", userImg: images.user2, lastMessage: "Need a compatible oil filter for Ford F-150", messageInQueue: 0, lastMessageTime: "02:35 PM", isOnline: false, createdAt: "2025-04-20T14:35:00+05:00" },
  { id: "3", fullName: "Muhammad Shehrooz", userImg: images.user3, lastMessage: "My spark plugs arrived late—will you re-ship?", messageInQueue: 2, lastMessageTime: "11:15 AM", isOnline: true, createdAt: "2025-04-21T11:15:00+05:00" },
  { id: "4", fullName: "Ibrahim Siddiqui", userImg: images.user4, lastMessage: "Dimensions on the air filter?", messageInQueue: 0, lastMessageTime: "04:50 PM", isOnline: true, createdAt: "2025-04-19T16:50:00+05:00" },
  { id: "5", fullName: "Bilal Zahid", userImg: images.user5, lastMessage: "Is the battery under 12-month warranty?", messageInQueue: 0, lastMessageTime: "01:10 PM", isOnline: false, createdAt: "2025-04-18T13:10:00+05:00" },
];

// Seller Edit Profile
export const demoSeller = {
  storeName: 'Ahmed Auto Store',
  ownerName: 'Ahmed Afzal',
  phone: '+92 303 9245137',
  email: 'info@ahmedautopart.com',
  businessName: 'Ahmed Auto Part Pvt Ltd',
  businessType: 'Automotive',
  licenseNumber: 'LIC-934823',
  cnic: '35202-1234567-1',
  businessCity: 'Faisalabad',
  businessAddress: 'Eden Executive, Faisalabad',
  storeImage: images.logo,
};

// data/sellerDashboardData.ts

export interface SalesData {
  date: string;
  sales: number;
}


export const salesData: SalesData[] = [
  // Last 7 days
  { date: '2025-05-11', sales: 1200 },
  { date: '2025-05-12', sales: 2100 },
  { date: '2025-05-13', sales: 800 },
  { date: '2025-05-14', sales: 1600 },
  { date: '2025-05-15', sales: 2300 },
  { date: '2025-05-16', sales: 1800 },
  { date: '2025-05-17', sales: 2500 },

  // Remaining days of May (30-day range)
  { date: '2025-05-01', sales: 1000 },
  { date: '2025-05-03', sales: 950 },
  { date: '2025-04-27', sales: 1430 },
  { date: '2025-04-20', sales: 1100 },
  { date: '2025-04-15', sales: 1700 },
  { date: '2025-04-10', sales: 1200 },
  { date: '2025-04-03', sales: 1050 },

  // Older months (12-month range)
  { date: '2025-03-15', sales: 900 },
  { date: '2025-02-10', sales: 1400 },
  { date: '2025-01-25', sales: 800 },
  { date: '2024-12-18', sales: 1900 },
  { date: '2024-11-07', sales: 1700 },
  { date: '2024-10-14', sales: 1500 },
  { date: '2024-09-12', sales: 2100 },
  { date: '2024-08-08', sales: 2200 },
  { date: '2024-07-03', sales: 1800 },
  { date: '2024-06-01', sales: 1300 },
  { date: '2024-05-15', sales: 1600 },
];



// 🔖 TypeScript type for best selling product
export interface ListedProduct {
  id: number;
  name: string;
  popularity: number; // Popularity percentage (0-100)
  sales: number;      // Sales percentage (0-100)
  color: string;      // Bar/badge color
}

// 📊 Demo data for Best Selling Products
export const bestSellingProducts: ListedProduct[] = [
  {
    id: 1,
    name: 'Honda City Rims',
    popularity: 45,
    sales: 45,
    color: '#3B82F6', // Blue
  },
  {
    id: 2,
    name: 'Collera Lights',
    popularity: 29,
    sales: 29,
    color: '#10B981', // Green
  },
  {
    id: 3,
    name: 'Seats with Cover',
    popularity: 18,
    sales: 18,
    color: '#8B5CF6', // Purple
  },
  {
    id: 4,
    name: 'Tyre with wheel',
    popularity: 25,
    sales: 25,
    color: '#F59E0B', // Orange
  },
];

export interface ReviewItem {
  id: string;
  reviewerName: string;
  customerImage: any;
  date: string;
  productName: string;
  productImage: any;
  rating: number;
  comment: string;
  reply: string;
}

export const sellerreviews: ReviewItem[] = [
  {
    id: 'r1',
    reviewerName: 'Ahmed Afzal',
    customerImage: images.user1,
    date: 'April 25, 2025',
    productName: 'Brake Pads',
    productImage: images.bmw1,
    rating: 3,
    comment: 'Good quality but slow delivery.',
    reply: 'Thank you so much for your kind review.'
  },
  {
    id: 'r2',
    reviewerName: 'Ali Ahsan',
    customerImage: images.user2,
    date: 'April 24, 2025',
    productName: 'Air Filter',
    productImage: images.bmw2,
    rating: 4,
    comment: 'Fast delivery and well-packaged.',
    reply: 'We are sorry for the inconvenience'
  },
  {
    id: 'r3',
    reviewerName: 'M Shehrooz',
    customerImage: images.user3,
    date: 'April 23, 2025',
    productName: 'Engine Oil',
    productImage: images.bmw1,
    rating: 5,
    comment: 'Perfect product. Highly recommended!',
    reply: 'Thank you for the appreciation!'
  },
];



export interface StoreSection {
  key: string;
  component: string;
  visible: boolean;
}

export interface StoreProfile {
  storeName: string;
  followers: string;
  itemsSold: number;
  reviews: number;
  rating: number;
  description: string;
  coverImage: any;       
  logoImage: any;
  storeImage: any;
  salesImage: any;
  sections: StoreSection[];
}


export const storeProfileData = {
  storeName: 'Ahmed Auto Parts',
  followers: '1.8K followers',
  itemsSold: 500,
  reviews: 100,
  rating: 5,
  description: 'We sell auto parts and accessories at the best prices.',
  coverImage: images.cover,
  logoImage: images.logo,
  storeImage: images.salesbanner,
  salesImage: images.salesbanner,
  sections: [
    { key: 'banner', component: 'Banner Section', visible: true },
    { key: 'featured', component: 'Featured Products Section', visible: true },
    { key: 'best', component: 'Best Selling Products Section', visible: true },
    { key: 'salesbanner', component: 'Sales Banner Section', visible: true },
    { key: 'sale', component: 'Sale Products Section', visible: true },
   
    { key: 'reviews', component: 'Store Reviews Section', visible: true }
  ]
};

