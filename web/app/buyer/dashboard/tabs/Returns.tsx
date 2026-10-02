/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect } from 'react'
import Image from "@/app/components/AppImage"
import { FaCheck, FaMoneyBill } from 'react-icons/fa6'
import { toast } from 'sonner'

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

function Returns(props: Props) {

    const [returns, setReturns] = useState<any[]>([])
    // const returns = [
    //     {
    //         returnId: 'RTN-5484',
    //         orderNumber: 'ORD-1324',
    //         requestDate: '2025-05-02',
    //         status: 'Approved',
    //         reason: 'Damaged item received',
    //         refundAmount: 3500,
    //         method: 'Courier Pickup',
    //         trackingId: 'TRK-PK-55421',
    //         items: [
    //             {
    //                 name: 'Toyota Brake Pads',
    //                 quantity: 1,
    //                 price: 3500,
    //                 image: '/images/placeholder-product-2.png',
    //             },
    //         ],
    //     },
    //     {
    //         returnId: 'RTN-5589',
    //         orderNumber: 'ORD-1480',
    //         requestDate: '2025-05-03',
    //         status: 'Pending',
    //         reason: 'Wrong product delivered',
    //         refundAmount: 7200,
    //         method: 'Drop-off at hub',
    //         trackingId: 'TRK-PK-99110',
    //         items: [
    //             {
    //                 name: 'Honda Engine Oil 5W-30',
    //                 quantity: 2,
    //                 price: 3600,
    //                 image: '/images/placeholder-product.png',
    //             },
    //         ],
    //     },
    // ]

    const session = props.Session;
    const token = session?.backendToken || session?.accessToken;
    const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "http://localhost:4001").replace(/\/$/, "")
    // const userId = session?.user?._id ?? session?.user?.id

    useEffect(() => {
        const fetchReturns = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/returns`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                })
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}))
                    toast.error(err?.msg ?? err?.message ?? `Failed (${res.status})`)
                    setReturns([])
                    return
                }
                const data = await res.json().catch(() => null)
                // API returns an array of returns
                const items = Array.isArray(data) ? data : (data?.items ?? [])
                setReturns(items)
            } catch (err) {
                console.error('fetch returns error', err)
                setReturns([])
            }
        }

        fetchReturns()

        // Refresh when other tabs dispatch a returns:updated event
        const handler = () => fetchReturns()
        window.addEventListener('returns:updated', handler)
        // Also refresh when page/tab becomes visible
        const visHandler = () => { if (document.visibilityState === 'visible') fetchReturns() }
        document.addEventListener('visibilitychange', visHandler)
        return () => {
            window.removeEventListener('returns:updated', handler)
            document.removeEventListener('visibilitychange', visHandler)
        }
    }, [token, API_BASE])

    return (
        <main className="w-[82.8%] p-6 bg-gray-100">
            <h1 className="text-2xl font-bold text-black mb-6">My Returns</h1>

            {returns.length === 0 ? (
                <p className="text-gray-600 text-center mt-[calc(50vh-100px)] -translate-y-1/2">You have no return requests.</p>
            ) : (
             <div className="space-y-4">
                {returns.map((ret, index) => (
                    <div
                        key={index}
                        className="bg-white rounded-lg shadow-md p-6 border border-gray-200"
                    >
                        {/* Header Row */}
                        <div className="w-full flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div className="space-y-1">
                                <p><span className="font-semibold text-black">Return #:</span> {ret.returnNumber ?? ret._id}</p>
                                <p>
                                    <span className="font-semibold text-black">Order #:</span>{' '}
                                    {typeof ret.order === 'string'
                                        ? ret.order
                                        : (ret.order?.orderNumber ?? ret.order?._id ?? 'N/A')}
                                </p>
                                <p><span className="font-semibold text-black">Requested:</span> {new Date(ret.requestedAt).toISOString().split('T')[0]}</p>
                            </div>
                            <div className="text-right space-y-1">
                                <p><span className="font-semibold text-black">Refund:</span> PKR {ret.refundAmount}</p>
                                <p>
                                    <span className="font-semibold text-black">Status:</span>
                                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${ret.status.toLowerCase() === 'pending' ? 'bg-yellow-100 text-yellow-800' : ret.status.toLowerCase() === 'approved' ? 'bg-blue-100 text-blue-800' : ret.status.toLowerCase() === 'refunded' ? 'bg-green-100 text-green-800' : ret.status.toLowerCase() === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'}`}>
                                        {ret.status.charAt(0).toUpperCase() + ret.status.slice(1)}
                                    </span>
                                </p>
                            </div>
                        </div>

                        {/* Item Table */}
                        <div className="mt-6 border-t border-gray-200 pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 text-black text-sm font-semibold mb-4">
                                <span>Item</span>
                                <span className="text-center">Quantity</span>
                                <span className="text-center">Price</span>
                                <span className="text-end">Total</span>
                            </div>
                            {ret.items.map((item, idx) => (
                                <div
                                    key={idx}
                                    className="grid grid-cols-1 md:grid-cols-4 items-center text-sm py-4 border-t border-gray-200 gap-4"
                                >
                                    <div className="flex items-center gap-3">
                                        <Image
                                            src={item.image || '/images/placeholder.png'}
                                            alt={item.name}
                                            width={50}
                                            height={50}
                                            className="rounded-md object-cover border"
                                        />
                                        <span className="text-black font-medium">{item.name}</span>
                                    </div>
                                    <span className="text-center">{item.quantity}</span>
                                    <span className='text-center'>PKR {item.price.toLocaleString()}</span>
                                    <span className=" text-end font-medium text-black">
                                        PKR {(item.price * item.quantity).toLocaleString()}
                                    </span>
                                </div>
                            ))}

                            <div className="mt-4 text-sm text-black flex flex-col gap-5">
                                <p><strong>Reason:</strong> {ret.reason}</p>
                                <p><strong>Return Method:</strong> {ret.returnMethod}</p>
                                <p><strong>Tracking ID:</strong> {ret.trackingId}</p>
                                {ret.status?.toLowerCase() === 'approved' && (
                                    <p className="text-green-700 font-semibold flex flex-row items-center gap-2"><FaCheck /> Your refund will be credited to your provided account within 7 working days.</p>
                                )}
                                {ret.status?.toLowerCase() === 'refunded' && (
                                    <p className="text-green-700 font-semibold flex flex-row items-center gap-2"><FaMoneyBill />Refund has been successfully transferred to your account.</p>
                                )}
                            </div>

                            <div className="mt-6 flex justify-end">
                                <button className="bg-[#FFA500] text-white px-4 py-2 rounded hover:bg-orange-600 transition">
                                    Contact Support
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            )}
        </main>
    )
}

export default Returns
