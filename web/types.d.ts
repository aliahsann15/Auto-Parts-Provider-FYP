import { DefaultSession, DefaultUser } from "next-auth";
import "next-auth/jwt"; // Important: Import the module you want to augment
export interface Category {
  _id: string,
  slug: string,
  name: string,
  description?: string
}
export interface Product {
  _id: string
  images: string[]           // featured image path
  name: string
  brand: string
  carModel: string
  make: string
  variant: string
  sku: string
  status: 'active' | 'draft'
  price: number
  salePrice: number
  stock: number
  categories: string[]      // multiple categories
  description: string
  technicalDescription: string

}

export interface OrderRequest {
  id: string           // Unique request ID
  customerName: string // Name of the customer who made the request
  partName: string     // Name of the auto part requested
  quantity: number     // Quantity requested
  date: string         // Date of the request (e.g., 'April 20, 2025')
  status: string       // Current status (e.g., 'Pending', 'In Progress', 'Completed')
}

export interface OrderList {
  id: string;
  date: string;
  status: 'Pending' | 'Shipped' | 'Delivered' | 'Cancelled';
  items: { productId: number; productName: string; quantity: number; price: number }[];
  customerFirstName: string;
  customerLastName: string;
  email: string;
  contact: string;
  shippingAddress: string;
  totalAmount: string;
}

// Type definition for each chat item
export interface ChatItem {
  id: number
  name: string
  avatar: string // URL or path to avatar image
  message: string
  time: string
  unreadCount?: number
  isOnline: boolean
}

// Augment the 'next-auth' module to add custom properties to Session and User
declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session extends DefaultSession {
    user: {
      id: string; // Your database user ID
      role?: string | null; // Your custom role
    } & DefaultSession["user"]; // Merge with default user properties (name, email, image)
    accessToken?: string; // For Google's access token
  }

  /**
   * The shape of the `user` object returned in the `jwt` callback,
   * or the `user` object received by the `session` callback.
   * Also the shape of the `user` object returned by the `authorize` callback.
   */
  interface User extends DefaultUser {
    id: string; // Your database user ID
    role?: string | null; // Your custom role
  }
}

// Augment the 'next-auth/jwt' module to add custom properties to the JWT
declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT { // This directly targets and augments the existing JWT interface
    // Add your custom properties to the JWT
    user?: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string | null;
    };
    accessToken?: string; // For Google's access token
    // Example: if you were to store your backend's token
    // backendToken?: string;
  }
}




interface SellerProduct {
  _id: string;
  name: string;
  description: string;
  price: number;
  salePrice?: number;
  category: string;
  brand: string;
  partNumber: string;
  stock: number;
  images: string[];
  specifications: Record<string, string>;
  seller: string; // On the frontend, we usually just need the ID string
  isActive: boolean;
  createdAt: string; // Use string for date representation
  updatedAt: string; // Use string for date representation
}

interface OrderItem {
  product: {
    _id: string;
    name: string;
    images?: string[];
    price: number;
    salePrice?: number;
  } | string;
  seller?: string;
  quantity: number;
  price: number;
  salePrice?: number;
  productId?: number;
  productName?: string;
}

interface Order {
  _id: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  items: OrderItem[];
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  } | any;
  paymentStatus: string;
  paymentMethod: string;
  trackingNumber?: string;
  user: {
    _id: string;
    userName?: string;
    name?: string;
    email: string;
  };
  customer?: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
  };
  contact?: string;
}

export interface ReviewItem {
  id: string
  reviewerName: string
  date: string
  productName: string
  rating: number
  comment: string
  productImage: string
}

interface User {
  _id: string
  email: string
  userName: string
  userImage?: string
}