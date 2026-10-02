"use client"
import React from 'react';
import { FiPieChart, FiShoppingCart, FiDollarSign, FiBox, FiBarChart2, FiMessageCircle, FiSettings, FiLogOut, FiUsers, FiStar } from 'react-icons/fi';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

/**
 * 🔘 Compact sidebar for chat/messages page with icon-only navigation
 */
const SellerDashboardAsideChat: React.FC = () => {
    const router = useRouter()
    const { data: session } = useSession()

    // Check if user is a Store Manager
    const isStoreManager = session?.user?.role === 'StoreManager'

    const menuItems = [
        { icon: <FiPieChart />, link: "/seller/dashboard", show: true },
        { icon: <FiShoppingCart />, link: "/seller/orders", show: true },
        { icon: <FiBox />, link: "/seller/products", show: true },
        { icon: <FiUsers />, link: "/seller/store-managers", show: !isStoreManager },
        { icon: <FiStar />, link: "/seller/reviews", show: true },
        { icon: <FiBarChart2 />, link: "/seller/analytics/best-selling", show: true },
        { icon: <FiMessageCircle />, link: "/seller/messages", show: true },
        { icon: <FiDollarSign />, link: "/seller/withdraw", show: !isStoreManager },
        { icon: <FiSettings />, link: "/seller/settings/payment", show: !isStoreManager },
        { icon: <FiSettings />, link: "/seller/settings/profile", show: isStoreManager },
        { icon: <FiLogOut />, link: "/seller/logout", show: true },
    ]

    return (
        <aside className="bg-white shadow-md hidden md:block">
            <nav className="pt-2 pb-8">
                <ul className="space-y-2">
                    {menuItems.filter(item => item.show).map((item, idx) => (
                        <li key={idx}>
                            <Link 
                                onClick={() => {
                                    if (item.link === "/seller/logout") {
                                        signOut({ redirect: false }).then(() => {
                                            router.push('/');
                                        });
                                    }
                                }} 
                                className='group flex items-center p-4 rounded hover:bg-[#ffa500] cursor-pointer' 
                                href={item.link}
                            >
                                <span className="mr-2 text-lg text-gray-700 group-hover:text-white">
                                    {item.icon}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
    );
};

export default SellerDashboardAsideChat;