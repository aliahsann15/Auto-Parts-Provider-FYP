// ✅ components/seller/NotificationCard.tsx - Reusable Notification Component
'use client'

import React from 'react'
import Link from 'next/link'
import { FaBox, FaPuzzlePiece, FaBullhorn, FaBell } from 'react-icons/fa6'

export interface NotificationData {
  id: string
  type: 'order' | 'announcement' | 'request'
  title: string
  message: string
  createdAt: string // ISO date
  status: 'read' | 'unread'
  url: string
}

interface Props {
  notification: NotificationData
  showCheckbox?: boolean
  isSelected?: boolean
  onSelect?: (id: string) => void
}

const NotificationCard: React.FC<Props> = ({ notification, showCheckbox = false, isSelected = false, onSelect }) => {
  const renderIcon = (type: NotificationData['type']) => {
    const base = 'flex items-center justify-center h-9 w-9 rounded-full text-white shrink-0';
    const iconClass = 'h-4 w-4';
    switch (type) {
      case 'order':
        return (
          <div className={`${base} bg-blue-500`}>
            <FaBox className={iconClass} />
          </div>
        )
      case 'request':
        return (
          <div className={`${base} bg-green-500`}>
            <FaPuzzlePiece className={iconClass} />
          </div>
        )
      case 'announcement':
        return (
          <div className={`${base} bg-purple-500`}>
            <FaBullhorn className={iconClass} />
          </div>
        )
      default:
        return (
          <div className={`${base} bg-gray-400`}>
            <FaBell className={iconClass} />
          </div>
        )
    }
  }
  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const createdAt = new Date(dateString)
    const diffMs = now.getTime() - createdAt.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHr = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHr / 24)

    if (diffDay >= 7) {
      return createdAt.toLocaleDateString()
    } else if (diffDay >= 2) {
      return `${diffDay} days ago`
    } else if (diffDay === 1) {
      return 'Yesterday'
    } else if (diffHr >= 1) {
      return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`
    } else if (diffMin >= 1) {
      return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`
    } else {
      return 'Just now'
    }
  }



  return (
    <div
      className= "border border-gray-100 rounded-lg p-4 shadow-sm bg-white flex items-center justify-between transition "
    >
      <div className="flex items-start gap-4 flex-1">
        {showCheckbox && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect?.(notification.id)}
            className="mt-1 h-4 w-4 accent-[#FFA500]"
          />
        )}
        {renderIcon(notification.type)}
        <div>
          <h4 className="text-lg font-semibold text-gray-800 mt-[-3px] mb-1">{notification.title}</h4>
          <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{formatTimeAgo(notification.createdAt)}</span>
            <span
              className={`ml-4 px-2 py-0.5 text-xs rounded-full font-medium ${
                notification.status === 'unread'
                  ? 'bg-[#FFA500] text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              {notification.status === 'unread' ? 'Unread' : 'Read'}
            </span>
          </div>
        </div>
      </div>

      <Link
        href={notification.url}
        className="flex items-center gap-1 px-3 py-2 text-sm bg-[#FFA500] hover:bg-[#e59400] text-white rounded-lg transition"
      >
        Details
      </Link>
    </div>
  )
}

export default NotificationCard
