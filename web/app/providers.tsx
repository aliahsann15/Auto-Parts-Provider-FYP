"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import { WishlistProvider } from "./context/wishlist-context";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <WishlistProvider>{children}</WishlistProvider>
    </SessionProvider>
  );
}