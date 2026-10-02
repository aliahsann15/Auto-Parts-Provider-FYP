import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

type SupportBadgeCounts = {
  sellerUnread: number
  buyerUnread: number
}

type SupportBadgeContextValue = SupportBadgeCounts & {
  totalUnread: number
  setBadgeCounts: (counts: Partial<SupportBadgeCounts>) => void
}

const SupportBadgeContext = createContext<SupportBadgeContextValue | undefined>(undefined)

export const SupportBadgeProvider = ({ children }: { children: React.ReactNode }) => {
  const [sellerUnread, setSellerUnread] = useState(0)
  const [buyerUnread, setBuyerUnread] = useState(0)

  const setBadgeCounts = useCallback((counts: Partial<SupportBadgeCounts>) => {
    if (typeof counts.sellerUnread === 'number') {
      setSellerUnread(counts.sellerUnread)
    }
    if (typeof counts.buyerUnread === 'number') {
      setBuyerUnread(counts.buyerUnread)
    }
  }, [])

  const value = useMemo(
    () => ({
      sellerUnread,
      buyerUnread,
      totalUnread: sellerUnread + buyerUnread,
      setBadgeCounts,
    }),
    [sellerUnread, buyerUnread, setBadgeCounts]
  )

  return <SupportBadgeContext.Provider value={value}>{children}</SupportBadgeContext.Provider>
}

export const useSupportBadge = () => {
  const ctx = useContext(SupportBadgeContext)
  if (!ctx) {
    throw new Error('useSupportBadge must be used within SupportBadgeProvider')
  }
  return ctx
}
