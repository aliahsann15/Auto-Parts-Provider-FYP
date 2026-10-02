'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useRef, useEffect } from 'react'; // React core + hooks
// import Image from 'next/image';                              // Next.js image optimization
import { FiBell } from 'react-icons/fi';                     // Bell icon
import { FaBox, FaPuzzlePiece, FaBullhorn } from 'react-icons/fa6'; // Notification icons
import { FaShoppingCart } from 'react-icons/fa';             // Shopping cart icon
import { useSession } from 'next-auth/react';                // Get session and token
import { toast } from 'sonner';                              // Toast notifications

// 1️⃣ Define the shape of a notification
interface Notification {
  _id: string;
  title: string;
  description?: string;
  type: 'message' | 'order' | 'promo' | 'system';
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

interface NotificationDropdownProps {
  unreadCount?: number;
  onCountChange?: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ unreadCount = 0, onCountChange }) => {
  // 2️⃣ isOpen tracks whether the dropdown is visible
  const [isOpen, setIsOpen] = useState(false);
  // 3️⃣ dropdownRef lets us detect clicks outside the menu to auto-close it
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Session and notifications state
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  // Get API base URL
  const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "http://localhost:4001").replace(/\/$/, "");
  const token = session?.backendToken || session?.accessToken;

  // Calculate unread count
  // const unreadCount = notifications.filter(n => !n.isRead).length;

  // Fetch notifications from backend
  const fetchNotifications = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/notifications`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        console.error('Failed to fetch notifications');
        return;
      }

      const data = await res.json();
      setNotifications(data.items || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  // Format time ago helper
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const secondsDiff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (secondsDiff < 60) return 'Just now';
    if (secondsDiff < 3600) return `${Math.floor(secondsDiff / 60)}m ago`;
    if (secondsDiff < 86400) return `${Math.floor(secondsDiff / 3600)}h ago`;
    return `${Math.floor(secondsDiff / 86400)}d ago`;
  };

  // Render icon based on notification type
  const renderIcon = (type: string) => {
    const iconClass = 'h-5 w-5 text-[#ffa500]';
    const containerClass = 'flex items-center justify-center h-8 w-8 rounded-full flex-shrink-0 mr-3';
    
    switch (type) {
      case 'order':
        return (
          <div className={`${containerClass} `}>
            <FaShoppingCart className={iconClass} />
          </div>
        );
      case 'request':
        return (
          <div className={`${containerClass} border-[#ffa500]`}>
            <FaPuzzlePiece className={iconClass} />
          </div>
        );
      case 'promo':
        return (
          <div className={`${containerClass} bg-purple-500`}>
            <FaBullhorn className={iconClass} />
          </div>
        );
      case 'message':
        return (
          <div className={`${containerClass} bg-orange-500`}>
            <FaBox className={iconClass} />
          </div>
        );
      default:
        return (
          <div className={`${containerClass} bg-gray-500`}>
            <FiBell className={iconClass} />
          </div>
        );
    }
  };

  // Mark single notification as read
  const markAsRead = async (notificationId: string) => {
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        console.error('Failed to mark notification as read');
        return;
      }

      // Update local state
      setNotifications((prev) => {
        const updated = prev.map((n) =>
          n._id === notificationId ? { ...n, isRead: true } : n
        );
        // Call parent callback to refetch count
        if (onCountChange) {
          onCountChange();
        }
        return updated;
      });
      toast.success('Notification marked as read');
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/notifications/mark-all-read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        console.error('Failed to mark all notifications as read');
        return;
      }

      // Update local state
      const updated = notifications.map((n) => ({ ...n, isRead: true }));
      setNotifications(updated);
      
      // Call parent callback to refetch count
      if (onCountChange) {
        onCountChange();
      }
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen && token) {
      fetchNotifications();
    }
  }, [isOpen, token]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    // 6️⃣ Wrap everything so we can position the dropdown relative to this
    <div className="relative" ref={dropdownRef}>
      {/* 7️⃣ Bell button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        aria-label="Toggle notifications"
        className="cursor-pointer relative focus:outline-none"
      >
        <FiBell className="text-2xl" />
        {/* 8️⃣ Unread count badge */}
        {unreadCount > 0 && (
          <span className="bg-[#ffa500] text-white absolute -top-2 -right-2 rounded-full text-[12px] px-2">
            {unreadCount}
          </span>
        )}
      </button>

      {/* 9️⃣ Dropdown panel */}
      <div
        className={
          `absolute right-0 mt-2 w-80 rounded-lg bg-white shadow-[0_0_10px_rgba(0,0,0,0.15)] z-50 transform transition-all origin-top-right
           ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`
        }
      >
        {/* 🔟 Header */}
        <div className="rounded-tl-lg rounded-tr-lg px-4 py-2 bg-[#ffa500] border-b border-gray-200">
          <h4 className="font-semibold text-white">Notification</h4>
        </div>

        {/* 1️⃣1️⃣ Notification list (max 5 unread) */}
        <ul className="max-h-70 overflow-y-auto">
          {loading ? (
            <li className="border-b border-gray-200 px-4 py-4 text-center text-gray-600">
              Loading notifications...
            </li>
          ) : notifications.filter(n => !n.isRead).length === 0 ? (
            <li className="border-b border-gray-200 px-4 py-4 text-center text-gray-600">
              No new notifications
            </li>
          ) : (
            notifications.filter(n => !n.isRead).slice(0, 5).map(item => (
              <li
                key={item._id}
                className="border-b border-gray-200 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer bg-orange-50"
                onClick={() => markAsRead(item._id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start flex-1">
                    {/* Icon */}
                    {renderIcon(item.type)}
                    <div className="flex-1">
                      {/* Title */}
                      <p className="text-sm font-medium text-gray-900">
                        {item.title}
                      </p>
                      {/* Description */}
                      {item.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {item.description}
                        </p>
                      )}
                      {/* Timestamp */}
                      <p className="text-xs text-gray-400 mt-1">
                        {formatTimeAgo(item.createdAt)}
                      </p>
                    </div>
                  </div>
                  {/* Unread indicator dot */}
                  <div className="ml-2 w-2 h-2 bg-[#ffa500] rounded-full flex-shrink-0 mt-1" />
                </div>
              </li>
            ))
          )}
        </ul>

        {/* 1️⃣2️⃣ "Mark all as read" button */}
        <div className="rounded-bl-lg rounded-br-lg bg-[#ffa500] px-4 py-2 border-t border-gray-200 text-center">
          <button
            onClick={() => markAllAsRead()}
            className="text-sm font-medium text-white hover:underline"
          >
            Mark all as read
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationDropdown;
