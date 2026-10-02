'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect } from 'react'
import { FiEye } from 'react-icons/fi'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
// import { OrderRequest } from '@/types'

// -------------------
// TypeScript definitions for order requests
// -------------------

// Props for the OrderRequestsSection component
interface OrderRequestsSectionProps {
  requests: any[]
}

const OrderRequestsSection: React.FC<OrderRequestsSectionProps> = ({ requests }) => {
  const { data: session } = useSession()
  const token = (session as any)?.backendToken || (session as any)?.accessToken
  const sellerId = (session?.user as any)?.sellerId || (session?.user as any)?._id || (session?.user as any)?.id
  const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:4001').replace(/\/$/, '')

  const [openRequestId, setOpenRequestId] = useState<string | null>(null)
  const [showOfferForm, setShowOfferForm] = useState(false)
  const [offerPrice, setOfferPrice] = useState<string>('')
  const [offerMessage, setOfferMessage] = useState<string>('')
  const [warranty, setWarranty] = useState<string>('')
  const [returnDays, setReturnDays] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [myOfferOverride, setMyOfferOverride] = useState<any | null>(null)
  const [offerLoading, setOfferLoading] = useState(false)

  const visibleRequests = React.useMemo(
    () => requests.filter((req) => String(req.status || '').toLowerCase() !== 'completed'),
    [requests],
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  const selectedReq = requests.find(r => String(r._id || r.id) === String(openRequestId))
  const myOffer = React.useMemo(() => {
    if (!selectedReq || !sellerId) return null
    if (myOfferOverride) return myOfferOverride
    const offers = selectedReq.offers || selectedReq.offer || []
    const sellerIdStr = String(sellerId)
    const found = Array.isArray(offers)
      ? offers.find((o: any) => String(o?.seller?._id || o?.seller) === sellerIdStr)
      : null
    if (found) return found
    const maybeMyOffer = selectedReq.myOffer
    if (maybeMyOffer && String(maybeMyOffer?.seller?._id || maybeMyOffer?.seller) === sellerIdStr) return maybeMyOffer
    return null
  }, [selectedReq, sellerId, myOfferOverride])

  const openModal = (reqId: string) => {
    setOpenRequestId(reqId)
    setShowOfferForm(false)
    setOfferPrice('')
    setOfferMessage('')
    setWarranty('')
    setReturnDays('')
    setMyOfferOverride(null)
    fetchMyOffer(reqId)
  }

  const closeModal = () => {
    setOpenRequestId(null)
    setShowOfferForm(false)
    setOfferPrice('')
    setOfferMessage('')
    setWarranty('')
    setReturnDays('')
    setMyOfferOverride(null)
  }

  const handleMakeOffer = async () => {
    try {
      if (!token) {
        toast.error('You must be signed in to make an offer')
        return
      }
      const requestId = String(selectedReq?._id || selectedReq?.id)
      if (!requestId) {
        toast.error('Invalid request')
        return
      }
      const priceNum = Number(offerPrice)
      if (!Number.isFinite(priceNum) || priceNum <= 0) {
        toast.error('Enter a valid price')
        return
      }
      const returnDaysNum = returnDays.trim() ? Number(returnDays) : undefined;
      if (returnDaysNum !== undefined && (Number.isNaN(returnDaysNum) || returnDaysNum < 0)) {
        toast.error('Return days must be a non-negative number');
        return;
      }
      setSubmitting(true)
      if (myOffer?._id) {
        const res = await fetch(`${API_BASE}/api/offers/${myOffer._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            price: priceNum,
            message: offerMessage || undefined,
            warranty: warranty.trim() || undefined,
            returnDays: returnDaysNum,
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => null)
          throw new Error(err?.msg || 'Failed to update offer')
        }
        toast.success('Offer updated successfully')
      } else {
        const res = await fetch(`${API_BASE}/api/offers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ 
            requestId, 
            price: priceNum, 
            message: offerMessage || undefined,
            warranty: warranty.trim() || undefined,
            returnDays: returnDaysNum
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => null)
          throw new Error(err?.msg || 'Failed to create offer')
        }
        toast.success('Offer created successfully')
      }
      closeModal()
    } catch (err: any) {
      console.error('Create offer error:', err)
      toast.error(err?.message || 'Failed to create offer')
    } finally {
      setSubmitting(false)
    }
  }

  const fetchMyOffer = async (requestId: string) => {
    if (!token || !sellerId) return
    setOfferLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/offers/request/${requestId}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      })
      if (!res.ok) return
      const data = await res.json().catch(() => null)
      const offers = data?.offers || []
      const sellerIdStr = String(sellerId)
      const found = Array.isArray(offers)
        ? offers.find((o: any) => String(o?.seller?._id || o?.seller) === sellerIdStr)
        : null
      if (found) setMyOfferOverride(found)
    } catch (err) {
      console.error('Fetch offer error:', err)
    } finally {
      setOfferLoading(false)
    }
  }

  // Section: Order Requests Section Starts Here
  return (
      <div className="overflow-y-auto max-h-[300px]" suppressHydrationWarning>
      {/* Table container */}
      <table className="min-w-full rounded-lg divide-y divide-gray-200 overflow-hidden">
        {/* Table head */}
        <thead className="bg-[#ffa500] ">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-white  uppercase tracking-wider">Car Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-white  uppercase tracking-wider">Part Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-white  uppercase tracking-wider">Quantity</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-white  uppercase tracking-wider">Date</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-white  uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Action</th>
          </tr>
        </thead>

        {/* Table body */}
        <tbody className="bg-white divide-y divide-gray-200">
          {visibleRequests.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-4 text-sm text-gray-500 text-center">
                No open requests available.
              </td>
            </tr>
          ) : (
            visibleRequests.map((req) => {
              return (
              <tr key={req._id}>
                <td className="px-6 py-4 whitespace-nowrap text-xs text-black">{req.companyName + ' ' + req.carName + ' ' + req.variant}</td>
                <td className="px-6 py-4 whitespace-nowrap text-xs text-black">{req.partName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-xs text-black">{req.quantity}</td>
                <td className="px-6 py-4 whitespace-nowrap text-xs text-black" suppressHydrationWarning>
                  {mounted ? new Date(req.createdAt).toLocaleDateString() : ''}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    req.status === 'Completed' ? 'bg-green-100 text-green-800' :
                    req.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {req.status}
                  </span>
                </td>

                {/* Action column with View and Chat */}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium ">
                  <button
                    onClick={() => openModal(String(req._id || req.id))}
                    className="inline-flex items-center text-[#FFA500] hover:underline"
                    aria-label="View request details"
                  >
                    <FiEye className="mr-1 text-xl" />
                  </button>
                </td>
              </tr>
              );
            })
          )}
        </tbody>
      </table>
      {openRequestId && selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white w-full max-w-2xl rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-black">Request Details</h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>

            {!showOfferForm ? (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-gray-600">Part</p>
                    <p className="text-sm font-medium text-black">{selectedReq.partName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Quantity</p>
                    <p className="text-sm font-medium text-black">{selectedReq.quantity}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="text-sm font-medium text-black" suppressHydrationWarning>
                      {mounted ? new Date(selectedReq.createdAt).toLocaleDateString() : ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className="text-sm font-medium text-black">{selectedReq.status}</p>
                  </div>
                  {selectedReq.description && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-600">Description</p>
                      <p className="text-sm font-medium text-black">{selectedReq.description}</p>
                    </div>
                  )}
                </div>

                {offerLoading && (
                  <div className="mt-4 text-sm text-gray-500">Loading your offer…</div>
                )}
                {myOffer && (
                  <div className="mt-4 rounded border border-gray-200 bg-gray-50 p-4">
                    <h4 className="text-sm font-semibold text-gray-800 mb-2">Your Offer</h4>
                    <div className="text-sm text-black">Price: PKR {myOffer.price?.toLocaleString?.() || myOffer.price}</div>
                    {myOffer.message && <div className="text-sm text-gray-700 mt-1">Message: {myOffer.message}</div>}
                    {myOffer.warranty && <div className="text-sm text-gray-700 mt-1">Warranty: {myOffer.warranty}</div>}
                    {myOffer.returnDays !== undefined && myOffer.returnDays !== null && (
                      <div className="text-sm text-gray-700 mt-1">Return Days: {myOffer.returnDays}</div>
                    )}
                    {myOffer.offerNumber && <div className="text-xs text-gray-500 mt-2">Offer #: {myOffer.offerNumber}</div>}
                  </div>
                )}

                <div className="flex justify-end gap-3 mt-4">
                  <button
                    onClick={() => {
                      setShowOfferForm(true)
                      if (myOffer) {
                        setOfferPrice(myOffer.price ? String(myOffer.price) : '')
                        setOfferMessage(myOffer.message || '')
                        setWarranty(myOffer.warranty || '')
                        setReturnDays(
                          myOffer.returnDays !== undefined && myOffer.returnDays !== null
                            ? String(myOffer.returnDays)
                            : ''
                        )
                      }
                    }}
                    className="px-4 py-2 rounded bg-[#FFA500] text-white text-sm hover:bg-orange-600"
                  >
                    {myOffer ? 'Update Offer' : 'Make an offer'}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h4 className="text-lg font-semibold text-black mb-4">{myOffer ? 'Update Offer' : 'Create Offer'}</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Price (PKR)</label>
                    <input
                      type="number"
                      min="0"
                      value={offerPrice}
                      onChange={(e) => setOfferPrice(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                      placeholder="Enter price"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Message (optional)</label>
                    <textarea
                      value={offerMessage}
                      onChange={(e) => setOfferMessage(e.target.value)}
                      rows={4}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                      placeholder="Add a note for the buyer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Warranty (optional)</label>
                    <input
                      type="text"
                      value={warranty}
                      onChange={(e) => setWarranty(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                      placeholder="e.g., 1 year warranty"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Return Days (optional)</label>
                    <input
                      type="number"
                      min="0"
                      value={returnDays}
                      onChange={(e) => setReturnDays(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                      placeholder="Number of days for returns"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button onClick={() => setShowOfferForm(false)} className="px-4 py-2 rounded border border-gray-300 text-sm">Back to details</button>
                  <button
                    onClick={handleMakeOffer}
                    disabled={submitting}
                    className="px-4 py-2 rounded bg-[#FFA500] text-white text-sm hover:bg-orange-600 disabled:opacity-50"
                  >
                    {submitting ? 'Submitting…' : (myOffer ? 'Update Offer' : 'Submit Offer')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </div >
    
  )
  // Section: Order Requests Section Ends Here
}

export default OrderRequestsSection
