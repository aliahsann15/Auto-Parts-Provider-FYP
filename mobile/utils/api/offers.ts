import { apiRequest } from './client'

export type Offer = {
  _id: string
  request: any
  seller: any
  price?: number
  warranty?: string
  returnDays?: number
  dimensions?: {
    width?: number
    length?: number
    height?: number
  }
  message?: string
  createdAt?: string
  unreadMessages?: number
  offerNumber?: string
  requestClosed?: boolean
  acceptedOfferId?: string
  accepted?: boolean
  acceptedSeller?: any
  acceptedPrice?: number
}

export function fetchBuyerQuotes(token: string) {
  return apiRequest<{ offers: Offer[] }>('/offers/buyer/my-quotes', { token })
}

export function acceptOffer(offerId: string, token: string) {
  return apiRequest<{ msg: string; productId: string; requestId: string; acceptedOfferId: string; acceptedPrice?: number; isClosed?: boolean }>(`/offers/${offerId}/accept`, {
    method: 'POST',
    token,
  })
}

export function createOffer(payload: { requestId: string; price: number; message?: string; warranty?: string; returnDays?: number; dimensions?: { width?: number; length?: number; height?: number } }, token: string) {
  return apiRequest<{ msg: string; offer: Offer }>('/offers', {
    method: 'POST',
    token,
    body: payload,
  })
}

export function fetchOffersByRequest(requestId: string, token: string) {
  return apiRequest<{ msg: string; offers: Offer[]; isClosed?: boolean; acceptedOfferId?: string; acceptedSeller?: any; acceptedPrice?: number }>(`/offers/request/${requestId}`, {
    token,
  })
}

export function deleteOffer(offerId: string, token: string) {
  return apiRequest<{ msg: string }>(`/offers/${offerId}`, {
    method: 'DELETE',
    token
  })
}
