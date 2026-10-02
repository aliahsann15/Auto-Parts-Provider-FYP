export type WarrantyDurationUnit = 'DAY' | 'MONTH' | 'YEAR'

export const MS_DAY = 24 * 60 * 60 * 1000

export const parseDurationUnit = (value?: string): WarrantyDurationUnit | undefined => {
  if (!value) return undefined
  const normalized = String(value).trim().toUpperCase()
  if (!normalized) return undefined
  if (normalized === 'DAY' || normalized === 'DAYS') return 'DAY'
  if (normalized === 'MONTH' || normalized === 'MONTHS') return 'MONTH'
  if (normalized === 'YEAR' || normalized === 'YEARS') return 'YEAR'
  return undefined
}

export const toNumberOrUndefined = (value: any): number | undefined => {
  if (value === null || typeof value === 'undefined') return undefined
  const candidate = Number(value)
  return Number.isFinite(candidate) ? candidate : undefined
}

export const getProductWarrantyData = (product: any) => {
  const durationValue = toNumberOrUndefined(product?.warrantyDurationValue)
  const durationUnit = parseDurationUnit(product?.warrantyDurationUnit)
  return {
    durationValue,
    durationUnit,
  }
}

export const addDurationToDate = (source: Date, value: number, unit: WarrantyDurationUnit) => {
  const multiplier = unit === 'DAY' ? 1 : unit === 'MONTH' ? 30 : 365
  return new Date(source.getTime() + value * multiplier * MS_DAY)
}
