import { apiRequest } from './client'
import { API_BASE_URL } from './client'

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
  year?: string | number
  stock: number
  images: string[]
  sellerName?: string
  sellerId?: string
  sellerImage?: string
  reviews?: { rating: number }[]
  status?: string
  createdAt?: string
  averageRating?: number
  totalReviews?: number
  rating?: number
  updatedAt?: string
  dimensions?: {
    width?: number
    length?: number
    height?: number
  }
  warrantyDurationValue?: number
  warrantyDurationUnit?: 'DAY' | 'MONTH' | 'YEAR'
  returnDays?: number
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

export function fetchPublicProducts(params?: { page?: number; limit?: number; q?: string; categories?: string; minPrice?: number; maxPrice?: number; sort?: string; minRating?: number; maxRating?: number; make?: string; carModel?: string; variant?: string; status?: string; seller?: string }) {
  const search = new URLSearchParams()
  if (params?.page) search.set('page', String(params.page))
  if (params?.limit) search.set('limit', String(params.limit))
  if (params?.q) search.set('q', params.q)
  if (params?.categories) search.set('categories', params.categories)
  if (typeof params?.minPrice !== 'undefined') search.set('minPrice', String(params.minPrice))
  if (typeof params?.maxPrice !== 'undefined') search.set('maxPrice', String(params.maxPrice))
  if (params?.sort) search.set('sort', params.sort)
  if (typeof params?.minRating !== 'undefined') search.set('minRating', String(params.minRating))
  if (typeof params?.maxRating !== 'undefined') search.set('maxRating', String(params.maxRating))
  if (params?.make) search.set('make', params.make)
  if (params?.carModel) search.set('carModel', params.carModel)
  if (params?.variant) search.set('variant', params.variant)
  if (params?.seller) search.set('seller', params.seller)
  const status = params?.status ?? 'active'
  if (status) search.set('status', status)
  const qs = search.toString()
  const path = `/public/products${qs ? `?${qs}` : ''}`
  return apiRequest<ProductListResponse>(path).then(res => ({
    ...res,
    products: (res.products || []).filter(p => !p.status || p.status.toLowerCase() === 'active'),
  }))
}

