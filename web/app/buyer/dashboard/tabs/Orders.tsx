/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect } from 'react'
import {
    FiChevronDown,
} from 'react-icons/fi'
import Image from '@/app/components/AppImage';
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Props {
    Session?: any;
}

function Orders(props: Props) {

    const [ordersState, setOrdersState] = useState<any[]>([])
    const [expandedOrder, setExpandedOrder] = useState<number | null>(null)
    const [cancellingIndex, setCancellingIndex] = useState<number | null>(null)
    const [showReturnModal, setShowReturnModal] = useState(false)
    const [showReviewModal, setShowReviewModal] = useState(false)
    const [returnOrder, setReturnOrder] = useState<any | null>(null)
    const [selectedReturnItems, setSelectedReturnItems] = useState<Record<string, number>>({})
    const [returnReason, setReturnReason] = useState<string>('')
    const [returnMethod, setReturnMethod] = useState<string>('Courier Pickup')
    const [submittingReturn, setSubmittingReturn] = useState(false)
    const [reviewItems, setReviewItems] = useState<any[]>([])
    const [reviewRatings, setReviewRatings] = useState<Record<string, number>>({})
    const [reviewComments, setReviewComments] = useState<Record<string, string>>({})
    const [submittingReview, setSubmittingReview] = useState(false)
    const router = useRouter()

    const session = props.Session;
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
                const active = orders.filter((order: any) => {
                    const s = (order?.status ?? '').toString().toLowerCase()
                    return s !== 'cancelled'
                })
                setOrdersState(active)
            } catch (err) {
                console.error("Failed to fetch user orders:", err)
                toast.error('Failed to load orders')
            }
        }
        fetchUserOrders()
    }, [token, API_BASE, session, userId]) // removed ordersState to avoid re-fetch loop

    // Move cancel logic to a separate outer function
    const handleCancelOrder = async (orderId: string | undefined, index: number) => {
        if (!orderId) {
            toast.error('Invalid order id')
            return
        }

        const order = ordersState[index]
        if (!order) {
            toast.error('Order not found')
            return
        }

        if ((order.status ?? '').toString().toLowerCase() === 'cancelled') {
            toast.error('Order already cancelled')
            return
        }

        // optimistic UI: mark as cancelling
        const prev = [...ordersState]
        setCancellingIndex(index)

        try {
            const res = await fetch(`${API_BASE}/api/orders/${orderId}/cancel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: 'Cancelled' }),
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                toast.error(err?.msg ?? err?.message ?? `Failed (${res.status})`)
                return
            }
            const data = await res.json().catch(() => ({}))
            // remove cancelled order from My Orders list
            setOrdersState((prevOrders) => prevOrders.filter(o => String(o._id) !== String(orderId)))
        
            toast.success(data?.message ?? 'Order cancelled')
        } catch (err) {
            // rollback to previous UI state on error
            setOrdersState(prev)
            console.error('cancelOrder error', err)
            toast.error('Network error')
        } finally {
            setCancellingIndex(null)
        }
    }

    return (
        <main className="w-[82.8%] p-6 bg-gray-100">
            <h1 className="text-2xl font-bold text-black mb-6">My Orders</h1>

            {ordersState.length === 0 ? (
                <p className="text-gray-600 text-center mt-[calc(50vh-100px)] -translate-y-1/2">You have no orders.</p>
            ) : (
                <div className="space-y-4">
                    {ordersState.map((order, index) => {
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
                                    <p>
                                        <span className="font-semibold text-black">Status:</span>
                                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : order.status === 'delivered' ? 'bg-green-100 text-green-800' : order.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                                            {order.status}
                                        </span>
                                    </p>
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


                                            {order.status === 'delivered' ? (
                                                <>
                                                    <button
                                                        className="bg-[#FFA500] text-white px-4 py-2 rounded hover:bg-orange-600 transition"
                                                        onClick={() => {
                                                            setReviewItems(order.items || [])
                                                            setReviewRatings({})
                                                            setReviewComments({})
                                                            setShowReviewModal(true)
                                                        }}
                                                    >
                                                        Give Review
                                                    </button>
                                                    <button
                                                        className={`px-4 py-2 rounded transition flex items-center gap-2 ${
                                                            order.returnRequested 
                                                                ? 'bg-gray-300 text-gray-600 cursor-not-allowed' 
                                                                : 'bg-red-600 text-white hover:bg-red-700'
                                                        }`}
                                                        onClick={() => {
                                                            if (order.returnRequested) return
                                                            setReturnOrder(order)
                                                            // initialize selected items with full quantities
                                                            const map: Record<string, number> = {}
                                                                ; (order.items || []).forEach((it: any) => {
                                                                    const pid = String(it.product?._id ?? it.product)
                                                                    map[pid] = Number(it.quantity ?? 1)
                                                                })
                                                            setSelectedReturnItems(map)
                                                            setReturnReason('')
                                                            setReturnMethod('Courier Pickup')
                                                            setShowReturnModal(true)
                                                        }}
                                                        disabled={order.returnRequested}
                                                    >
                                                        {order.returnRequested ? 'Return Requested' : 'Return Order'}
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        className="bg-[#FFA500] text-white px-4 py-2 rounded hover:bg-orange-600 transition"
                                                        onClick={() => router.push(`/track-your-order/${order.trackingNumber}`)}
                                                    >
                                                        Track Order
                                                    </button>
                                                    <button
                                                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition flex items-center gap-2"
                                                        onClick={() => handleCancelOrder(order?._id, index)}
                                                        disabled={cancellingIndex === index}
                                                    >
                                                        {cancellingIndex === index ? 'Cancelling...' : 'Cancel Order'}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Return Modal */}
            {showReturnModal && returnOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setShowReturnModal(false)} />
                    <div className="bg-white rounded-lg shadow-lg z-60 w-[90%] max-w-2xl p-6 relative">
                        <h2 className="text-lg font-semibold mb-4">Return items from Order {returnOrder.orderNumber ?? returnOrder._id}</h2>
                        <div className="space-y-3 max-h-[50vh] overflow-auto">
                            {(returnOrder.items || []).map((item: any, idx: number) => {
                                const pid = String(item.product?._id ?? item.product)
                                const maxQty = Number(item.quantity ?? 1)
                                const qty = Number(selectedReturnItems[pid] ?? 0)
                                const name = item.name ?? item.product?.name ?? ''
                                const img = item.image ?? item.product?.images?.[0] ?? '/images/placeholder.png'
                                return (
                                    <div key={pid + '-' + idx} className="flex items-center gap-3 border-b pb-3">
                                        <input
                                            type="checkbox"
                                            checked={qty > 0}
                                            onChange={(e) => {
                                                const next = { ...selectedReturnItems }
                                                if (e.target.checked) next[pid] = Math.max(1, maxQty)
                                                else next[pid] = 0
                                                setSelectedReturnItems(next)
                                            }}
                                        />
                                        <Image src={img} alt={name} width={48} height={48} className="rounded" />
                                        <div className="flex-1">
                                            <div className="font-medium">{name}</div>
                                            <div className="text-sm text-gray-600">PKR {Number(item.price ?? item.product?.price ?? 0).toLocaleString()}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                className="px-2 bg-gray-200 rounded"
                                                onClick={() => {
                                                    const next = { ...selectedReturnItems }
                                                    next[pid] = Math.max(0, (next[pid] ?? 0) - 1)
                                                    setSelectedReturnItems(next)
                                                }}
                                            >-</button>
                                            <input
                                                type="number"
                                                className="w-16 text-center border rounded"
                                                value={qty}
                                                min={0}
                                                max={maxQty}
                                                onChange={(e) => {
                                                    const v = Math.max(0, Math.min(maxQty, Number(e.target.value || 0)))
                                                    setSelectedReturnItems({ ...selectedReturnItems, [pid]: v })
                                                }}
                                            />
                                            <button
                                                className="px-2 bg-gray-200 rounded"
                                                onClick={() => {
                                                    const next = { ...selectedReturnItems }
                                                    next[pid] = Math.min(maxQty, (next[pid] ?? 0) + 1)
                                                    setSelectedReturnItems(next)
                                                }}
                                            >+</button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        <div className="mt-4 space-y-3">
                            <label className="block text-sm font-semibold">Reason</label>
                            <textarea className="w-full border rounded p-2" rows={3} value={returnReason} onChange={(e) => setReturnReason(e.target.value)} />

                            <label className="block text-sm font-semibold">Return Method</label>
                            <select className="w-full border rounded p-2" value={returnMethod} onChange={(e) => setReturnMethod(e.target.value)}>
                                <option>Courier Pickup</option>
                                <option>Drop-off at Hub</option>
                                <option>Store Return</option>
                            </select>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button className="px-4 py-2 rounded border" onClick={() => setShowReturnModal(false)} disabled={submittingReturn}>Close</button>
                            <button
                                className="px-4 py-2 rounded bg-red-600 text-white"
                                onClick={async () => {
                                    try {
                                        setSubmittingReturn(true)
                                        const itemsToReturn = Object.entries(selectedReturnItems)
                                            .filter(([, q]) => Number(q) > 0)
                                            .map(([pid, q]) => {
                                                const original = (returnOrder.items || []).find((it: any) => String(it.product?._id ?? it.product) === pid)
                                                return {
                                                    product: pid,
                                                    name: original?.name ?? original?.product?.name,
                                                    image: original?.image ?? original?.product?.images?.[0],
                                                    quantity: Number(q),
                                                    price: Number(original?.price ?? original?.product?.price ?? 0)
                                                }
                                            })

                                        if (itemsToReturn.length === 0) {
                                            toast.error('Select at least one item to return')
                                            return
                                        }

                                        const payload = {
                                            order: String(returnOrder._id ?? returnOrder.order),
                                            items: itemsToReturn,
                                            reason: returnReason,
                                            returnMethod,
                                        }

                                        const res = await fetch(`${API_BASE}/api/returns`, {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${token}`
                                            },
                                            body: JSON.stringify(payload)
                                        })
                                        if (!res.ok) {
                                            const err = await res.json().catch(() => ({}))
                                            toast.error(err?.msg ?? err?.message ?? `Failed (${res.status})`)
                                            return
                                        }
                                        await res.json().catch(() => ({}))
                                        toast.success('Return request created')
                                        setShowReturnModal(false)
                                        
                                        // Optimistically mark the order as having a pending return
                                        setOrdersState((prev) => prev.map(o => (
                                            String(o._id) === String(returnOrder._id)
                                                ? { ...o, returnRequested: true }
                                                : o
                                        )))
                                        
                                        // Notify Returns tab to refresh
                                        if (typeof window !== 'undefined') {
                                            window.dispatchEvent(new CustomEvent('returns:updated'))
                                        }
                                    } catch (err) {
                                        console.error('create return error', err)
                                        toast.error('Network error')
                                    } finally {
                                        setSubmittingReturn(false)
                                    }
                                }}
                                disabled={submittingReturn}
                            >
                                {submittingReturn ? 'Submitting...' : 'Submit Return'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Review Modal */}
            {showReviewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setShowReviewModal(false)} />
                    <div className="bg-white rounded-lg shadow-lg z-60 w-[90%] max-w-2xl p-6 relative">
                        <h2 className="text-lg font-semibold mb-4">Review Items</h2>
                        <div className="space-y-4 max-h-[60vh] overflow-auto">
                            {(reviewItems || []).map((item: any, idx: number) => {
                                const productId = String(item.product?._id ?? item.product)
                                const name = item.name ?? item.product?.name ?? 'Product'
                                const img = item.image ?? item.product?.images?.[0] ?? '/images/placeholder.png'
                                const rating = reviewRatings[productId] ?? 0
                                const comment = reviewComments[productId] ?? ''
                                
                                return (
                                    <div key={productId + '-' + idx} className="border rounded-lg p-4 space-y-3">
                                        <div className="flex items-center gap-3 pb-3 border-b">
                                            <Image src={img} alt={name} width={60} height={60} className="rounded" />
                                            <div>
                                                <div className="font-semibold text-black">{name}</div>
                                                <div className="text-sm text-gray-600">PKR {Number(item.price ?? item.product?.price ?? 0).toLocaleString()}</div>
                                            </div>
                                        </div>
                                        
                                        {/* Rating */}
                                        <div>
                                            <label className="block text-sm font-semibold text-black mb-2">Rating (1-5)</label>
                                            <div className="flex gap-2">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <button
                                                        key={star}
                                                        onClick={() => setReviewRatings({ ...reviewRatings, [productId]: star })}
                                                        className={`text-3xl transition ${
                                                            star <= rating ? 'text-yellow-400' : 'text-gray-300'
                                                        }`}
                                                    >
                                                        ★
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        {/* Comment */}
                                        <div>
                                            <label className="block text-sm font-semibold text-black mb-2">Comment (Optional)</label>
                                            <textarea
                                                className="w-full border rounded p-2 text-black"
                                                rows={2}
                                                placeholder="Share your experience with this product..."
                                                value={comment}
                                                onChange={(e) => setReviewComments({ ...reviewComments, [productId]: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                className="px-4 py-2 rounded border text-black hover:bg-gray-100"
                                onClick={() => setShowReviewModal(false)}
                                disabled={submittingReview}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-4 py-2 rounded bg-[#FFA500] text-white hover:bg-orange-600 disabled:opacity-50"
                                onClick={async () => {
                                    try {
                                        setSubmittingReview(true)
                                        
                                        // Validate that all items have ratings
                                        const itemsWithoutRating = (reviewItems || []).filter(
                                            (item: any) => !reviewRatings[String(item.product?._id ?? item.product)]
                                        )
                                        if (itemsWithoutRating.length > 0) {
                                            toast.error('Please rate all items')
                                            return
                                        }
                                        
                                        // Submit review for each product
                                        for (const item of reviewItems) {
                                            const productId = String(item.product?._id ?? item.product)
                                            const rating = reviewRatings[productId]
                                            const comment = reviewComments[productId] || ''
                                            
                                            const payload = {
                                                product: productId,
                                                rating: Number(rating),
                                                comment: comment.trim()
                                            }
                                            
                                            const res = await fetch(`${API_BASE}/api/reviews`, {
                                                method: 'POST',
                                                headers: {
                                                    'Content-Type': 'application/json',
                                                    'Authorization': `Bearer ${token}`
                                                },
                                                body: JSON.stringify(payload)
                                            })
                                            
                                            if (!res.ok) {
                                                const err = await res.json().catch(() => ({}))
                                                toast.error(err?.msg ?? err?.message ?? `Failed to submit review (${res.status})`)
                                                return
                                            }
                                        }
                                        
                                        toast.success('Reviews submitted successfully')
                                        setShowReviewModal(false)
                                        setReviewItems([])
                                        setReviewRatings({})
                                        setReviewComments({})
                                    } catch (err) {
                                        console.error('submit review error', err)
                                        toast.error('Network error')
                                    } finally {
                                        setSubmittingReview(false)
                                    }
                                }}
                                disabled={submittingReview || reviewItems.length === 0}
                            >
                                {submittingReview ? 'Submitting...' : 'Submit Reviews'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    )
}

export default Orders
