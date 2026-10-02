'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import SellerDashboardAside from '@/app/components/seller/seller-dasboard-aside';
import ManageUsers from '@/app/components/seller/seller-dasboard-manage-store-manager';
import React, { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';


const ManageUsersPage = () => {
  const { data: session } = useSession();
  const router = useRouter();

  // Check if user is a Store Manager - if so, deny access
  useEffect(() => {
    if (session && (session.user as any)?.role === 'StoreManager') {
      toast.error('Store Managers cannot manage other store managers')
      router.push('/seller/dashboard')
    }
  }, [session, router])

  return (
    <main className="flex min-h-screen">
      {/* Left: Sidebar (20%) */}
      <SellerDashboardAside />

      {/* Right: Manage Users (80%) */}
      <div className="w-[84%] bg-gray-50">
        <ManageUsers />
      </div>
    </main>
  );
};

export default ManageUsersPage;
