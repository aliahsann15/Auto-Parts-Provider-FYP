import { apiRequest } from './client'

export type OrderItem = {
  _id: string
  id?: string
  orderNumber?: string
  items: Array<{
    _id?: string
    product: any
    productSnapshot?: any
    returnDays?: number
    pendingReturnQuantity?: number
    returnableQuantity?: number
    quantity: number
    price: number
    salePrice?: number
    seller?: string
  }>
  totalAmount?: number
  shippingFee?: number
  inspectionFee?: number
  autoPartsInspection?: boolean
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  paymentStatus?: 'pending' | 'completed' | 'failed'
  paymentMethod?: string
  deliveredAt?: string
  shippingAddress?: {
    street?: string
    city?: string
    state?: string
    country?: string
    zipCode?: string
  }
  customer?: {
    firstName?: string
    lastName?: string
    name?: string
    email?: string
    phoneNumber?: string
  }
  createdAt?: string
  updatedAt?: string
}

export type ReturnSummaryItem = {
  status?: string
  returnNumber?: string
  refundAmount?: number
  hasRejected?: boolean
  requestedQuantity?: number
}

export type OrdersResponse = {
  ok?: boolean
  orders?: OrderItem[]
  data?: OrderItem[]
  returnSummary?: Record<string, ReturnSummaryItem>
}

export async function fetchMyOrders(token: string) {
  return apiRequest<OrdersResponse>('/orders/my-orders', {
    method: 'GET',
    token,
  })
}

export async function fetchSellerOrders(token: string) {
  return apiRequest<OrdersResponse>('/orders/seller-orders', {
    method: 'GET',
    token,
  })
}

export async function fetchAdminOrders(token: string) {
  return apiRequest<OrdersResponse>('/orders/admin', {
    method: 'GET',
    token,
  })
}

export async function fetchOrder(token: string, id: string) {
  return apiRequest<OrderItem>(`/orders/${id}`, {
    method: 'GET',
    token,
  })
}

export async function updateOrderStatus(token: string, id: string, status: string) {
  return apiRequest<OrderItem>(`/orders/${id}/status`, {
    method: 'PATCH',
    token,
    body: { status },
  })
}

export async function createOrder(token: string, payload: any) {
  return apiRequest<OrderItem>('/orders', {
    method: 'POST',
    token,
    body: payload,
  })
}

export async function cancelOrderRequest(
  token: string,
  id: string,
  payload: { reason?: string; note?: string; comment?: string } = {}
) {
  return apiRequest<OrderItem>(`/orders/${id}/cancel`, {
    method: 'POST',
    token,
    body: payload,
  })
}

export type ProfitInsightPoint = {
  date: string
  revenue: number
  shipping: number
  profit: number
}

export type ProfitInsightResponse = {
  summary: {
    revenue: number
    shipping: number
    profit: number
  }
  points: ProfitInsightPoint[]
}

export async function fetchSellerProfitInsights(
  token: string,
  params: { days?: number; startDate?: string; endDate?: string } = {}
) {
  const search = new URLSearchParams()
  if (params.days) search.set('days', String(params.days))
  if (params.startDate) search.set('startDate', params.startDate)
  if (params.endDate) search.set('endDate', params.endDate)
  const qs = search.toString()
  const path = qs ? `/orders/seller-profit?${qs}` : '/orders/seller-profit'
  return apiRequest<ProfitInsightResponse>(path, {
    method: 'GET',
    token,
  })
}

export type OrderInsightPoint = {
  date: string
  completed: number
  pending: number
  cancelled: number
}

export type OrderInsightResponse = {
  summary: {
    completed: number
    pending: number
    cancelled: number
  }
  points: OrderInsightPoint[]
}

export async function fetchSellerOrderInsights(
  token: string,
  params: { days?: number; startDate?: string; endDate?: string } = {}
) {
  const search = new URLSearchParams()
  if (params.days) search.set('days', String(params.days))
  if (params.startDate) search.set('startDate', params.startDate)
  if (params.endDate) search.set('endDate', params.endDate)
  const qs = search.toString()
  const path = qs ? `/orders/seller-order-insights?${qs}` : '/orders/seller-order-insights'
  return apiRequest<OrderInsightResponse>(path, {
    method: 'GET',
    token,
  })
}
