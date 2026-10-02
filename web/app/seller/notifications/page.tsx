// ✅ notifications/page.tsx - Seller Notifications Page
'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import NotificationCard from '@/app/components/notification/notification-card'
import SellerDashboardAside from '@/app/components/seller/seller-dasboard-aside'
import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { FaTrashAlt, FaCheck, FaCheckDouble } from 'react-icons/fa'

export type NotificationData = {
  id: string
  _id?: string
  type: 'order' | 'announcement' | 'request'
  title: string
  message: string
  createdAt: string
  status: 'read' | 'unread'
  url: string
  isRead?: boolean
}

const NotificationPage = () => {
  const { data: session } = useSession()
  const [statusFilter, setStatusFilter] = useState<'all' | 'read' | 'unread'>('all')
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const token = (session as any)?.backendToken || (session as any)?.accessToken
  const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:4001').replace(/\/$/, '')

  // Fetch notifications from backend
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!token) return
      setLoading(true)
      try {
        const res = await fetch(`${API_BASE}/api/notifications`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          cache: 'no-store',
        })
        if (!res.ok) {
          const err = await res.json().catch(() => null)
          throw new Error(err?.msg || 'Failed to fetch notifications')
        }
        const data = await res.json()
        const items = Array.isArray(data) ? data : data?.items || []
        const mapped: NotificationData[] = items.map((n: any) => ({
          id: n._id || n.id,
          _id: n._id,
          type: n.type || 'announcement',
          title: n.title || 'Notification',
          message: n.message || '',
          createdAt: n.createdAt || new Date().toISOString(),
          status: (n.isRead || n.read) ? 'read' : 'unread',
          url: n.url || '#',
          isRead: n.isRead || n.read,
        }))
        setNotifications(mapped)
      } catch (err: any) {
        console.error('Error fetching notifications:', err)
        toast.error(err?.message || 'Failed to load notifications')
      } finally {
        setLoading(false)
      }
    }
    fetchNotifications()
  }, [token, API_BASE])

  const filteredData =
    statusFilter === 'all'
      ? notifications
      : notifications.filter(n => n.status === statusFilter)

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const markSelectedAsRead = async () => {
    if (!token || selectedIds.length === 0) return
    try {
      const promises = selectedIds.map(id =>
        fetch(`${API_BASE}/api/notifications/${id}/read`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })
      )
      await Promise.all(promises)
      const updated: NotificationData[] = notifications.map(n =>
        selectedIds.includes(n.id) ? { ...n, status: 'read' as const } : n
      )
      setNotifications(updated)
      setSelectedIds([])
      toast.success('Marked as read')
    } catch (err: any) {
      console.error('Error marking as read:', err)
      toast.error('Failed to mark as read')
    }
  }

  const deleteSelected = async () => {
    if (!token || selectedIds.length === 0) return
    try {
      const promises = selectedIds.map(id =>
        fetch(`${API_BASE}/api/notifications/${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })
      )
      await Promise.all(promises)
      const updated = notifications.filter(n => !selectedIds.includes(n.id))
      setNotifications(updated)
      setSelectedIds([])
      toast.success('Notifications deleted')
    } catch (err: any) {
      console.error('Error deleting notifications:', err)
      toast.error('Failed to delete notifications')
    }
  }

  const markAllAsRead = async () => {
    if (!token) return
    try {
      const res = await fetch(`${API_BASE}/api/notifications/mark-all-read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
      if (!res.ok) throw new Error('Failed to mark all as read')
      const updated: NotificationData[] = notifications.map(n => ({ ...n, status: 'read' as const }))
      setNotifications(updated)
      setSelectedIds([])
      toast.success('All marked as read')
    } catch (err: any) {
      console.error('Error marking all as read:', err)
      toast.error('Failed to mark all as read')
    }
  }

  const handleSelectAll = (checked: boolean) => {
    const ids = filteredData.map(n => n.id)
    if (checked) {
      setSelectedIds(prev => Array.from(new Set([...prev, ...ids])))
    } else {
      setSelectedIds(prev => prev.filter(id => !ids.includes(id)))
    }
  }

  return (
    <div className="w-[100%] flex min-h-screen font-sans">
      {/* Left Side: Seller Aside */}
      <div className=" w-[20%] border-r border-gray-200">
        <SellerDashboardAside />
      </div>

      {/* Right Side: Notifications */}
      <div className="w-[100%] p-8 bg-[#f9fafb]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800 tracking-tight">Notifications</h2>
          <div className="flex gap-2">
            <button
              onClick={markSelectedAsRead}
              disabled={selectedIds.length === 0}
              className="flex bg-[#FFA500] text-white px-4 py-3 items-center gap-2 rounded-lg hover:bg-orange-600 transition disabled:opacity-50"
            >
              <FaCheckDouble className="text-base" /> Mark Selected Read
            </button>
            <button
              onClick={deleteSelected}
              disabled={selectedIds.length === 0}
              className="flex bg-[#FFA500] text-white px-4 py-3 items-center gap-2 rounded-lg hover:bg-orange-600 transition disabled:opacity-50"
            >
              <FaTrashAlt className="text-base" /> Delete Selected
            </button>
            <button
              onClick={markAllAsRead}
              className="flex bg-[#FFA500] text-white px-4 py-3 items-center gap-2 rounded-lg hover:bg-orange-600 transition"
            >
              <FaCheck className="text-base" /> Mark All Read
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-600">Loading notifications...</p>
        ) : notifications.length === 0 ? (
          <p className="text-gray-600">No notifications.</p>
        ) : (
          <>
            <div className='flex items-center justify-between mb-4'>
              {/* Status Filters */}
              <div className="flex gap-4 mb-6">
                {['all', 'read', 'unread'].map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status as any)}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold border ${
                      statusFilter === status
                        ? 'bg-[#FFA500] text-white shadow-sm'
                        : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
              {/* Select All Checkbox */}
              <div className="flex items-center mb-5">
                <input
                  type="checkbox"
                  checked={
                    filteredData.length > 0 &&
                    filteredData.every(n => selectedIds.includes(n.id))
                  }
                  onChange={e => handleSelectAll(e.target.checked)}
                  className="mr-3 h-4 w-4 accent-[#FFA500] border-gray-300 rounded"
                />
                <label className="text-sm font-medium text-[#ffa500]">Select All</label>
              </div>
            </div>
            <div className="space-y-4">
              {filteredData.map(notification => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  showCheckbox={true}
                  isSelected={selectedIds.includes(notification.id)}
                  onSelect={toggleSelect}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default NotificationPage