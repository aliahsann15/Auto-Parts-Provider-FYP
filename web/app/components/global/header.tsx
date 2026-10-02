"use client"
import Image from "@/app/components/AppImage"
import { FiUser } from "react-icons/fi"
import NotificationDropdown from "../notification/buyer-notification-dropdown"
import CartSidePanel from "../cart/mini-cart"
import SearchOverlay from "../search/search-bar"
import Link from "next/link"
import { useSession } from "next-auth/react"
import Spinner from "./spinner"
import { useState, useEffect } from "react"


export default function Header() {

  const { data: session, status } = useSession()
  const [notificationCount, setNotificationCount] = useState({ unreadCount: 0, totalCount: 0 })

  // Fetch notification count
  const fetchNotificationCount = async () => {
    const token = session?.backendToken || session?.accessToken
    if (!token || status !== 'authenticated') {
      // Reset count when logged out
      setNotificationCount({ unreadCount: 0, totalCount: 0 })
      return
    }

    try {
      const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "http://localhost:4001").replace(/\/$/, "")

      const res = await fetch(`${API_BASE}/api/notifications/count`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })

      if (res.ok) {
        const data = await res.json()
        setNotificationCount({ unreadCount: data.unreadCount, totalCount: data.totalCount })
      }
    } catch (err) {
      console.error('Error fetching notification count:', err)
    }
  }

  // Fetch notification count on mount and when session changes
  useEffect(() => {
    if (status === 'authenticated') {
      fetchNotificationCount()
      // Refresh count every 30 seconds
      const interval = setInterval(fetchNotificationCount, 30000)
      return () => clearInterval(interval)
    } else {
      setNotificationCount({ unreadCount: 0, totalCount: 0 })
    }
  }, [session, status])

  return (
    <header>
      <div className="flex bg-white px-[60px] py-[30px]">
        <div className="w-1/5 flex flex-col items-start justify-center">
          <Link href="/">
            <Image height={51} width={130} alt="Logo" src="/images/logo.png" />
          </Link>
        </div>
        <div className="w-3/5 justify-center items-center flex flex-col">
          <ul className="flex gap-[28px]">
            <li className="navLinks"><Link href="/">Home</Link></li>
            {/* <li className="navLinks"><Link href="/tools">Tires and Wheels</Link></li>
            <li className="navLinks"><Link href="/tools">Accessories</Link></li> */}
            <li className="navLinks"><Link href="/tools">Tools</Link></li>
            <li className="navLinks"><Link href="/track-your-order">Order Tracking</Link></li>
            <li className="navLinks"><Link href="/about">About</Link></li>
            <li className="navLinks"><Link href="/tools">Customer Care</Link></li>
          </ul>
        </div>
        <div className="w-1/5 flex flex-col justify-center items-end mt-1">
          <ul className="flex justify-center gap-[18px]">
            <li><SearchOverlay /></li>
            {status === "authenticated" && (
              <li className="relative">
                <NotificationDropdown unreadCount={notificationCount.unreadCount} onCountChange={() => fetchNotificationCount()} />
              </li>
            )}
            <li className="relative">
              <CartSidePanel />
            </li>
            {status === "loading" ? <Spinner /> :
              <li>
                <Link
                  href={
                    session?.user.role === "Buyer" 
                      ? "/buyer/dashboard" 
                      : session?.user.role === "Seller" || session?.user.role === "StoreManager"
                      ? "/seller/dashboard" 
                      : "/login"
                  }
                  className="flex items-end justify-start gap-1"
                >
                  <FiUser className="text-2xl" />
                  <span className="font-semibold">
                    {session?.user.name ?
                      `Hi! ${session.user.name.split(" ")[0].length > 5 ?
                        session.user.name.split(" ")[0].substring(0, 5) + "..."
                        : session.user.name.split(" ")[0]}`
                      : "Login"}
                  </span>
                </Link>
              </li>
            }
          </ul>
        </div>
      </div>
    </header>)
}
