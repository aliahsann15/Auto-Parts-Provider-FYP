'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  FiUser,           // Profile
  FiLock,           // Change Password
  FiPackage,        // My Orders
  FiCornerUpLeft,   // My Returns
  FiXCircle,        // My Cancellations
  FiHeart,          // My Wishlist
  FiLogOut,
  FiHelpCircle,         // Requests
} from 'react-icons/fi'
import Image from '@/app/components/AppImage'
import Profile from './tabs/Profile';
import Password from "./tabs/Password"
import Orders from "./tabs/Orders"
import Returns from './tabs/Returns';
import Cancellations from "./tabs/Cancellations"
import Wishlist from "./tabs/Wishlist"
import Requests from './tabs/Requests';


const BuyerDashboard: React.FC = () => {
  const router = useRouter()
  const pathname = usePathname()
  const { status, data: session } = useSession()
  const [selectedTab, setSelectedTab] = useState<string>('profile')
  const [user, setUser] = useState<any>(null)

  // redirect unauthenticated users to login with callback back to this page
  useEffect(() => {
    if (status === 'unauthenticated') {
      const cb = pathname || '/buyer/dashboard'
      router.replace(`/login?callbackUrl=${encodeURIComponent(cb)}`)
    }
  }, [status, router, pathname])

  const token = session?.backendToken || session?.accessToken
  const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:4001').replace(/\/$/, '')
  const userId =
    (session?.user as { _id?: string; id?: string } | undefined)?._id ??
    (session?.user as { _id?: string; id?: string } | undefined)?.id ??
    null

  // fetch data (kept as-is)
  useEffect(() => {
    // fetch user data (kept as-is)
    const fetchUserData = async () => {
      if (!token || !userId) return
      try {
        const res = await fetch(`${API_BASE}/api/user/${encodeURIComponent(userId)}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        })
        if (!res.ok) return
        const data = await res.json().catch(() => null)
        const user = data?.user ?? null
        if (!user) return
        setUser(user)
      } catch (err) {
        console.error("Failed to fetch user data:", err)
      }
    }

    fetchUserData()
  }, [token, API_BASE, session, userId]) // removed profileImage, email, phone, address fields

  // block rendering until authenticated (prevents flash)
  if (status !== 'authenticated') return null
  
  function handleSidebarLinksClick(key: string) {
    if (key === "logout") {
      signOut({ redirect: false }).then(() => {
        router.push("/");
      });
      return;
    }
    setSelectedTab(key)
  }


  return (
    <div className='flex'>
      {/* Sidebar Navigations */}

      <aside className="sticky top-0 w-[20%] min-w-[240px] bg-white shadow-md hidden md:block px-4 pt-8 pb-8">
        <nav className="pb-8">
          <ul className="space-y-2">
            {[
              { key: 'profile', label: 'Profile', icon: <FiUser />, visible: true },
              { key: 'password', label: 'Change Password', icon: <FiLock />, visible: true },
              { key: 'orders', label: 'My Orders', icon: <FiPackage />, visible: true },
              { key: 'returns', label: 'My Returns', icon: <FiCornerUpLeft />, visible: true },
              { key: 'cancellations', label: 'My Cancellations', icon: <FiXCircle />, visible: true },
              { key: 'requests', label: 'My Requests', icon: <FiHelpCircle />, visible: true },
              { key: 'wishlist', label: 'My Wishlist', icon: <FiHeart />, visible: true },
              { key: 'logout', label: 'Logout', icon: <FiLogOut />, visible: true }
            ].map((item) => (
              // Section: Sidebar Item Starts Here
              <li
                key={item.key}
                className={`group flex items-center p-4 rounded hover:bg-[#ffa500] cursor-pointer ${selectedTab === item.key ? "bg-[#ffa500]" : ""}`}
                onClick={() => handleSidebarLinksClick(item.key)}
              >
                <span className={`mr-3 text-lg text-gray-700 group-hover:text-white ${selectedTab === item.key ? "text-white" : ""}`}>
                  {item.icon}
                </span>
                <span className={`text-gray-700 group-hover:text-white ${selectedTab === item.key ? "text-white" : ""}`}>
                  {item.label}
                </span>
              </li>
              // Section: Sidebar Item Ends Here
            ))}
          </ul>
        </nav>
        <div className="relative rounded-2xl overflow-hidden px-2.5 py-5 w-full  flex flex-col items-center justify-center">
          {/* Background image covering the entire card */}
          <div className="absolute inset-0">
            <Image
              src="/images/SellerDashboardBackground.png"  // ✔️ Replace with your background image path
              alt="Support Background"
              layout="fill"
              objectFit="cover"
              objectPosition="center"
              className=""
            />
          </div>

          {/* Content wrapper to keep text/buttons above the bg image */}
          <div className="relative z-10 flex flex-col items-center text-center text-white px-4">
            {/* Logo at the top */}
            <div className="mb-4">
              <Image
                src="/images/logo-black.png"       // ✔️ Replace with your logo path
                alt="Auto Parts Provider Logo"
                width={120}
                height={120}
              />
            </div>

            {/* Main title */}
            <h2 className="text-xl font-bold mb-1">
              Get Support & Guidance
            </h2>

            {/* Subtitle/description */}
            <p className="mb-4 text-sm">
              Get access to all features on tetumbas
            </p>

            {/* Call-to-action button */}
            <button
              type="button"
              className="bg-white text-[15px] text-[#FFA500] font-[300] py-2 px-6 rounded-md shadow-md hover:shadow-lg transition"
            >
              Get a Call
            </button>
          </div>
        </div>

      </aside>

      {selectedTab === 'profile' && (<Profile Session={session} UserData={user} />)}

      {selectedTab === 'password' && (<Password Session={session} />)}

      {selectedTab === 'orders' && ( <Orders Session={session} /> )}

      {selectedTab === 'returns' && (<Returns Session={session} />)}

      {selectedTab === 'cancellations' && (<Cancellations Session={session} />)}

      {selectedTab === 'requests' && (<Requests Session={session} />)}

      {selectedTab === 'wishlist' && (<Wishlist />)}

    </div>
  );
};

export default BuyerDashboard;
