// CheckoutStep1.tsx - Billing Address with Order Summary
'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useActionState, useEffect, useState, startTransition } from 'react'
import Image from '@/app/components/AppImage'
import { useCart } from '@/app/context/cart-context'
import { createOrder } from '@/actions/createOrder'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import StripePayment from '@/app/components/stripe-payment'
import { useSearchParams } from 'next/navigation'

const PARCELS = [
  { code: 'S' as const, maxVolume: 280 },
  { code: 'M' as const, maxVolume: 840 },
  { code: 'L' as const, maxVolume: 2160 },
  { code: 'XL' as const, maxVolume: 24000 },
]

const SHIPPING_TIERS: Record<'eco' | 'regular' | 'express', { eta: string; minDays: number; maxDays: number; prices: Record<'S' | 'M' | 'L' | 'XL', number> }> = {
  eco: { eta: '3-5 business days', minDays: 3, maxDays: 5, prices: { S: 250, M: 350, L: 550, XL: 1800 } },
  regular: { eta: '2-3 business days', minDays: 2, maxDays: 3, prices: { S: 350, M: 500, L: 750, XL: 2600 } },
  express: { eta: '1-2 business days', minDays: 1, maxDays: 2, prices: { S: 550, M: 750, L: 1100, XL: 3800 } },
}

