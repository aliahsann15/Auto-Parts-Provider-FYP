"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useState } from 'react'
import Image from '@/app/components/AppImage'
import { useSession } from 'next-auth/react'

const StorePreviewPage: React.FC = () => {
  const { data: session } = useSession()
  const API_BASE = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:4001'
  const [store, setStore] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStore = async () => {
      try {
        const token = (session as any)?.backendToken || (session as any)?.accessToken
        const res = await fetch(`${API_BASE}/api/store/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        const data = await res.json()
        setStore(data.store)
      } catch {
        // ignore for preview
      } finally {
        setLoading(false)
      }
    }
    if (session) fetchStore()
  }, [session, API_BASE])

  if (loading) return <div className="p-8">Loading preview...</div>
  if (!store) return <div className="p-8">No store data</div>

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto bg-white rounded-lg shadow">
        <div className="relative w-full h-64 rounded-t-lg overflow-hidden bg-gray-200">
          {store.storeCoverImage && (
            <Image src={store.storeCoverImage} alt="Cover" fill className="object-cover" />
          )}
        </div>
        <div className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-black flex items-center justify-center">
              {store.storeProfileImage ? (
                <Image src={store.storeProfileImage} alt="Logo" width={80} height={80} className="object-cover" />
              ) : (
                <span className="text-white text-2xl font-bold">{(store.storeName || 'S').charAt(0)}</span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-black">{store.storeName}</h1>
              <p className="text-sm text-gray-600">{store.itemsSold || 0} Items sold • {store.reviewsCount || 0} Reviews</p>
            </div>
          </div>
          {store.storeBio && (
            <p className="mt-4 text-gray-700">{store.storeBio}</p>
          )}

          {/* Banners */}
          {store.storeBanners?.[0] && (
            <div className="mt-6 relative w-full h-48 rounded-lg overflow-hidden">
              <Image src={store.storeBanners[0]} alt="Banner" fill className="object-cover" />
            </div>
          )}
          {store.storeSalesBanners?.[0] && (
            <div className="mt-6 relative w-full h-48 rounded-lg overflow-hidden">
              <Image src={store.storeSalesBanners[0]} alt="Sales Banner" fill className="object-cover" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default StorePreviewPage
