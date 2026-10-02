import { apiRequest } from './client'

export function addToCart(payload: { productId: string; quantity: number }, token: string) {
  return apiRequest<{ msg: string }>('/cart/add', {
    method: 'POST',
    body: payload,
    token
  })
}

export function getCart(token: string) {
  return apiRequest<{ items: { product: any; quantity: number }[] }>('/cart', { token })
}

export function updateCartItem(payload: { productId: string; quantity: number }, token: string) {
  return apiRequest<{ msg: string }>('/cart/update', {
    method: 'PUT',
    body: payload,
    token
  })
}

export function removeCartItem(productId: string, token: string) {
  return apiRequest<{ msg: string }>(`/cart/remove/${productId}`, {
    method: 'DELETE',
    token
  })
}
