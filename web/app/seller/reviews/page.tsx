'use client'

import SellerReviewlist from '@/app/components/review/seller-review-list'
import SellerDashboardAside from '@/app/components/seller/seller-dasboard-aside'
import React from 'react'

const SellerReviewsPage = () => {
  return (
    <div className="flex min-h-screen">
      {/* 📌 Left Sidebar - 20% */}

      <SellerDashboardAside />


      {/* 📌 Right Review Section - 80% */}
      <main className="p-6 w-[80%] bg-gray-50">
        <h1 className="text-2xl font-bold text-black pb-6">Manage Reviews</h1>
        <SellerReviewlist tabView={true} />
      </main>
    </div>
  )
}

export default SellerReviewsPage
