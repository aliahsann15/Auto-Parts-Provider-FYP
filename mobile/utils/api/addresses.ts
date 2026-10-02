import { apiRequest } from './client'

export type Address = {
  country?: string
  province?: string
  city?: string
  postalCode?: string
  fullAddress?: string
  street?: string
  isDefault?: boolean
}

export function fetchAddresses(token: string) {
  return apiRequest<{ ok: boolean; addresses: Address[] }>('/addresses', { token })
}

export function addAddress(payload: Address, token: string) {
  return apiRequest<{ ok: boolean; addresses: Address[] }>('/addresses', {
    method: 'POST',
    body: payload,
    token
  })
}

export function upsertAddress(index: number | null, payload: Address, token: string) {
  if (index === null || typeof index === 'undefined') {
    return addAddress(payload, token)
  }
  return updateAddress(index, payload, token)
}

export function updateAddress(index: number, payload: Address, token: string) {
  return apiRequest<{ ok: boolean; addresses: Address[] }>(`/addresses/${index}`, {
    method: 'PUT',
    body: payload,
    token
  })
}

export function deleteAddress(index: number, token: string) {
  return apiRequest<{ ok: boolean; addresses: Address[] }>(`/addresses/${index}`, {
    method: 'DELETE',
    token
  })
}