export function fetchPublicProductsByMake(make: string, params?: { page?: number; limit?: number; status?: string }) {
  const search = new URLSearchParams()
  if (params?.page) search.set('page', String(params.page))
  if (params?.limit) search.set('limit', String(params.limit))
  if (make) search.set('make', make)
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

export function fetchMyProducts(token: string, params?: { page?: number; limit?: number; status?: string }) {
  const search = new URLSearchParams()
  if (params?.page) search.set('page', String(params.page))
  if (params?.limit) search.set('limit', String(params.limit))
  if (params?.status) search.set('status', params.status)
  const qs = search.toString()
  return apiRequest<{ products: Product[]; pagination: any }>(`/products${qs ? `?${qs}` : ''}`, { token })
}

export async function fetchMyProduct(id: string, token: string) {
  const res = await apiRequest<any>(`/products/${id}`, { token });
  const product = (res as any).product || res;
  return { product: product as Product };
}

type ProductPayload = {
  name: string
  description: string
  price: number
  brand: string
  make: string
  carModel: string
  variant?: string
  year?: string | number
  sku: string
  stock: number
  technicalDescription?: string
  status?: string
  salePrice?: number
  categories: string[]
  featuredImage?: string
  gallery?: string[]
  width?: number
  length?: number
  height?: number
  warrantyDurationValue?: number
  warrantyDurationUnit?: 'DAY' | 'MONTH' | 'YEAR'
  returnDays?: number
}

const appendFile = (form: FormData, field: string, uri: string) => {
  const filename = uri.split('/').pop() || 'upload.jpg'
  const ext = (filename.split('.').pop() || '').toLowerCase()
  const type =
    ext === 'png' ? 'image/png' :
    ext === 'webp' ? 'image/webp' :
    ext === 'gif' ? 'image/gif' : 'image/jpeg'
  form.append(field, {
    uri,
    name: filename,
    type,
  } as any)
}

const isLocalUri = (uri?: string) => !!uri && (uri.startsWith('file://') || uri.startsWith('ph://') || uri.startsWith('content://'))

export async function createProduct(payload: ProductPayload, token: string) {
  const form = new FormData()
  form.append('name', payload.name)
  form.append('description', payload.description)
  form.append('price', String(payload.price))
  if (payload.salePrice) form.append('salePrice', String(payload.salePrice))
  form.append('brand', payload.brand)
  form.append('make', payload.make)
  form.append('carModel', payload.carModel)
  form.append('variant', payload.variant ?? '')
  form.append('year', payload.year ? String(payload.year) : '')
  form.append('sku', payload.sku)
  form.append('stock', String(payload.stock))
  if (payload.technicalDescription) form.append('technicalDescription', payload.technicalDescription)
  form.append('status', payload.status || 'active')
  if (typeof payload.width !== 'undefined') form.append('width', String(payload.width))
  if (typeof payload.length !== 'undefined') form.append('length', String(payload.length))
  if (typeof payload.height !== 'undefined') form.append('height', String(payload.height))
  if (typeof payload.warrantyDurationValue !== 'undefined') {
    form.append('warrantyDurationValue', String(payload.warrantyDurationValue))
  }
  if (payload.warrantyDurationUnit) {
    form.append('warrantyDurationUnit', payload.warrantyDurationUnit)
  }
  if (typeof payload.returnDays !== 'undefined') form.append('returnDays', String(payload.returnDays))
  payload.categories.forEach(cat => form.append('categories', cat))
  if (payload.featuredImage) appendFile(form, 'featuredImage', payload.featuredImage)
  payload.gallery?.forEach(uri => appendFile(form, 'galleryImages', uri))

  const res = await fetch(`${API_BASE_URL}/products`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.msg || 'Failed to create product')
  return data
}

export async function updateProductAuth(id: string, payload: ProductPayload, token: string) {
  // Always send multipart so backend receives same shape and keeps images unless new ones are uploaded.
  const form = new FormData()
  form.append('name', payload.name)
  form.append('description', payload.description)
  form.append('price', String(payload.price))
  if (payload.salePrice) form.append('salePrice', String(payload.salePrice))
  form.append('brand', payload.brand)
  form.append('make', payload.make)
  form.append('carModel', payload.carModel)
  if (payload.variant) form.append('variant', payload.variant)
  if (payload.year) form.append('year', String(payload.year))
  form.append('sku', payload.sku)
  form.append('stock', String(payload.stock))
  if (payload.technicalDescription) form.append('technicalDescription', payload.technicalDescription)
  if (payload.status) form.append('status', payload.status)
  if (typeof payload.width !== 'undefined') form.append('width', String(payload.width))
  if (typeof payload.length !== 'undefined') form.append('length', String(payload.length))
  if (typeof payload.height !== 'undefined') form.append('height', String(payload.height))
  if (typeof payload.warrantyDurationValue !== 'undefined') {
    form.append('warrantyDurationValue', String(payload.warrantyDurationValue))
  }
  if (payload.warrantyDurationUnit) {
    form.append('warrantyDurationUnit', payload.warrantyDurationUnit)
  }
  if (typeof payload.returnDays !== 'undefined') form.append('returnDays', String(payload.returnDays))
  payload.categories.forEach(cat => form.append('categories', cat))

  // Persist existing remote images (featured + gallery) so backend can keep or remove them correctly
  const existingImages = [payload.featuredImage, ...(payload.gallery || [])]
    .filter(uri => !!uri && !isLocalUri(uri));
  form.append('existingImages', JSON.stringify(existingImages));

  // Only upload new/local images; backend keeps previous URLs when none are sent
  if (payload.featuredImage && isLocalUri(payload.featuredImage)) {
    appendFile(form, 'featuredImage', payload.featuredImage)
  }
  (payload.gallery || []).filter(isLocalUri).forEach(uri => appendFile(form, 'galleryImages', uri))

  const res = await fetch(`${API_BASE_URL}/products/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.msg || 'Failed to update product')
  return data
}

export function deleteProductAuth(id: string, token: string, permanent = false) {
  const qs = permanent ? '?permanent=true' : ''
  return apiRequest<{ msg: string }>(`/products/${id}${qs}`, { method: 'DELETE', token })
}

export function restoreProductAuth(id: string, token: string, status: 'active' | 'draft' = 'draft') {
  return apiRequest<{ msg: string }>(`/products/${id}/restore`, { method: 'PUT', body: { status }, token })
}
