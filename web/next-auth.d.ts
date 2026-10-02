// file: next-auth.d.ts

import { DefaultSession, DefaultUser } from "next-auth";
import "next-auth/jwt"; // Important: Import the module you want to augment

// Augment the 'next-auth' module to add custom properties to Session and User
declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session extends DefaultSession {
    user: {
      id: string; // Your database user ID
      role?: string | null; // Your custom role
      sellerId?: string | null; // For Store Managers - their assigned seller ID
    } & DefaultSession["user"]; // Merge with default user properties (name, email, image)
    accessToken?: string; // For Google's access token
    backendToken?: string; // Your custom backend token
  }

  /**
   * The shape of the `user` object returned in the `jwt` callback,
   * or the `user` object received by the `session` callback.
   * Also the shape of the `user` object returned by the `authorize` callback.
   */
  interface User extends DefaultUser {
    id: string; // Your database user ID
    role?: string | null; // Your custom role
    sellerId?: string | null; // For Store Managers
    backendToken?: string; // Your custom backend token
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
      sellerId?: string | null; // For Store Managers
    };
    accessToken?: string; // For Google's access token
    backendToken?: string; // Your custom backend token
  }
}