import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

type TabBadgeCounts = {
  orders: number
  withdrawals: number
  requests: number
  returnRequests: number
}

type TabBadgeContextValue = TabBadgeCounts & {
  setOrdersBadge: (count: number) => void
  setWithdrawalBadge: (count: number) => void
  setRequestBadge: (count: number) => void
  setReturnBadge: (count: number) => void
}

const TabBadgeContext = createContext<TabBadgeContextValue | undefined>(undefined)

export const TabBadgeProvider = ({ children }: { children: React.ReactNode }) => {
  const [orders, setOrders] = useState(0)
  const [withdrawals, setWithdrawals] = useState(0)
  const [requests, setRequests] = useState(0)
  const [returnRequests, setReturnRequests] = useState(0)

  const setOrdersBadge = useCallback((count: number) => {
    setOrders(Math.max(0, Math.floor(count)))
  }, [])
  const setWithdrawalBadge = useCallback((count: number) => {
    setWithdrawals(Math.max(0, Math.floor(count)))
  }, [])
  const setRequestBadge = useCallback((count: number) => {
    setRequests(Math.max(0, Math.floor(count)))
  }, [])
  const setReturnBadge = useCallback((count: number) => {
    setReturnRequests(Math.max(0, Math.floor(count)))
  }, [])

  const value = useMemo(
    () => ({
      orders,
      withdrawals,
      requests,
      returnRequests,
      setOrdersBadge,
      setWithdrawalBadge,
      setRequestBadge,
      setReturnBadge,
    }),
    [orders, withdrawals, requests, returnRequests, setOrdersBadge, setWithdrawalBadge, setRequestBadge, setReturnBadge]
  )

  return <TabBadgeContext.Provider value={value}>{children}</TabBadgeContext.Provider>
}

export const useTabBadge = () => {
  const ctx = useContext(TabBadgeContext)
  if (!ctx) {
    throw new Error('useTabBadge must be used within TabBadgeProvider')
  }
  return ctx
}
