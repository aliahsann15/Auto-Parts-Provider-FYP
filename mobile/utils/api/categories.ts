import { apiRequest } from './client'

export type Category = {
  _id: string
  name: string
  description?: string
}

export type Product = {
  _id: string
  name: string
  description: string
  price: number
  salePrice?: number
  categories: string[]
  brand: string
  sku: string
  make: string
  carModel: string
  variant?: string
  stock: number
  images: string[]
  sellerName?: string
  sellerId?: string
  sellerImage?: string
  reviews?: { rating: number }[]
  status?: string
}

export type ProductListResponse = {
  products: Product[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function fetchCategories() {
  return apiRequest<Category[]>('/categories')
}

export function fetchPublicProducts(params?: { page?: number; limit?: number; status?: string }) {
  const search = new URLSearchParams()
  if (params?.page) search.set('page', String(params.page))
  if (params?.limit) search.set('limit', String(params.limit))
  const status = params?.status ?? 'active'
  if (status) search.set('status', status)
  const qs = search.toString()
  const path = `/public/products${qs ? `?${qs}` : ''}`
  return apiRequest<ProductListResponse>(path).then(res => ({
    ...res,
    products: (res.products || []).filter(p => !p.status || p.status.toLowerCase() === 'active'),
  }))
}

export function fetchPublicProduct(id: string) {
  return apiRequest<{ product: Product & { itemsSold?: number } }>(`/public/products/${id}`)
}
