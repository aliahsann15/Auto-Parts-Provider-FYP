import crypto from 'crypto'

/**
 * Generate a unique tracking number for an order
 * Format: TRK-YYYYMMDD-XXXXXX
 * Example: TRK-20251209-A3B5C7
 */
export function generateTrackingNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  
  // Generate 6 random alphanumeric characters
  const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase()
  
  return `TRK-${year}${month}${day}-${randomPart}`
}

/**
 * Alternative: Generate tracking number with order sequence
 * Format: TRK-YYYYMMDD-NNNNNN (where N is a sequential number)
 */
export function generateTrackingNumberWithSequence(orderCount: number): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  
  // Pad order count to 6 digits
  const sequenceNumber = String(orderCount).padStart(6, '0')
  
  return `TRK-${year}${month}${day}-${sequenceNumber}`
}
