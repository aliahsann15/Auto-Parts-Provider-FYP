'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { useSession } from 'next-auth/react';

export interface CartItem {
  product: any;
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  loading: boolean;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  refreshCart: () => void;
  addToCart: (productId: string, quantity: number) => void;
  updateCartItem: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false); // ⬅️ NEW STATE
  const { data: session } = useSession();
  const BACKEND_API_URL = (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:4001').replace(/\/$/, '') + '/';

  const token = session?.backendToken || session?.accessToken;

  const fetchCart = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BACKEND_API_URL}api/cart`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setCart(res.data.items || []);
    } catch (err) {
      console.error('Failed to fetch cart:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchCart();
  }, [token]);

  const addToCart = async (productId: string, quantity: number) => {
    console.log("token in addToCart:", token);
    await axios.post(
      `${BACKEND_API_URL}api/cart/add`,
      { productId, quantity },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    fetchCart();
    setIsCartOpen(true);
  };

  const updateCartItem = async (productId: string, quantity: number) => {
    await axios.put(
      `${BACKEND_API_URL}api/cart/update`,
      { productId, quantity },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    fetchCart();
  };

  const removeFromCart = async (productId: string) => {
    await axios.delete(`${BACKEND_API_URL}api/cart/remove/${productId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    fetchCart();
  };

  const clearCart = async () => {
    await axios.delete(`${BACKEND_API_URL}api/cart/clear`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    fetchCart();
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        isCartOpen,
        setIsCartOpen,
        refreshCart: fetchCart,
        addToCart,
        updateCartItem,
        removeFromCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