export default function CheckoutStep1() {
  const [currentStep, setCurrentStep] = useState(0)
  const [Ordering, setOrdering] = useState(false)
  const { status: sessionStatus } = useSession()
  const [formData, setFormData] = useState<any>(null)
  const [checkoutStateId, setCheckoutStateId] = useState<string | null>(null)
  // Billing form action state
  const [actionState, formAction] = useActionState(createOrder, { success: false, message: '' })
  const { cart, loading, clearCart } = useCart()
  const router = useRouter()
  const searchParams = useSearchParams()

  // local payment method state for conditional rendering
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash on Delivery')
  const [shippingTier, setShippingTier] = useState<'eco' | 'regular' | 'express'>('regular')
  const [parcelSize, setParcelSize] = useState<'S' | 'M' | 'L' | 'XL'>('M')

  // Restore saved billing data when returning from Stripe (e.g., 3DS redirect)
  useEffect(() => {
    const stateFromUrl = searchParams.get('state') || null
    if (stateFromUrl) {
      setCheckoutStateId(stateFromUrl)
    }
    try {
      if (typeof window !== 'undefined') {
        const key = stateFromUrl ? `checkoutFormData:${stateFromUrl}` : null
        const saved = (key && (window.sessionStorage.getItem(key) || window.localStorage.getItem(key)))
          || window.sessionStorage.getItem('checkoutFormData')
          || window.localStorage.getItem('checkoutFormData')
        if (saved) {
          setFormData(JSON.parse(saved))
          setCurrentStep(1)
        }
      }
    } catch (err) {
      console.error('failed to restore checkout form data', err)
    }
  }, [])

  useEffect(() => {
    // show toast when actionState message changes
    if (actionState.message) {
      if (actionState.success) {
        toast.success(actionState.message)
        try {
          if (typeof clearCart === 'function') clearCart()
          if (typeof window !== 'undefined') {
            window.sessionStorage.removeItem('checkoutFormData')
            window.localStorage.removeItem('checkoutFormData')
          }
        } catch (err) {
          console.error('failed to clear cart', err)
        }
        // redirect to home
        router.push('/')
      }
      else {
        toast.error(actionState.message)
      }
    }
  }, [actionState.message, actionState.success, router, clearCart])

  const handleStripePaymentSuccess = (paymentIntentId: string) => {
    // After successful Stripe payment, submit the order with payment details
    setOrdering(true)
    let payload = formData
    if (!payload && typeof window !== 'undefined') {
      try {
        const key = checkoutStateId ? `checkoutFormData:${checkoutStateId}` : null
        const saved = (key && (window.sessionStorage.getItem(key) || window.localStorage.getItem(key)))
          || window.sessionStorage.getItem('checkoutFormData')
          || window.localStorage.getItem('checkoutFormData')
        if (saved) payload = JSON.parse(saved)
      } catch (err) {
        console.error('failed to read saved checkout form data', err)
        setOrdering(false)
        return
      }
    }
    if (!payload) {
      toast.error('Unable to submit order. Please return to billing and try again.')
      setCurrentStep(0)
      setOrdering(false)
      return
    }
    
    const f = new FormData()
    Object.entries(payload).forEach(([key, value]) => {
      f.append(key, String(value))
    })
    f.append('paymentIntentId', paymentIntentId)
    f.append('paymentStatus', 'completed')
    
    startTransition(() => {
      void formAction(f)
    })
    setOrdering(false)
    
    // Clear cart and stored form data after successful payment
    try {
      if (typeof clearCart === 'function') clearCart()
      if (typeof window !== 'undefined') {
        if (checkoutStateId) {
          window.sessionStorage.removeItem(`checkoutFormData:${checkoutStateId}`)
          window.localStorage.removeItem(`checkoutFormData:${checkoutStateId}`)
        }
        window.sessionStorage.removeItem('checkoutFormData')
        window.localStorage.removeItem('checkoutFormData')
      }
    } catch (err) {
      console.error('Failed to clear cart after payment', err)
      setOrdering(false)
    }
    
    // Optimistically redirect to home/confirmation while the action resolves
    router.push('/')
    setCurrentStep(0)
    setOrdering(false)
  }

  // Calculate totals from cart
  const subtotal = cart.reduce((sum, item) => sum + (item.product.salePrice || item.product.price) * item.quantity, 0)
  const shipping = SHIPPING_TIERS[shippingTier].prices[parcelSize]
  const total = subtotal + shipping

  return (
    <>
      {currentStep === 0 && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setOrdering(true)
            // ensure user is signed in before attempting to place order
            if (sessionStatus !== 'authenticated') {
              toast.error('Please login to place an order')
              // redirect to login/signin page
              router.push('/api/auth/signin')
              return
            }
            const f = new FormData(e.currentTarget as HTMLFormElement)

            // basic required fields validation
            const required = [
              'firstName',
              'lastName',
              'email',
              'phone',
              'address',
              'city',
              'state',
              'country',
              'postalCode',
              'paymentMethod',
            ]

            for (const key of required) {
              const val = String(f.get(key) ?? '').trim()
              if (!val) {
                toast.error('Please fill all required fields.')
                return
              }
            }

            // email validation
            const email = String(f.get('email') ?? '').trim()
            const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRe.test(email)) {
              toast.error('Enter a valid email address.')
              return
            }

            // cart must not be empty
            if (!Array.isArray(cart) || cart.length === 0) {
              toast.error('Your cart is empty.')
              return
            }

            // append extra data
            f.append('subtotal', String(subtotal))
            f.append('shipping', String(shipping))
            f.append('shippingTier', shippingTier)
            f.append('parcelSize', parcelSize)
            f.append('total', String(total))
            f.append('cart', JSON.stringify(cart))

            // If Stripe payment, store form data and go to payment step
            if (paymentMethod === 'Credit/Debit Card') {
              const fdObject = Object.fromEntries(f)
              setFormData(fdObject)
              const stateId = `cs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
              setCheckoutStateId(stateId)
              try {
                if (typeof window !== 'undefined') {
                  const key = `checkoutFormData:${stateId}`
                  window.sessionStorage.setItem(key, JSON.stringify(fdObject))
                  window.localStorage.setItem(key, JSON.stringify(fdObject))
                  // keep legacy keys as fallback
                  window.sessionStorage.setItem('checkoutFormData', JSON.stringify(fdObject))
                  window.localStorage.setItem('checkoutFormData', JSON.stringify(fdObject))
                }
              } catch (err) {
                console.error('failed to persist checkout form data', err)
              }
              setCurrentStep(1)
              return
            }

            // call formAction inside a transition to satisfy useActionState requirement
            startTransition(() => {
              void formAction(f)
            })
            setOrdering(false)
          }}
          className="px-[75px] py-[100px] mx-auto grid grid-cols-1 lg:grid-cols-2 rounded-lg shadow-[0_0_10px_rgba(0,0,0,0.15)]"
        >
          {/* Billing Address Left */}
          <div className="bg-white p-10 rounded-tl-lg rounded-bl-lg">
            <h2 className="text-2xl font-bold mb-8">BILLING ADDRESS</h2>
            {/* Inputs with name attributes for createOrder */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div><label>First Name*</label><input name="firstName" type="text" className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-[2px]" /></div>
              <div><label>Last Name*</label><input name="lastName" type="text" className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-[2px]" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div><label>Email*</label><input name="email" type="email" className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-[2px]" /></div>
              <div><label>Phone*</label><input name="phone" type="text" className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-[2px]" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div><label>Address*</label><input name="address" type="text" className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-[2px]" /></div>
              <div><label>City*</label><input name="city" type="text" className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-[2px]" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div><label>State*</label><input name="state" type="text" className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-[2px]" /></div>
              <div><label>Country*</label><input name="country" type="text" className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-[2px]" /></div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div><label>Postal Code*</label><input name="postalCode" type="text" className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-[2px]" /></div>
              <div>
                <label>Payment Method*</label>
                <select
                  name="paymentMethod"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-[2px]"
                >
                  <option value="Cash on Delivery">Cash on Delivery</option>
                  <option value="Credit/Debit Card">Credit/Debit Card</option>
                </select>
              </div>
            </div>

            {/* Shipping Options */}
            <h3 className="text-lg font-bold mb-4">SHIPPING OPTIONS</h3>
            
            {/* Parcel Size Selection */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-3">Select Parcel Size*</label>
              <div className="grid grid-cols-4 gap-2">
                {PARCELS.map((parcel) => (
                  <button
                    key={parcel.code}
                    type="button"
                    onClick={() => setParcelSize(parcel.code)}
                    className={`p-3 rounded-md border-2 font-semibold transition ${
                      parcelSize === parcel.code
                        ? 'border-[#FFA500] bg-[#FFA500] text-white'
                        : 'border-gray-300 bg-gray-50 text-gray-700 hover:border-[#FFA500]'
                    }`}
                  >
                    {parcel.code}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">Max volume: {PARCELS.find(p => p.code === parcelSize)?.maxVolume} cm³</p>
            </div>
            {/* Shipping Tier Selection */}
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-3">Select Shipping Speed*</label>
              <div className="space-y-2">
                {(Object.entries(SHIPPING_TIERS) as Array<[keyof typeof SHIPPING_TIERS, typeof SHIPPING_TIERS['eco']]>).map(([tier, details]) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setShippingTier(tier)}
                    className={`w-full p-4 rounded-md border-2 text-left transition ${
                      shippingTier === tier
                        ? 'border-[#FFA500] bg-orange-50'
                        : 'border-gray-300 bg-white hover:border-[#FFA500]'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold capitalize text-gray-900">{tier}</p>
                        <p className="text-sm text-gray-600">{details.eta}</p>
                      </div>
                      <p className="font-bold text-[#FFA500]">Rs. {details.prices[parcelSize]}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary Right */}
          <div className="flex flex-col justify-between bg-[#ffa500] p-10 rounded-tr-lg rounded-br-lg text-white">
            <div className="space-y-6">
              {loading
                ? <p>Loading cart...</p>
                : cart.map(item => (
                  <div key={item.product._id} className="flex justify-between border-b pb-2">
                    <div className="flex items-center gap-2">
                      <Image src={item.product.images[0]} alt={item.product.name} width={40} height={40} />
                      <p className='font-bold'>{item.product.name} x{item.quantity}</p>
                    </div>
                    <span>Rs. {((item.product.salePrice || item.product.price) * item.quantity).toFixed(2)}</span>
                  </div>
                ))
              }
            </div>
            <div className="pt-4 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>Rs. {subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>Rs. {shipping.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-lg"><span>Total</span><span>Rs. {total.toFixed(2)}</span></div>

              {/* conditional rendering based on paymentMethod */}
              {paymentMethod === 'Cash on Delivery' ? (
                <button
                  className="w-full bg-black text-white text-sm font-semibold py-3 mt-4 rounded shadow hover:bg-gray-800"
                  type="submit"
                >
                  {Ordering ? 'PROCESSING...' : 'PLACE ORDER'}
                </button>
              ) : (
                <button
                  type="submit"
                  className="w-full bg-black text-white text-sm font-semibold py-3 mt-4 rounded shadow hover:bg-gray-800"
                >
                  {Ordering ? 'PROCESSING...' : 'PROCEED TO PAYMENT'}
                </button>
              )}
            </div>
          </div>
        </form>
      )}

      {/* Step 1: Stripe Payment */}
      {currentStep === 1 && (
        <div className="px-[75px] py-[100px] mx-auto max-w-2xl">
          <div className="flex items-center justify-between mb-8">
            <button
              type="button"
              onClick={() => setCurrentStep(0)}
              className="text-sm font-semibold text-[#FFA500] hover:text-orange-600"
            >
              Back to billing
            </button>
            <div className="text-right">
              <p className="text-xs text-gray-500">Amount due</p>
              <p className="text-2xl font-bold text-[#FFA500]">Rs. {total.toFixed(2)}</p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-[0_0_10px_rgba(0,0,0,0.1)] border border-gray-100">
            <StripePayment
              amount={total}
              onSuccess={handleStripePaymentSuccess}
              onCancel={() => setCurrentStep(0)}
              returnUrl={typeof window !== 'undefined' ? `${window.location.origin}/checkout${checkoutStateId ? `?state=${checkoutStateId}` : ''}` : undefined}
            />
          </div>
        </div>
      )}
    </>
  )
}
