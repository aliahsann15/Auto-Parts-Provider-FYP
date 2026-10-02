'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import {
    FiShoppingCart,
    FiBox,
    FiBarChart2,
    FiMessageCircle,
} from 'react-icons/fi'
import ChatList, { SellerChatItem } from '@/app/components/chat/chat-list'
import OrderRequestsSection from '@/app/components/order-request/order-request-list'
import RecentOrders from '@/app/components/seller/seller-dasboard-order-list'
import SellerReviewlist from '@/app/components/review/seller-review-list'
import EachProductSalesChart from '@/app/components/seller/seller-dashboard-each-product-sales-chart'
import SalesChartFilter from '@/app/components/reports/sales-chart'
import SellerDashboardAside from '@/app/components/seller/seller-dasboard-aside'
import { useEffect, useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import Spinner from '@/app/components/global/spinner'
import { Order } from '@/types'
import { getSellerOrders, getSellerStats, SellerStats } from '@/lib/seller'
import { getPartsRequests } from '@/actions/partsRequest'
import Avatar from '@/app/components/global/avatar'
import { useRouter } from 'next/navigation'
import { io, Socket } from 'socket.io-client'
import { toast } from 'sonner'

export default function SellerDashboard() {

    const { data: session, status } = useSession();
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [stats, setStats] = useState<SellerStats>({ totalOrders: 0, pendingOrders: 0, earnings: 0, products: 0 });
    const [partsRequests, setPartsRequests] = useState<any[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [statsLoading, setStatsLoading] = useState(false);
    const [chatThreads, setChatThreads] = useState<SellerChatItem[]>([]);
    const [chatsLoading, setChatsLoading] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:4001').replace(/\/$/, '');

    const fetchRequestMeta = async (requestId: string, token: string) => {
        try {
            const res = await fetch(`${API_BASE}/api/parts-requests/${requestId}`, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                console.error('Failed to fetch request meta:', res.status, errData);
                return null;
            }
            const data = await res.json();
            return data?.item || null;
        } catch (err) {
            console.error('Error fetching request meta:', err);
            return null;
        }
    };

    useEffect(() => {
        if (status === "authenticated" && session) {
            const token = (session as any).backendToken || (session as any).accessToken;
            if (!token) return;
            getSellerOrders(token, setOrders, setOrdersLoading);
            getSellerStats(token, setStats, setStatsLoading)
            fetchChatThreads(token);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, session])

    const fetchChatThreads = async (token: string) => {
        setChatsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/chats/threads`, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                console.error('Failed to fetch chat threads:', res.status, errData);
                throw new Error('Failed to fetch chat threads');
            }
            const data = await res.json();
            console.log('Chat threads received:', data?.threads);
            const threads = data?.threads || [];

            const formattedThreads: SellerChatItem[] = threads.map((thread: any) => {
                const displayName = thread.requestName
                    || (thread.requestNumber ? `Request #${thread.requestNumber}` : '')
                    || thread.carName
                    || 'Unknown Request';

                return {
                    id: thread.requestId,
                    name: displayName,
                    avatar: '',
                    message: thread.lastMessage || (thread.lastImageUrl ? 'Sent an image' : 'No messages yet'),
                    time: thread.lastMessageTime ? new Date(thread.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
                    unreadCount: thread.unreadCount || 0,
                    isOnline: false,
                    buyerName: thread.buyerName,
                    requestName: thread.requestName || displayName,
                    requestNumber: thread.requestNumber,
                    carName: thread.carName,
                    companyName: thread.companyName,
                    lastImageUrl: thread.lastImageUrl,
                    lastMessage: thread.lastMessage,
                };
            });

            // Enrich any items that still have Unknown Request by fetching request meta
            const needEnrichment = formattedThreads.filter(t => !t.requestName || t.requestName === 'Unknown Request' || t.requestName === '');
            if (needEnrichment.length > 0) {
                const enriched = await Promise.all(formattedThreads.map(async (t) => {
                    if (t.requestName && t.requestName !== 'Unknown Request' && t.requestName !== '') return t;
                    const meta = await fetchRequestMeta(String(t.id), token);
                    if (!meta) return t;
                    const enrichedName = meta.partName || meta.carName || t.name || 'Request';
                    return { ...t, requestName: enrichedName, name: enrichedName, requestNumber: meta.requestNumber, carName: meta.carName, companyName: meta.companyName };
                }));
                setChatThreads(enriched);
            } else {
                setChatThreads(formattedThreads);
            }
        } catch (err) {
            console.error('Error fetching chat threads:', err);
            toast.error('Failed to load chats');
        } finally {
            setChatsLoading(false);
        }
    };



    useEffect(() => {
        const fetchPartsRequests = async () => {
            const result = await getPartsRequests(100);
            if (result.success) {
                setPartsRequests(result.items);
            }
        }
        fetchPartsRequests();
    }, [])

    // Setup socket connection for real-time updates
    useEffect(() => {
        if (status !== 'authenticated') return
        const token = (session as any)?.backendToken
        if (!token) return

        const socket = io(API_BASE.replace('/api', ''), {
            transports: ['websocket', 'polling'],
            auth: { token },
        })

        socketRef.current = socket

        socket.on('connect', () => {
            console.log('Seller dashboard socket connected')
        })

        // Listen for offer acceptance to refresh parts requests
        socket.on('offer:accepted', async (data: any) => {
            console.log('Offer accepted - refreshing parts requests:', data)
            // Refresh parts requests to remove completed ones
            const result = await getPartsRequests(100)
            if (result.success) {
                setPartsRequests(result.items)
            }
        })

        socket.on('disconnect', () => {
            console.log('Seller dashboard socket disconnected')
        })

        return () => {
            socket.disconnect()
        }
    }, [status, session, API_BASE])

    if (status !== "authenticated") {
        return <Spinner />
    }


    const formattedStats = {
        totalOrders: stats.totalOrders,
        pendingOrders: stats.pendingOrders,
        earnings: `PKR ${Number(stats.earnings || 0).toLocaleString()}`,
        products: stats.products,
    }

    const isLoading = ordersLoading || statsLoading

    const fullName = session.user.name || "";
    const [firstName, lastName] = fullName.split(' ');

    return (
        <div className="flex min-h-screen bg-gray-100">
            {/* Section: Sidebar Starts Here */}
            <SellerDashboardAside />
            {/* Section: Sidebar Ends Here */}

            {/* Section: Main Content Starts Here */}
            <div className="flex-1 p-6">
                {ordersLoading || statsLoading ? <div className='min-w-full min-h-full'><Spinner /></div> : (
                    <>
                        {/* Header */}
                        <header className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-semibold">Welcome, {session.user.name}</h2>
                                {session.user.role === 'StoreManager' && (
                                    <p className="text-sm text-gray-500 mt-1">Managing Store</p>
                                )}
                            </div>
                            <div className="flex items-center space-x-4">
                                <Avatar firstName={firstName} lastName={lastName} imageUrl={session.user.image || ""} />
                            </div>
                        </header>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            {isLoading ? (
                                Array.from({ length: 4 }).map((_, idx) => (
                                    <div
                                        key={idx}
                                        className="bg-white p-4 rounded-lg shadow-sm flex items-center animate-pulse"
                                    >
                                        {/* icon placeholder */}
                                        <div className="p-3 bg-gray-200 rounded-full mr-4"></div>
                                        {/* text placeholders */}
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                [
                                    {
                                        icon: <FiShoppingCart className="text-2xl text-[#ffa500]" />,
                                        label: "Total Orders",
                                        value: formattedStats.totalOrders,
                                    },
                                    {
                                        icon: <FiBox className="text-2xl text-[#ffa500]" />,
                                        label: "Products",
                                        value: formattedStats.products,
                                    },
                                    {
                                        icon: <FiBarChart2 className="text-2xl text-[#ffa500]" />,
                                        label: "Earnings",
                                        value: formattedStats.earnings,
                                    },
                                    {
                                        icon: <FiMessageCircle className="text-2xl text-[#ffa500]" />,
                                        label: "Pending Orders",
                                        value: formattedStats.pendingOrders,
                                    },
                                ].map((card, idx) => (
                                    <div
                                        key={idx}
                                        className="bg-white p-4 rounded-lg shadow-sm flex items-center"
                                    >
                                        <div className="p-3 bg-gray-100 rounded-full mr-4">
                                            {card.icon}
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">{card.label}</p>
                                            <p className="text-lg font-semibold">{card.value}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            {/* Chat Section */}
                            <div className="bg-white rounded-2xl p-6 shadow-sm">
                                {/* Section Title */}
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold">Recent Chats</h3>
                                    <button
                                        onClick={() => router.push('/seller/messages')}
                                        className="text-sm text-[#ffa500] hover:underline"
                                    >
                                        View All
                                    </button>
                                </div>
                                {chatsLoading ? (
                                    <div className="flex justify-center items-center h-[300px]">
                                        <Spinner />
                                    </div>
                                ) : chatThreads.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
                                        <FiMessageCircle className="text-4xl mb-2" />
                                        <p>No chats yet</p>
                                    </div>
                                ) : (
                                    <ChatList
                                        items={chatThreads}
                                        onSelect={() => router.push('/seller/messages')}
                                        activeChatId={null}
                                        maxHeight="max-h-[300px]"
                                        showRequestDetails={true}
                                    />
                                )}
                            </div>

                            {/* Order Requests Section */}
                            <div className="bg-white rounded-2xl p-6 shadow-sm">
                                {/* Section Title */}
                                <h3 className="text-lg font-semibold text-black mb-4">Parts Requests</h3>
                                <OrderRequestsSection requests={partsRequests} />
                            </div>
                        </div>
                        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            {/* Recent Order Section */}
                            <div className="bg-white rounded-2xl p-6 w-full shadow-sm">
                                {/* Section Title */}
                                <h3 className="text-lg font-semibold text-black mb-4">Recent Orders</h3>
                                <div className="overflow-y-auto max-h-[300px]">

                                    <RecentOrders orders={orders.slice(0, 5)} setOrders={setOrders} wrapperClass="w-5/5" />

                                </div>
                            </div>
                            {/* Recent Reviews Section */}
                            <div className="bg-white rounded-2xl p-6 w-full shadow-sm">
                                {/* Section Title */}
                                <h3 className="text-lg font-semibold text-black mb-4">Recent Reviews</h3>
                                <SellerReviewlist />
                            </div></div>
                        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            {/* Sales By Product Section */}
                            <div className="bg-white rounded-2xl p-6 w-full shadow-sm">
                                <SalesChartFilter />
                            </div>
                            {/* Sales By Duration Section */}
                            <div className="bg-white rounded-2xl p-6 w-full shadow-sm">

                                <h3 className="text-lg font-semibold text-black mb-4">Sales By Product</h3>
                                <EachProductSalesChart />
                            </div>

                        </div>
                    </>)}
            </div>
        </div>
    )
}