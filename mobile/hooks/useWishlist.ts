import React from 'react';
import { fetchWishlist, toggleWishlistItem, removeWishlistItem, WishlistResponse } from '@/utils/api/wishlist';
import { Product } from '@/utils/api/products';
import { useAuth } from '@/app/context/AuthContext';

type WishlistHook = {
  items: Product[];
  isLoading: boolean;
  isUpdatingId: string | null;
  refresh: () => Promise<void>;
  toggle: (productId: string) => Promise<WishlistResponse | null>;
  remove: (productId: string) => Promise<WishlistResponse | null>;
  isInWishlist: (productId?: string | null) => boolean;
};

export default function useWishlist(): WishlistHook {
  const { token, isLoggedIn } = useAuth();
  const [items, setItems] = React.useState<Product[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isUpdatingId, setIsUpdatingId] = React.useState<string | null>(null);

  const loadWishlist = React.useCallback(async () => {
    if (!token) {
      setItems([]);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetchWishlist(token);
      if (res?.items) setItems(res.items);
    } catch (err) {
      console.warn('Failed to fetch wishlist', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    loadWishlist();
  }, [loadWishlist, isLoggedIn]);

  const mutate = React.useCallback(
    async (fn: (productId: string, token: string) => Promise<WishlistResponse>, productId: string) => {
      if (!token) {
        throw new Error('Please log in to manage your wishlist.');
      }
      setIsUpdatingId(productId);
      try {
        const res = await fn(productId, token);
        if (res?.items) setItems(res.items);
        return res;
      } finally {
        setIsUpdatingId(null);
      }
    },
    [token]
  );

  const toggle = React.useCallback(
    async (productId: string) => {
      const res = await mutate(toggleWishlistItem, productId);
      return res;
    },
    [mutate]
  );

  const remove = React.useCallback(
    (productId: string) => mutate(removeWishlistItem, productId),
    [mutate]
  );

  const wishlistIdSet = React.useMemo(
    () => new Set(items.map(p => (p as any)?._id || (p as any)?.id)),
    [items]
  );

  const isInWishlist = React.useCallback(
    (productId?: string | null) => (productId ? wishlistIdSet.has(productId) : false),
    [wishlistIdSet]
  );

  return {
    items,
    isLoading,
    isUpdatingId,
    refresh: loadWishlist,
    toggle,
    remove,
    isInWishlist
  };
}
