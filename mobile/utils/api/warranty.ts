import { apiRequest } from './client'

export type WarrantyClaimPayload = {
  orderId: string
  orderItemId: string
  claimQuantity: number
  notes?: string
  images?: string[]
}

export type WarrantyClaim = {
  _id: string
  claimNumber: string
  buyerId: string
  sellerId: string
  orderId: string
  orderNumber?: string
  productId?: string
  productName?: string
  productImage?: string
  productSku?: string
  orderedQuantity: number
  claimQuantity: number
  notes?: string
  images?: string[]
  sellerDecision?: 'REPLACE' | 'REPAIR'
  rejection?: {
    reasonCode?: string
    reasonText?: string
    sellerMessage?: string
  }
  tracking?: {
    buyerToSellerTrackingId?: string
    sellerToBuyerTrackingId?: string
  }
  status: string
  requestedAt?: string
  approvedAt?: string
  rejectedAt?: string
  buyerShippedAt?: string
  sellerReceivedAt?: string
  sellerShippedAt?: string
  completedAt?: string
}

export async function fetchBuyerWarrantyClaims(token: string) {
  const res = await apiRequest<{ ok?: boolean; items?: WarrantyClaim[] }>('/warranty-claims/my', {
    token,
  })
  return res.items || []
}

export async function fetchSellerWarrantyClaims(token: string) {
  const res = await apiRequest<{ ok?: boolean; items?: WarrantyClaim[] }>('/warranty-claims/seller', {
    token,
  })
  return res.items || []
}

export async function fetchWarrantyClaim(token: string, id: string) {
  return apiRequest<WarrantyClaim>(`/warranty-claims/${id}`, { token })
}

export async function createWarrantyClaim(payload: WarrantyClaimPayload, token: string) {
  return apiRequest<WarrantyClaim>('/warranty-claims', {
    method: 'POST',
    token,
    body: payload,
  })
}

export async function updateWarrantyClaimStatus(
  id: string,
  payload: Record<string, any>,
  token: string
) {
  return apiRequest<WarrantyClaim>(`/warranty-claims/${id}/status`, {
    method: 'PATCH',
    token,
    body: payload,
  })
}
