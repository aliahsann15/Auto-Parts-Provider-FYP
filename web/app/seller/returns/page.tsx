"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import SellerDashboardAside from '@/app/components/seller/seller-dasboard-aside'
import Spinner from '@/app/components/global/spinner'
import { toast } from 'sonner'
import Image from 'next/image'

const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:4000').replace(/\/$/, '')

type ReturnItem = {
  product: string
  name?: string
  image?: string
  quantity: number
  price: number
  total?: number
}

type ReturnDoc = {
  _id: string
  returnNumber: string
  order: { _id?: string; orderNumber?: string }
  user?: string
  seller?: string
  requestedAt: string
  refundAmount: number
  refundCurrency: string
  status: 'pending' | 'approved' | 'rejected' | 'refunded' | 'cancelled'
  items: ReturnItem[]
  reason?: string
  returnMethod?: string
  trackingId?: string
  notes?: string
}

export default function SellerReturnsPage() {
  const { data: session, status } = useSession()
  const [items, setItems] = useState<ReturnDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'authenticated') {
      fetchReturns()
    }
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchReturns = async () => {
    setLoading(true)
    try {
      const token = (session as any)?.backendToken || (session as any)?.accessToken
      const res = await fetch(`${API_BASE}/api/returns`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err?.msg || 'Failed to load returns')
        setItems([])
      } else {
        const data = await res.json().catch(() => [])
        setItems(Array.isArray(data) ? data : (data?.items || []))
      }
    } catch (e) {
      console.error('Failed to load returns', e)
      toast.error('Network error')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (id: string, status: ReturnDoc['status']) => {
    setUpdating(id)
    try {
      const token = (session as any)?.backendToken || (session as any)?.accessToken
      const res = await fetch(`${API_BASE}/api/returns/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err?.msg || 'Failed to update return')
        return
      }
      const updated = await res.json().catch(() => null)
      toast.success(`Return ${updated?.returnNumber || id} updated to ${status}`)
      setItems(prev => prev.map(r => (r._id === id ? { ...r, status } : r)))
    } catch (e) {
      console.error('Failed to update return', e)
      toast.error('Network error')
    } finally {
      setUpdating(null)
    }
  }

  if (status !== 'authenticated') return <Spinner />

  return (
    <div className="flex min-h-screen bg-gray-100">
      <SellerDashboardAside />
      <div className="flex-1 p-6">
        <h2 className="text-2xl font-semibold mb-4">Manage Returns</h2>
        {loading ? (
          <div className="flex justify-center items-center min-h-[300px]"><Spinner /></div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-lg p-6 text-center">No returns found</div>
        ) : (
          <div className="bg-white rounded-lg p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Return #</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Order</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Requested</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Items</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(r => (
                    <tr key={r._id} className="border-b align-top">
                      <td className="py-3 px-4 text-sm font-medium">{r.returnNumber}</td>
                      <td className="py-3 px-4 text-sm">{r.order?.orderNumber || '-'}</td>
                      <td className="py-3 px-4 text-sm">{new Date(r.requestedAt).toLocaleString()}</td>
                      <td className="py-3 px-4 text-sm">{r.refundCurrency} {Number(r.refundAmount || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          r.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                          r.status === 'refunded' ? 'bg-green-100 text-green-700' :
                          r.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                        }`}>{r.status}</span>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <div className="space-y-2">
                          {r.items.map((it, idx) => (
                            <div key={r._id+idx} className="flex items-center gap-2">
                              {it.image ? (
                                <Image src={it.image} alt={it.name || ''} width={32} height={32} className="rounded" />
                              ) : (
                                <div className="w-8 h-8 bg-gray-200 rounded" />
                              )}
                              <div className="flex-1">
                                <div className="text-sm font-medium">{it.name || 'Product'}</div>
                                <div className="text-xs text-gray-600">Qty {it.quantity} · PKR {Number(it.price||0).toLocaleString()}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="px-3 py-1 rounded border text-xs"
                            onClick={() => updateStatus(r._id, 'approved')}
                            disabled={updating === r._id || r.status !== 'pending'}
                          >{updating === r._id ? '...' : 'Approve'}</button>
                          <button
                            className="px-3 py-1 rounded border text-xs"
                            onClick={() => updateStatus(r._id, 'rejected')}
                            disabled={updating === r._id || r.status !== 'pending'}
                          >Reject</button>
                          <button
                            className="px-3 py-1 rounded bg-green-600 text-white text-xs"
                            onClick={() => updateStatus(r._id, 'refunded')}
                            disabled={updating === r._id || (r.status !== 'approved' && r.status !== 'pending')}
                          >Mark Refunded</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
