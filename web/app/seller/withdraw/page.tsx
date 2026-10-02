'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { FiDollarSign, FiClock, FiCheckCircle, FiXCircle } from 'react-icons/fi'
import SellerDashboardAside from '@/app/components/seller/seller-dasboard-aside'
import Spinner from '@/app/components/global/spinner'
import Avatar from '@/app/components/global/avatar'

interface WithdrawalSummary {
  availableBalance: number
  threshold: number
  pendingAmount: number
  totalEarnings: number
  totalWithdrawn: number
}

interface Withdrawal {
  _id: string
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'rejected'
  note?: string
  createdAt: string
  processedAt?: string
}

export default function WithdrawPage() {
  const { data: session, status } = useSession()
  const [summary, setSummary] = useState<WithdrawalSummary | null>(null)
  const [history, setHistory] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [amount, setAmount] = useState('')

  const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:4001').replace(/\/$/, '')

  // Redirect Store Managers - they don't have access to withdraw funds
  useEffect(() => {
    if (status === 'authenticated' && (session?.user as any)?.role === 'StoreManager') {
      toast.error('Store Managers do not have access to withdraw funds')
      window.location.href = '/seller/dashboard'
    }
  }, [status, session])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData()
    }
  }, [status])

  const fetchData = async () => {
    if (!session) return
    
    const token = (session as any).backendToken
    setLoading(true)

    try {
      const [summaryRes, historyRes] = await Promise.all([
        fetch(`${API_BASE}/api/withdrawals/summary`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(`${API_BASE}/api/withdrawals`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }),
      ])

      if (summaryRes.ok) {
        const summaryData = await summaryRes.json()
        setSummary(summaryData)
      }

      if (historyRes.ok) {
        const historyData = await historyRes.json()
        setHistory(historyData.history || [])
      }
    } catch (error) {
      console.error('Error fetching withdrawal data:', error)
      toast.error('Failed to load withdrawal data')
    } finally {
      setLoading(false)
    }
  }

  const handleRequestWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!session || !amount) return

    const token = (session as any).backendToken
    const amountNum = parseFloat(amount)

    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    if (summary && amountNum < summary.threshold) {
      toast.error(`Minimum withdrawal amount is PKR ${summary.threshold.toLocaleString()}`)
      return
    }

    if (summary && amountNum > summary.availableBalance) {
      toast.error('Insufficient balance')
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch(`${API_BASE}/api/withdrawals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: amountNum, currency: 'PKR' }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        toast.error(errorData.msg || 'Failed to request withdrawal')
        return
      }

      toast.success('Withdrawal request submitted successfully')
      setAmount('')
      fetchData()
    } catch (error) {
      console.error('Error requesting withdrawal:', error)
      toast.error('Failed to submit withdrawal request')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <FiClock className="text-yellow-500" />
      case 'completed':
        return <FiCheckCircle className="text-green-500" />
      case 'rejected':
        return <FiXCircle className="text-red-500" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-3 py-1 rounded-full text-xs font-medium'
    switch (status) {
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-700`
      case 'completed':
        return `${baseClasses} bg-green-100 text-green-700`
      case 'rejected':
        return `${baseClasses} bg-red-100 text-red-700`
      default:
        return baseClasses
    }
  }

  if (status !== 'authenticated') {
    return <Spinner />
  }

  const fullName = session.user.name || ''
  const [firstName, lastName] = fullName.split(' ')

  return (
    <div className="flex min-h-screen bg-gray-100">
      <SellerDashboardAside />

      <div className="flex-1 p-6">
        {/* Header */}
        <header className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Withdraw Funds</h2>
          <div className="flex items-center space-x-4">
            <Avatar firstName={firstName} lastName={lastName} imageUrl={session.user.image || ''} />
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <Spinner />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-full mr-4">
                    <FiDollarSign className="text-2xl text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Available Balance</p>
                    <p className="text-lg font-semibold">PKR {summary?.availableBalance.toLocaleString() || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <div className="p-3 bg-yellow-100 rounded-full mr-4">
                    <FiClock className="text-2xl text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Pending Amount</p>
                    <p className="text-lg font-semibold">PKR {summary?.pendingAmount.toLocaleString() || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-full mr-4">
                    <FiDollarSign className="text-2xl text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Earnings</p>
                    <p className="text-lg font-semibold">PKR {summary?.totalEarnings.toLocaleString() || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <div className="p-3 bg-purple-100 rounded-full mr-4">
                    <FiCheckCircle className="text-2xl text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Withdrawn</p>
                    <p className="text-lg font-semibold">PKR {summary?.totalWithdrawn.toLocaleString() || 0}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Request Withdrawal Form */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Request Withdrawal</h3>
              <form onSubmit={handleRequestWithdrawal} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Amount (PKR) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={`Minimum ${summary?.threshold.toLocaleString() || 0} PKR`}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-2"
                    required
                    disabled={submitting}
                    min={summary?.threshold || 0}
                    max={summary?.availableBalance || 0}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum withdrawal: PKR {summary?.threshold.toLocaleString() || 0}
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={submitting || !summary || summary.availableBalance < (summary.threshold || 0)}
                  className="bg-[#ffa500] text-white px-6 py-2 rounded-md hover:bg-[#ff8c00] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Submitting...' : 'Request Withdrawal'}
                </button>
              </form>
            </div>

            {/* Withdrawal History */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Withdrawal History</h3>
              {history.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FiDollarSign className="text-4xl mx-auto mb-2 opacity-50" />
                  <p>No withdrawal history yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Date</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Amount</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Note</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Processed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((withdrawal) => (
                        <tr key={withdrawal._id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm">
                            {new Date(withdrawal.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-sm font-medium">
                            {withdrawal.currency} {withdrawal.amount.toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(withdrawal.status)}
                              <span className={getStatusBadge(withdrawal.status)}>
                                {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {withdrawal.note || '-'}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {withdrawal.processedAt
                              ? new Date(withdrawal.processedAt).toLocaleDateString()
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
