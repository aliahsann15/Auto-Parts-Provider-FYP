/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect } from 'react'
import {
    FiChevronDown,
} from 'react-icons/fi'
import Image from '@/app/components/AppImage';
import { toast } from 'sonner';

type Session = {
    backendToken?: string
    accessToken?: string
    user?: {
        _id?: string
        id?: string
    }
}
interface Props {
    Session: Session | null
}


function Cancellations(props: Props) {

    const [cancelledOrdersState, setCancelledOrdersState] = useState<any[]>([])
    const [expandedOrder, setExpandedOrder] = useState<number | null>(null)

    const session = props.Session
    const token = session?.backendToken || session?.accessToken;
    const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "http://localhost:4001").replace(/\/$/, "")
    const userId = session?.user?._id ?? session?.user?.id

    useEffect(() => {
        // fetch user orders (exclude cancelled/delivered)
        const fetchUserOrders = async () => {
            if (!token) return
            try {
                const res = await fetch(`${API_BASE}/api/orders/my-orders`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                    cache: 'no-store'
                })
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}))
                    console.error('fetchUserOrders failed', res.status, err)
                    toast.error('Failed to load orders')
                    return
                }
                const data = await res.json().catch(() => null)
                const orders = data?.orders ?? data ?? []
                // only keep active (not Cancelled and not Delivered)
                const cancelled = orders.filter((order: any) => {
                    const s = (order?.status ?? '').toString().toLowerCase()
                    return s === 'cancelled'
                })
                setCancelledOrdersState(cancelled)
            } catch (err) {
                console.error("Failed to fetch user orders:", err)
                toast.error('Failed to load orders')
            }
        }
        fetchUserOrders()
    }, [token, API_BASE, session, userId]) // removed ordersState to avoid re-fetch loop


    return (
        <main className="w-[82.8%] p-6 bg-gray-100">
            <h1 className="text-2xl font-bold text-black mb-6">My Cancellations</h1>

            {cancelledOrdersState.length === 0 ? (
                <p className="text-gray-600 text-center mt-[calc(50vh-100px)] -translate-y-1/2">You have no cancelled orders.</p>
            ) : (
                <div className="space-y-4">
                    {cancelledOrdersState.map((order, index) => {
                        // safe derived values
                        const orderDate = order?.createdAt
                            ? new Date(order.createdAt).toLocaleDateString()
                            : order?.orderDate
                                ? new Date(order.orderDate).toLocaleDateString()
                                : ''
                        const totalAmount = Number(order?.totalAmount ?? order?.orderAmount ?? 0)
                        return (
                            <div key={order._id ?? index} className="bg-white  rounded-lg shadow p-6">
                                {/* Header row */}
                                <div className="w-full flex flex-col md:flex-row md:items-center md:justify-between gap-3">

                                    <p><span className="font-semibold text-black">Order #:</span> {order?.orderNumber ?? order?._id ?? '-'}</p>
                                    <p><span className="font-semibold text-black">Date:</span> {orderDate || '-'}</p>

                                    <p><span className="font-semibold text-black">Total:</span> PKR {totalAmount.toLocaleString()}</p>
                                    
                                    <button
                                        onClick={() =>
                                            setExpandedOrder(expandedOrder === index ? null : index)
                                        }
                                        className="flex items-center text-[#FFA500] text-sm font-semibold hover:underline"
                                    >
                                        Show Details
                                        <FiChevronDown
                                            className={`ml-1 transition-transform duration-300 ${expandedOrder === index ? "rotate-180" : ""}`}
                                        />
                                    </button>
                                </div>

                                {/* Collapsible details */}
                                {expandedOrder === index && (
                                    <div className="mt-6 border-t border-gray-200 pt-4">
                                        <div className="grid grid-cols-1 md:grid-cols-4 text-black text-sm font-semibold mb-4">

                                            <span>Product</span>
                                            <span className="text-center">Quantity</span>
                                            <span className="text-center">Price</span>
                                            <span className="text-end">Total</span>
                                        </div>
                                        {(order.items || []).map((item: any, idx: number) => {
                                            const qty = Number(item.quantity ?? 1)
                                            const priceNum = Number(item.price ?? item.salePrice ?? 0)
                                            const itemTotal = priceNum * qty
                                            const imgSrc = item.image ?? item.product?.images?.[0] ?? '/images/placeholder.png'
                                            const itemName = item.name ?? item.product?.name ?? ''
                                            return (
                                                <div
                                                    key={item.product?._id ?? idx}
                                                    className="grid grid-cols-1 md:grid-cols-4 items-center text-sm py-4 border-t border-gray-200 gap-4"
                                                >
                                                    {/* 📦 Product Image + Name */}
                                                    <div className="flex items-center gap-3">
                                                        <Image
                                                            src={imgSrc}
                                                            alt={itemName}
                                                            width={50}
                                                            height={50}
                                                            className="rounded-md object-cover border"
                                                        />
                                                        <span className="text-black font-medium">{itemName}</span>
                                                    </div>

                                                    {/* 🔢 Quantity */}
                                                    <span className="text-center">{qty}</span>

                                                    {/* 💸 Price */}
                                                    <span className='text-center'>PKR {priceNum.toLocaleString()}</span>

                                                    {/* 📊 Total */}
                                                    <span className="text-end font-medium text-black">
                                                        PKR {itemTotal.toLocaleString()}
                                                    </span>
                                                </div>
                                            )
                                        })}


                                        {/* Order Again Button */}
                                        <div className="mt-6 flex justify-end gap-3">
                                            <button
                                                className="bg-[#FFA500] text-white px-4 py-2 rounded hover:bg-orange-600 transition"
                                                onClick={() => toast('Order again not implemented')}
                                            >
                                                Order Again
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </main>
    )
}

export default Cancellations
