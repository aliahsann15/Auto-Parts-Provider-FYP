import { Store } from './api/store'

export type SellerContactInfo = {
  storeName: string
  email: string
  phone: string
  address: string
}

const ADDRESS_SEPARATOR = ', '
const EMPTY_VALUE = '—'

const joinAddressParts = (parts: Array<string | undefined | null>) =>
  parts
    .map(part => (typeof part === 'string' ? part.trim() : undefined))
    .filter(Boolean)
    .join(ADDRESS_SEPARATOR)

const addressFromStore = (store?: Store | null) => {
  const firstAddress = store?.addresses?.[0]
  if (!firstAddress) return ''
  return joinAddressParts([
    firstAddress.street,
    firstAddress.city,
    firstAddress.province,
    firstAddress.country,
    firstAddress.postalCode,
  ])
}

const addressFromUser = (user?: any) => {
  if (!user) return ''
  const userAddress = user.address
  if (userAddress) {
    return joinAddressParts([
      userAddress.street,
      userAddress.city,
      userAddress.province,
      userAddress.country,
      userAddress.postalCode,
      userAddress.fullAddress,
    ])
  }
  const fallback = Array.isArray(user.addresses) ? user.addresses[0] : undefined
  if (fallback) {
    return joinAddressParts([
      fallback.street,
      fallback.city,
      fallback.province,
      fallback.country,
      fallback.postalCode,
      fallback.fullAddress,
    ])
  }
  return ''
}

const formatAddressLine = (store?: Store | null, user?: any) => {
  return addressFromStore(store) || addressFromUser(user)
}

const formatStoreName = (store?: Store | null, user?: any) => {
  return store?.storeName || user?.storeName || user?.businessName || user?.name || ''
}

const normalizeReferenceId = (value: any): string | undefined => {
  if (!value) return undefined
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    if (value._id) return String(value._id)
    if (value.id) return String(value.id)
  }
  return undefined
}

const getSellerCandidates = (item: any) => [
  item?.seller,
  item?.productSnapshot?.seller,
  item?.product?.seller,
]

export const getPrimarySellerIdFromItems = (items?: any[]): string | undefined => {
  if (!items || !items.length) return undefined
  for (const item of items) {
    for (const candidate of getSellerCandidates(item)) {
      const id = normalizeReferenceId(candidate)
      if (id) return id
    }
  }
  return undefined
}

export const buildSellerContactInfo = (store?: Store | null, user?: any): SellerContactInfo => {
  const storeName = formatStoreName(store, user) || EMPTY_VALUE
  const email = user?.email?.trim?.() || EMPTY_VALUE
  const phone = user?.phoneNumber?.trim?.() || EMPTY_VALUE
  const address = formatAddressLine(store, user) || EMPTY_VALUE
  return { storeName, email, phone, address }
}
