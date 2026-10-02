export const SELLER_REJECTION_REASONS = [
  { key: 'condition_not_met', label: 'Item condition not met return policy' },
  { key: 'window_expired', label: 'Return window has expired' },
  { key: 'not_returnable', label: 'Item is not eligible for return' },
  { key: 'missing_documents', label: 'Required photos or docs are missing' },
  { key: 'unable_to_verify', label: 'Unable to verify the claimed issue' },
  { key: 'other', label: 'Other / explain below' },
]

export const getSellerRejectionReasonLabel = (key?: string) => {
  if (!key) return undefined
  return SELLER_REJECTION_REASONS.find(reason => reason.key === key)?.label
}

export const WARRANTY_REJECTION_REASONS = [
  { key: 'warranty_expired', label: 'Warranty period has expired' },
  { key: 'issue_not_covered', label: 'Issue not covered under warranty' },
  { key: 'missing_documents', label: 'Required photos or docs are missing' },
  { key: 'tampering_detected', label: 'Signs of tampering or misuse' },
  { key: 'other', label: 'Other / explain below' },
]

export const getWarrantyRejectionReasonLabel = (key?: string) => {
  if (!key) return undefined
  return WARRANTY_REJECTION_REASONS.find(reason => reason.key === key)?.label
}
