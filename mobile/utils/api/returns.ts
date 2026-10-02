import { apiRequest } from './client'

export type ReturnItem = {
  orderItemId?: string
  product?: any
  productSnapshot?: any
  quantity: number
  unitPrice: number
  subtotal: number
  reason?: string
  returnDays?: number
  images?: string[]
  price?: number
}

export type ReturnRecord = {
  _id: string
  returnNumber: string
  order: {
    _id: string
    orderNumber?: string
    items?: any[]
    status?: string
    deliveredAt?: string
    customer?: {
      firstName?: string
      lastName?: string
      name?: string
      email?: string
      phoneNumber?: string
    }
    shippingAddress?: {
      street?: string
      city?: string
      state?: string
      country?: string
      zipCode?: string
    }
  }
  buyer: any
  seller: any
  items: ReturnItem[]
  status: string
  reason?: string
  note?: string
  sellerNote?: string
  sellerRejectionReason?: string
  sellerRejectionMessage?: string
  images?: string[]
  returnMethod?: string
  trackingId?: string
  refundAmount?: number
  returnWindowDays?: number
  returnDeadline?: string
  requestedAt?: string
  rejectedAt?: string
  approvedAt?: string
  receivedAt?: string
  refundedAt?: string
  cancelledAt?: string
  refundCurrency?: string
  updatedAt?: string
}

type ReturnsResponse = {
  items: ReturnRecord[]
}

const normalizeListResponse = (data: any): ReturnRecord[] => {
  if (!data) return []
  if (Array.isArray(data)) return data
  return data.items || []
}

export async function fetchBuyerReturns(token: string) {
  const res = await apiRequest<ReturnsResponse>('/returns/my', { token })
  return normalizeListResponse(res)
}

export async function fetchSellerReturns(token: string) {
  const res = await apiRequest<ReturnsResponse>('/returns/seller', { token })
  return normalizeListResponse(res)
}

export async function fetchReturn(id: string, token: string) {
  return apiRequest<ReturnRecord>(`/returns/${id}`, { token })
}

export async function fetchReturnsByOrder(orderId: string, token: string) {
  const res = await apiRequest<ReturnsResponse>(`/returns/order/${orderId}`, { token })
  return normalizeListResponse(res)
}

export async function fetchAdminReturns(token: string) {
  const res = await apiRequest<ReturnsResponse>('/returns?all=true', { token })
  return normalizeListResponse(res)
}

export async function createReturn(payload: {
  orderId: string
  items: Array<{ orderItemId: string; quantity: number; reason?: string; images?: string[] }>
  reason?: string
  note?: string
  images?: string[]
  returnMethod?: string
}, token: string) {
  return apiRequest<ReturnRecord>('/returns', {
    method: 'POST',
    token,
    body: payload,
  })
}

export async function updateReturnStatus(id: string, payload: {
  status: string
  sellerNote?: string
  note?: string
  trackingId?: string
  returnMethod?: string
  refundAmount?: number
  refundCurrency?: string
  images?: string[]
  sellerRejectionReason?: string
  sellerRejectionMessage?: string
}, token: string) {
  return apiRequest<ReturnRecord>(`/returns/${id}/status`, {
    method: 'PATCH',
    token,
    body: payload,
  })
}

export async function saveReturnBankDetails(
  id: string,
  payload: { bankName: string; accountTitle?: string; accountNumber: string },
  token: string
) {
  return apiRequest<ReturnRecord>(`/returns/${id}/bank-details`, {
    method: 'PATCH',
    token,
    body: payload,
  })
}
