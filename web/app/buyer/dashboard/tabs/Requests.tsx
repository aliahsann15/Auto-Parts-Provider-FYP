'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Image from '@/app/components/AppImage'
import { FiArrowLeft } from 'react-icons/fi'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import BuyerChat from '@/app/components/chat/buyer-chat'
import { io, Socket } from 'socket.io-client'

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

function Requests(props: Props) {
    const [groupedQuotes, setGroupedQuotes] = useState<any[]>([])
    const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [deleting, setDeleting] = useState<string | null>(null)
    const [offersByRequest, setOffersByRequest] = useState<Record<string, any[]>>({})
    const [offersLoading, setOffersLoading] = useState(false)
    const [offerCountByRequest, setOfferCountByRequest] = useState<Record<string, number>>({})
    const [chatState, setChatState] = useState<{ sellerId: string; sellerName: string } | null>(null)
    const router = useRouter()
    const socketRef = useRef<Socket | null>(null)

    const session = props.Session
    const token = session?.backendToken || session?.accessToken
        const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "http://localhost:4001").replace(/\/$/, "")
    const buyerId = session?.user?._id || session?.user?.id

    const toAbsolute = useCallback((p?: string) => {
        if (!p) return '/images/placeholder.png'
        if (p.startsWith('http')) return p
        return `${API_BASE}${p.startsWith('/') ? p : `/${p}`}`
    }, [API_BASE])

    useEffect(() => {
        const fetchRequests = async () => {
            if (!token) return
            setLoading(true)
            try {
                const res = await fetch(`${API_BASE}/api/parts-requests/my`, {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    cache: 'no-store',
                })
                if (!res.ok) {
                    const err = await res.json().catch(() => null)
                    throw new Error(err?.msg || 'Failed to fetch requests')
                }
                const data = await res.json()
                const requests: any[] = data?.items || []

                // Group requests with their offers
                const grouped = requests.map((req: any) => {
                    const computedCount = (req.offers || []).filter((o: any) => typeof o?.price === 'number').length
                    const offerCount = typeof req?.offerCount === 'number'
                        ? req.offerCount
                        : computedCount

                    return {
                        request: req,
                        offers: req.offers || [],
                        unread: Number(req?.unreadMessages || 0),
                        acceptedOfferId: req?.acceptedOfferId,
                        requestClosed: req.status === 'Completed',
                        offerCount,
                    }
                })
                setGroupedQuotes(grouped)

                // For requests missing offerCount, fetch counts from offers endpoint
                const idsNeedingCount = requests
                  .filter((r: any) => typeof r?.offerCount !== 'number')
                  .map((r: any) => String(r._id || r.id))
                if (idsNeedingCount.length) {
                    const fetches = idsNeedingCount.map(async (id: string) => {
                        try {
                            const r = await fetch(`${API_BASE}/api/offers/request/${id}`, { headers: { 'Content-Type': 'application/json' }, cache: 'no-store' })
                            if (!r.ok) return { id, count: 0 }
                            const d = await r.json()
                            const offers: any[] = d?.offers || []
                            const count = offers.filter(o => typeof o?.price === 'number').length
                            return { id, count }
                        } catch {
                            return { id, count: 0 }
                        }
                    })
                    const results = await Promise.all(fetches)
                    setOfferCountByRequest(prev => {
                        const next = { ...prev }
                        results.forEach(({ id, count }) => { next[id] = count })
                        return next
                    })
                }
            } catch (err: any) {
                console.error('Error fetching requests:', err)
                toast.error(err?.message || 'Failed to load requests')
                setGroupedQuotes([])
            } finally {
                setLoading(false)
            }
        }
        fetchRequests()
    }, [token, API_BASE])

    // Setup socket connection for real-time updates
    useEffect(() => {
        if (!token || !buyerId) return

        const socket = io(API_BASE.replace('/api', ''), {
            transports: ['websocket', 'polling'],
            auth: { token },
        })

        socketRef.current = socket

        socket.on('connect', () => {
            console.log('Buyer requests socket connected')
            // Join rooms for all buyer's requests
            groupedQuotes.forEach((entry) => {
                const reqId = entry.request?._id || entry.request?.id
                if (reqId) {
                    socket.emit('join-request', String(reqId))
                }
            })
        })

        // Listen for new offers
        socket.on('offer:created', (data: any) => {
            console.log('New offer received:', data)
            // Update the specific request's offer count locally
            setGroupedQuotes(prev => prev.map(entry => {
                const reqId = entry.request?._id || entry.request?.id
                if (String(reqId) === String(data.requestId)) {
                    return {
                        ...entry,
                        offerCount: (entry.offerCount || 0) + 1
                    }
                }
                return entry
            }))
        })

        // Listen for offer acceptance
        socket.on('offer:accepted', (data: any) => {
            console.log('Offer accepted event received:', data)
            // Update the specific request status locally
            setGroupedQuotes(prev => prev.map(entry => {
                const reqId = entry.request?._id || entry.request?.id
                if (String(reqId) === String(data.requestId)) {
                    return {
                        ...entry,
                        requestClosed: true,
                        request: { ...entry.request, status: 'Completed' }
                    }
                }
                return entry
            }))
        })

        socket.on('disconnect', () => {
            console.log('Buyer requests socket disconnected')
        })

        return () => {
            groupedQuotes.forEach((entry) => {
                const reqId = entry.request?._id || entry.request?.id
                if (reqId) {
                    socket.emit('leave-request', String(reqId))
                }
            })
            socket.disconnect()
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, buyerId, API_BASE])

    useEffect(() => {
        const fetchOffersForSelected = async () => {
            if (!selectedRequestId) return
            setOffersLoading(true)
            try {
                const res = await fetch(`${API_BASE}/api/offers/request/${selectedRequestId}`, {
                    headers: { 'Content-Type': 'application/json' },
                    cache: 'no-store',
                })
                if (!res.ok) {
                    const err = await res.json().catch(() => null)
                    throw new Error(err?.msg || 'Failed to fetch offers')
                }
                const data = await res.json()
                const offers: any[] = data?.offers || []
                setOffersByRequest(prev => ({ ...prev, [selectedRequestId]: offers }))
            } catch (err: any) {
                console.error('Error fetching offers:', err)
                toast.error(err?.message || 'Failed to load offers')
                setOffersByRequest(prev => ({ ...prev, [selectedRequestId!]: [] }))
            } finally {
                setOffersLoading(false)
            }
        }
        fetchOffersForSelected()
    }, [selectedRequestId, API_BASE])

    const handleDeleteRequest = async (requestId: string) => {
        if (!token || !requestId) return
        const confirmDelete = window.confirm('Are you sure you want to delete this request?')
        if (!confirmDelete) return
        try {
            setDeleting(requestId)
            const res = await fetch(`${API_BASE}/api/parts-requests/${requestId}`, {
                method: 'DELETE',
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
            })
            if (!res.ok) {
                const err = await res.json().catch(() => null)
                throw new Error(err?.msg || 'Failed to delete request')
            }
            toast.success('Request deleted')
            setGroupedQuotes(prev => prev.filter(e => (e.request?._id || e.request?.id) !== requestId))
            setSelectedRequestId(null)
        } catch (err: any) {
            console.error('Delete request error:', err)
            toast.error(err?.message || 'Failed to delete request')
        } finally {
            setDeleting(null)
        }
    }

    return (
        <main className="w-[82.8%] p-6 bg-gray-100">
            {chatState && selectedRequestId ? (
                // Chat View
                <BuyerChat
                    requestId={selectedRequestId}
                    sellerId={chatState.sellerId}
                    sellerName={chatState.sellerName}
                    token={token || ''}
                    buyerId={session?.user?._id || session?.user?.id || ''}
                    onBack={() => setChatState(null)}
                    apiBase={API_BASE}
                    onAcceptSuccess={() => {
                        setChatState(null)
                        setSelectedRequestId(null)
                        // Refresh offers and requests by refetching
                        router.refresh()
                    }}
                />
            ) : selectedRequestId ? (
                // Detail View
                renderDetailView()
            ) : (
                // List View
                renderListView()
            )}
        </main>
    )

    function renderListView() {
        return (
            <>
                <div className='flex items-center justify-between mb-6'>
                    <h1 className="text-2xl font-bold text-black">My Requests</h1>
                    <button
                        onClick={() => router.push('/request-a-part')}
                        className="px-4 py-2 bg-[#FFA500] text-white rounded-lg hover:bg-[#e59400] transition"
                    >
                        New Request
                    </button>
                </div>

                {loading ? (
                    <p className="text-gray-600">Loading...</p>
                ) : groupedQuotes.length === 0 ? (
                    <p className="text-gray-600">You have no requests.</p>
                ) : (
                    <div className="space-y-4">
                        {groupedQuotes
                            .filter((entry) => {
                                // Filter out completed requests from list view
                                const req = entry.request || {}
                                return req.status !== 'Completed'
                            })
                            .map((entry, index) => {
                            const req = entry.request || {}
                            const orderDate = req?.createdAt
                                ? new Date(req.createdAt).toLocaleDateString()
                                : req?.orderDate
                                    ? new Date(req.orderDate).toLocaleDateString()
                                    : ''
                            const vehicleLabel = [req.companyName, req.carName, req.variant, req.year].filter(Boolean).join(' ')
                            const imageSrc = toAbsolute(req?.images?.[0]?.path)
                            const acceptedOffer = (entry.offers || []).find((o: any) => o?.accepted) || (entry.offers || []).find((o: any) => o?._id === entry.acceptedOfferId)
                            const acceptedSeller = acceptedOffer?.acceptedSeller || acceptedOffer?.seller
                            const acceptedPrice = acceptedOffer?.price ?? acceptedOffer?.acceptedPrice
                            const requestKey = req?._id || req?.id || String(index)
                            // Prefer backend-provided count, else cached, else computed
                            const idKey = String(req?._id || req?.id || '')
                            const offerCount = typeof req?.offerCount === 'number'
                                ? req.offerCount
                                : offerCountByRequest[idKey] ?? (req.offers || entry.offers || []).filter((o: any) => typeof o?.price === 'number').length
                            
                            return (
                                <div key={requestKey} className="bg-white rounded-lg shadow p-6">
                                    <div className="w-full flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <Image
                                                src={imageSrc}
                                                alt={req.partName || 'Requested part'}
                                                width={120}
                                                height={120}
                                                className="rounded-md object-cover border"
                                                unoptimized
                                            />
                                            <div className="flex flex-col justify-between gap-3">
                                                <p className="font-medium text-xl text-black">
                                                    <span className="font-semibold">{req.partName || 'Requested Part'}</span>
                                                    {vehicleLabel ? ` - ${vehicleLabel}` : ''}
                                                </p>
                                                <p className="text-md">
                                                    Requested on: <span className="font-semibold">{orderDate}</span>
                                                    &nbsp; &nbsp; &nbsp; &nbsp;
                                                    Status: <span className="font-semibold">{req.status || 'Pending'}</span>
                                                </p>
                                                <p className="text-sm text-gray-700">
                                                    {acceptedOffer
                                                        ? `Offer accepted from ${acceptedSeller?.storeName || acceptedSeller?.name || 'seller'}${typeof acceptedPrice === 'number' ? ` · PKR ${acceptedPrice}` : ''}`
                                                        : `${offerCount} offer(s)`}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setSelectedRequestId(requestKey)}
                                            className="flex items-center text-[#FFA500] text-sm font-semibold hover:underline"
                                        >
                                            Show Offers
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </>
        )
    }

    function renderDetailView() {
        const entry = groupedQuotes.find(e => {
            const reqId = e.request?._id || e.request?.id
            return String(reqId) === String(selectedRequestId)
        })

        if (!entry) {
            return (
                <div>
                    <button onClick={() => setSelectedRequestId(null)} className="flex items-center text-[#FFA500] mb-4">
                        <FiArrowLeft className="mr-2" /> Back to Requests
                    </button>
                    <p className="text-gray-600">Request not found.</p>
                </div>
            )
        }

        const req = entry.request || {}
        const offers = selectedRequestId ? offersByRequest[selectedRequestId] ?? entry.offers ?? [] : entry.offers ?? []
        const orderDate = req?.createdAt
            ? new Date(req.createdAt).toLocaleDateString()
            : req?.orderDate
                ? new Date(req.orderDate).toLocaleDateString()
                : ''
        const vehicleLabel = [req.companyName, req.carName, req.variant, req.year].filter(Boolean).join(' ')
        const imageSrc = toAbsolute(req?.images?.[0]?.path)
        const isClosed = entry.requestClosed || entry.acceptedOfferId || offers.some((o: any) => o?.accepted)

        return (
            <div>
                <button onClick={() => setSelectedRequestId(null)} className="flex items-center text-[#FFA500] mb-6 font-semibold">
                    <FiArrowLeft className="mr-2" /> Back to Requests
                </button>

                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <div className="flex items-start gap-6">
                        <Image
                            src={imageSrc}
                            alt={req.partName || 'Requested part'}
                            width={180}
                            height={180}
                            className="rounded-md object-cover border"
                            unoptimized
                        />
                        <div className="flex-1">
                            <h2 className="text-2xl font-medium text-black">
                                <span className='font-bold'> {req.partName || 'Requested Part'} </span> - {vehicleLabel}
                            </h2>
                            <p className="text-md text-gray-600 mt-4">
                                Requested on: <span className="font-semibold">{orderDate}</span>
                            </p>
                            <p className="text-md text-gray-600 mt-2">
                                Status: <span className="font-semibold">{req.status || 'Pending'}</span>
                            </p>
                            {req.description && (
                                <p className="text-md text-gray-600 mt-2">
                                    Description: <span className="font-semibold">{req.description}</span>
                                </p>
                            )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <button
                                onClick={() => handleDeleteRequest(String(req._id || req.id))}
                                className="px-4 py-2 text-sm rounded border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                                disabled={deleting === String(req._id || req.id)}
                            >
                                {deleting === String(req._id || req.id) ? 'Deleting…' : 'Delete Request'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-xl font-bold text-black mb-6">Offers Received ({offers.filter((o: any) => typeof o?.price === 'number').length})</h3>
                    {isClosed && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                            <p className="text-green-800 font-semibold">Request Closed - Offer Accepted</p>
                        </div>
                    )}
                    {offersLoading ? (
                        <p className="text-gray-600">Loading offers...</p>
                    ) : offers.length === 0 ? (
                        <p className="text-gray-600">No offers yet.</p>
                    ) : (
                        <div className="space-y-4">
                            {offers.map((offer: any, idx: number) => {
                                const seller = offer.seller || {}
                                const storeName = seller.storeName || seller.name || 'Seller'
                                const price = typeof offer.price === 'number' ? offer.price : offer.acceptedPrice
                                const isAccepted = offer?.accepted || offer?._id === entry.acceptedOfferId

                                return (
                                    <div key={offer._id || idx} className="border border-gray-200 rounded-lg p-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-lg font-semibold text-black">{storeName}</p>
                                                <p className="text-gray-600 text-sm mt-1">{offer.message || 'No message'}</p>
                                                {price !== undefined && (
                                                    <p className="text-lg font-bold text-[#FFA500] mt-3">PKR {price}</p>
                                                )}
                                                {isAccepted && (
                                                    <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-800 rounded text-sm font-semibold">Accepted</span>
                                                )}
                                            </div>
                                            {!isClosed && (
                                                <div className="flex gap-2">
                                                    <button
                                                        className="bg-[#171717] text-white px-4 py-2 text-sm rounded hover:bg-zinc-700 transition"
                                                        onClick={() => {
                                                            const sellerId = seller._id || seller.id
                                                            if (!sellerId) {
                                                                toast.error('Seller information not available')
                                                                return
                                                            }
                                                            setChatState({ sellerId: String(sellerId), sellerName: storeName })
                                                        }}
                                                    >
                                                        Chat
                                                    </button>
                                                    {/* <button
                                                        className="bg-[#FFA500] text-white px-4 py-2 text-sm rounded hover:bg-orange-600 transition"
                                                        onClick={() => toast('Add to Cart not implemented')}
                                                    >
                                                        Add to Cart
                                                    </button> */}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        )
    }
}

export default Requests
