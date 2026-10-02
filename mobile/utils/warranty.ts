import { OrderItem } from '@/utils/api/orders'
import { WarrantyClaim } from '@/utils/api/warranty'

export type WarrantyDurationUnit = 'DAY' | 'MONTH' | 'YEAR'

const MS_DAY = 24 * 60 * 60 * 1000

const parseDurationUnit = (value?: string): WarrantyDurationUnit | undefined => {
  if (!value) return undefined
  const normalized = String(value).trim().toUpperCase()
  if (!normalized) return undefined
  if (normalized === 'DAY' || normalized === 'DAYS') return 'DAY'
  if (normalized === 'MONTH' || normalized === 'MONTHS') return 'MONTH'
  if (normalized === 'YEAR' || normalized === 'YEARS') return 'YEAR'
  return undefined
}

const toNumberOrUndefined = (value: any): number | undefined => {
  if (value === null || typeof value === 'undefined') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export const getProductWarrantyData = (product: any) => {
  const durationValue =
    toNumberOrUndefined(product?.warrantyDurationValue) ??
    toNumberOrUndefined(product?.warrantyValue)
  const durationUnit =
    parseDurationUnit(product?.warrantyDurationUnit) ??
    parseDurationUnit(product?.warrantyUnit)
  return {
    durationValue,
    durationUnit,
  }
}

export const addDurationToDate = (source: Date, value: number, unit: WarrantyDurationUnit) => {
  const multiplier = unit === 'DAY' ? 1 : unit === 'MONTH' ? 30 : 365
  return new Date(source.getTime() + value * multiplier * MS_DAY)
}

export const getWarrantyExpiryDate = (deliveredAt: string | null | undefined, product: any) => {
  const warrantyInfo = getProductWarrantyData(product)
  if (!warrantyInfo.durationValue || !warrantyInfo.durationUnit) return undefined
  if (!deliveredAt) return undefined
  const deliveredDate = new Date(deliveredAt)
  if (Number.isNaN(deliveredDate.getTime())) return undefined
  return addDurationToDate(deliveredDate, warrantyInfo.durationValue, warrantyInfo.durationUnit)
}

export const isWarrantyExpired = (expiryDate?: Date) => {
  if (!expiryDate) return true
  return new Date() > expiryDate
}

const normalizeItemId = (item: OrderItem['items'][number]) =>
  String(item._id || item.id || item.orderItemId || '')

const PENDING_WARRANTY_STATUSES = new Set([
  'REQUESTED',
  'APPROVED',
  'BUYER_SHIPPED',
  'SELLER_RECEIVED',
  'SELLER_SHIPPED',
])

export const getRemainingWarrantyQuantity = (
  orderItem: OrderItem['items'][number],
  claims: WarrantyClaim[]
) => {
  const orderedQuantity = Number(orderItem.quantity ?? 0)
  if (orderedQuantity <= 0) return 0
  const itemId = normalizeItemId(orderItem)
  if (!itemId) return orderedQuantity
  const consumed = claims
    .filter(claim =>
      claim.orderItemId &&
      String(claim.orderItemId) === itemId &&
      claim.status &&
      PENDING_WARRANTY_STATUSES.has(claim.status)
    )
    .reduce((sum, claim) => sum + (Number(claim.claimQuantity) || 0), 0)
  const remainder = orderedQuantity - consumed
  return remainder > 0 ? remainder : 0
}

export const isWarrantyApplicableForItem = (
  orderItem: OrderItem['items'][number],
  orderDeliveredAt: string | null | undefined,
  claims: WarrantyClaim[]
) => {
  const expiry = getWarrantyExpiryDate(orderDeliveredAt, orderItem.productSnapshot || orderItem.product)
  if (!expiry || isWarrantyExpired(expiry)) return false
  return getRemainingWarrantyQuantity(orderItem, claims) > 0
}

export const getOrderItemLabel = (item: OrderItem['items'][number]) => {
  const snapshot = item.productSnapshot || {}
  const product = item.product || {}
  const make = snapshot.make || product.make
  const model =
    snapshot.carModel ||
    product.carModel ||
    snapshot.carName ||
    product.carName
  const variant = snapshot.variant || product.variant
  const year = snapshot.year || product.year
  const partName =
    snapshot.partName ||
    snapshot.productName ||
    product.partName ||
    product.productName ||
    snapshot.name ||
    product.name
  const detailSegments = [make, model, variant, year, partName].filter(Boolean)
  return detailSegments.join(' ').trim() || 'Product'
}
