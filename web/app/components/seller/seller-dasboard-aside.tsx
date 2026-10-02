"use client"
import React, { useEffect, useState } from 'react';
import {
  FiPieChart,
  FiShoppingCart,
  FiBox,
  FiBarChart2,
  FiMessageCircle,
  FiSettings,
  FiLogOut,
  FiUsers,
  FiStar,
  FiDollarSign,
} from 'react-icons/fi';
import Image from '@/app/components/AppImage';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
/**
 * 🔘 Sidebar for the Seller Dashboard, with main links and sub-menus
 */
const SellerDashboardAside: React.FC = () => {
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()

  // Check if user is a Store Manager
  const isStoreManager = session?.user?.role === 'StoreManager'


  useEffect(() => {
    setAnalyticsOpen(pathname.startsWith('/seller/analytics'));
    setSettingsOpen(pathname.startsWith('/seller/settings'));
  }, [pathname]);

  const linkClasses = (href: string) =>
    `block p-2 rounded text-sm ${pathname === href
      ? 'bg-[#ffa500] text-white'
      : 'text-gray-600 hover:bg-[#ffa500]/50 hover:text-white'
    }`;

  return (
    // Sticky sidebar container
    <div className="sticky top-0 w-[20%] min-w-[240px] bg-white shadow-md hidden md:block px-4 pt-8 pb-8">

      {/* Main navigation */}
      <nav className="pb-8">
        <ul className="space-y-2">

          {/* Dashboard link */}
          <li>
            <Link
              href="/seller/dashboard"
              className={`group flex items-center p-4 rounded cursor-pointer ${pathname === '/seller/dashboard'
                  ? 'bg-[#ffa500] text-white'
                  : 'hover:bg-[#ffa500] text-gray-700 hover:text-white'
                }`}
            >
              <FiPieChart className={`mr-3 text-lg ${pathname === '/seller/dashboard' ? 'text-white' : 'text-gray-700 group-hover:text-white'
                }`} />
              <span>Dashboard</span>
            </Link>
          </li>

          {/* Orders link */}
          <li>
            <Link
              href="/seller/orders"
              className={`group flex items-center p-4 rounded cursor-pointer ${pathname === '/seller/orders'
                  ? 'bg-[#ffa500] text-white'
                  : 'hover:bg-[#ffa500] text-gray-700 hover:text-white'
                }`}
            >
              <FiShoppingCart className={`mr-3 text-lg ${pathname === '/seller/orders' ? 'text-white' : 'text-gray-700 group-hover:text-white'
                }`} />
              <span>Orders</span>
            </Link>
          </li>

          {/* Returns link */}
          <li>
            <Link
              href="/seller/returns"
              className={`group flex items-center p-4 rounded cursor-pointer ${pathname === '/seller/returns'
                  ? 'bg-[#ffa500] text-white'
                  : 'hover:bg-[#ffa500] text-gray-700 hover:text-white'
                }`}
            >
              <FiShoppingCart className={`mr-3 text-lg ${pathname === '/seller/returns' ? 'text-white' : 'text-gray-700 group-hover:text-white'
                }`} />
              <span>Returns</span>
            </Link>
          </li>

          {/* Products link */}
          <li>
            <Link
              href="/seller/products"
              className={`group flex items-center p-4 rounded cursor-pointer ${pathname === '/seller/products'
                  ? 'bg-[#ffa500] text-white'
                  : 'hover:bg-[#ffa500] text-gray-700 hover:text-white'
                }`}
            >
              <FiBox className={`mr-3 text-lg ${pathname === '/seller/products' ? 'text-white' : 'text-gray-700 group-hover:text-white'
                }`} />
              <span>Products</span>
            </Link>
          </li>

          {/* Store Managers link - HIDDEN FOR STORE MANAGERS */}
          {!isStoreManager && (
            <li>
              <Link
                href="/seller/store-managers"
                className={`group flex items-center p-4 rounded cursor-pointer ${pathname === '/seller/store-managers'
                    ? 'bg-[#ffa500] text-white'
                    : 'hover:bg-[#ffa500] text-gray-700 hover:text-white'
                  }`}
              >
                <FiUsers className={`mr-3 text-lg ${pathname === '/seller/store-managers' ? 'text-white' : 'text-gray-700 group-hover:text-white'
                  }`} />
                <span>Store Managers</span>
              </Link>
            </li>
          )}

          {/* Reviews link */}
          <li>
            <Link
              href="/seller/reviews"
              className={`group flex items-center p-4 rounded cursor-pointer ${pathname === '/seller/reviews'
                  ? 'bg-[#ffa500] text-white'
                  : 'hover:bg-[#ffa500] text-gray-700 hover:text-white'
                }`}
            >
              <FiStar className={`mr-3 text-lg ${pathname === '/seller/reviews' ? 'text-white' : 'text-gray-700 group-hover:text-white'
                }`} />
              <span>Reviews</span>
            </Link>
          </li>

          {/* Analytics link with submenu */}
          <li>
            <div
              // toggle open/close on click
              onClick={() => setAnalyticsOpen(open => !open)}
              className={`group flex items-center p-4 rounded cursor-pointer ${pathname.startsWith('/seller/analytics')
                  ? 'bg-[#ffa500] text-white'
                  : 'hover:bg-[#ffa500] text-gray-700 hover:text-white'
                }`}
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setAnalyticsOpen(open => !open);
                }
              }}
            >
              <FiBarChart2 className={`mr-3 text-lg ${pathname.startsWith('/seller/analytics') ? 'text-white' : 'text-gray-700 group-hover:text-white'
                }`} />
              <a role='button' className="flex-1">
                Analytics
              </a>
            </div>
            {/* Only show when analyticsOpen is true */}
            {analyticsOpen && (
              <ul className="ml-6 mt-1 pl-2 space-y-1">
                <li>
                  <Link
                    href="/seller/analytics/best-selling"
                    className={linkClasses('/seller/analytics/best-selling')}
                  >
                    Best Selling Products
                  </Link>
                </li>
                <li>
                  <Link
                    href="/seller/analytics/sales-report"
                    className={linkClasses('/seller/analytics/sales-report')}
                  >
                    Sales Report by Duration
                  </Link>
                </li>
              </ul>
            )}
          </li>

          {/* Messages link */}
          <li>
            <Link
              href="/seller/messages"
              className={`group flex items-center p-4 rounded cursor-pointer ${pathname === '/seller/messages'
                  ? 'bg-[#ffa500] text-white'
                  : 'hover:bg-[#ffa500] text-gray-700 hover:text-white'
                }`}
            >
              <FiMessageCircle className={`mr-3 text-lg ${pathname === '/seller/messages' ? 'text-white' : 'text-gray-700 group-hover:text-white'
                }`} />
              <span>Messages</span>
            </Link>
          </li>

          {/* Withdraw link */}
          {!isStoreManager && (
            <li>
              <Link
                href="/seller/withdraw"
                className={`group flex items-center p-4 rounded cursor-pointer ${pathname === '/seller/withdraw'
                    ? 'bg-[#ffa500] text-white'
                    : 'hover:bg-[#ffa500] text-gray-700 hover:text-white'
                  }`}
              >
                <FiDollarSign className={`mr-3 text-lg ${pathname === '/seller/withdraw' ? 'text-white' : 'text-gray-700 group-hover:text-white'
                  }`} />
                <span>Withdraw</span>
              </Link>
            </li>
          )}

          {/* Settings link with submenu */}
          <li>
            <div
              onClick={() => setSettingsOpen(v => !v)}
              className={`group flex items-center p-4 rounded cursor-pointer ${pathname.startsWith('/seller/settings')
                  ? 'bg-[#ffa500] text-white'
                  : 'hover:bg-[#ffa500] text-gray-700 hover:text-white'
                }`}
            >
              <FiSettings className={`mr-3 text-lg ${pathname.startsWith('/seller/settings') ? 'text-white' : 'text-gray-700 group-hover:text-white'
                }`} />
              <span className="flex-1">Settings</span>
            </div>
            {settingsOpen && (
              <ul className="ml-6 mt-1 space-y-1">
                {/* Payment option - HIDDEN FOR STORE MANAGERS */}
                {!isStoreManager && (
                  <li>
                    <Link
                      href="/seller/settings/payment"
                      className={linkClasses('/seller/settings/payment')}
                    >
                      Payment
                    </Link>
                  </li>
                )}
                <li>
                  <Link
                    href="/seller/settings/profile"
                    className={linkClasses('/seller/settings/profile')}
                  >
                    Profile
                  </Link>
                </li>
                <li>
                  <Link
                    href="/seller/edit-store"
                    className={linkClasses('/seller/settings/edit-store')}
                  >
                    Edit Store
                  </Link>
                </li>
              </ul>
            )}
          </li>

          {/* Logout action */}
          <li>
            <div
              onClick={() => {
                signOut({ redirect: false }).then(() => {
                  router.push('/');
                });
              }}
              className="group flex items-center p-4 rounded hover:bg-[#ffa500] cursor-pointer"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  signOut({ redirect: false }).then(() => {
                    router.push('/');
                  });
                }
              }}
            >
              <FiLogOut className="mr-3 text-lg text-gray-700 group-hover:text-white" />
              <span className="text-gray-700 group-hover:text-white">Logout</span>
            </div>
          </li>

        </ul>
      </nav>

      {/* Support & guidance card */}
      <div className="relative rounded-2xl overflow-hidden px-2.5 py-5 w-full flex flex-col items-center justify-center">
        {/* Background image */}
        <div className="absolute inset-0">
          <Image
            src="/images/SellerDashboardBackground.png"
            alt="Support Background"
            layout="fill"
            objectFit="cover"
            objectPosition="center"
          />
        </div>
        {/* Overlay content */}
        <div className="relative z-10 flex flex-col items-center text-center text-white px-4">
          <div className="mb-4">
            <Image
              src="/images/logo-black.png"
              alt="Auto Parts Provider Logo"
              width={120}
              height={120}
            />
          </div>
          <h2 className="text-xl font-bold mb-1">Get Support & Guidance</h2>
          <p className="mb-4 text-sm">Get access to all features on tetumbas</p>
          <button
            type="button"
            className="bg-white text-[15px] text-[#FFA500] font-[300] py-2 px-6 rounded-md shadow-md hover:shadow-lg transition"
          >
            Get a Call
          </button>
        </div>
      </div>

    </div>
  );
};

export default SellerDashboardAside;
