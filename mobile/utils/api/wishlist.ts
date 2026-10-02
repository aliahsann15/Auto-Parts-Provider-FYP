import { apiRequest } from './client'
import { Product } from './products'

export type WishlistResponse = {
  ok: boolean
  items: Product[]
  added?: boolean
}

export async function fetchWishlist(token: string) {
  return apiRequest<WishlistResponse>('/wishlist', {
    method: 'GET',
    token
  })
}

export async function toggleWishlistItem(productId: string, token: string) {
  return apiRequest<WishlistResponse>('/wishlist/toggle', {
    method: 'POST',
    token,
    body: { productId }
  })
}

export async function removeWishlistItem(productId: string, token: string) {
  return apiRequest<WishlistResponse>(`/wishlist/${productId}`, {
    method: 'DELETE',
    token
  })
}
