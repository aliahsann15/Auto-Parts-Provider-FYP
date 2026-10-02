'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect } from 'react'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

interface StripePaymentProps {
  amount: number
  onSuccess: (paymentIntentId: string) => void
  onCancel: () => void
  returnUrl?: string
}

interface StripePaymentFormProps {
  amount: number
  clientSecret: string
  paymentIntentId: string | null
  onSuccess: (paymentIntentId: string) => void
  onCancel: () => void
  returnUrl?: string
}

interface StripePaymentFormProps extends StripePaymentProps {
  clientSecret: string
  paymentIntentId: string | null
}

const StripePaymentForm: React.FC<StripePaymentFormProps> = ({
  amount,
  onSuccess,
  onCancel,
  clientSecret,
  paymentIntentId,
  returnUrl,
}) => {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [reported, setReported] = useState(false)

  // If the user returns from a Stripe redirect (3DS, etc.), confirm status and continue order placement.
  useEffect(() => {
    const checkStatus = async () => {
      if (!stripe || !clientSecret || reported) return
      try {
        const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret)
        if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
          setReported(true)
          onSuccess(paymentIntent.id)
        }
      } catch (err) {
        console.warn('Stripe status check failed', err)
      }
    }
    void checkStatus()
  }, [stripe, clientSecret, reported, onSuccess])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      toast.error('Payment not ready. Please try again.')
      return
    }

    const { error: submitError } = await elements.submit()
    if (submitError) {
      toast.error(submitError.message || 'Payment details incomplete')
      return
    }

    setProcessing(true)

    try {
      const result = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: returnUrl || `${window.location.origin}/checkout?success=true`,
        },
        redirect: 'if_required',
      })

      if (result.error) {
        toast.error(result.error.message || 'Payment failed')
      } else if (result.paymentIntent?.status === 'succeeded') {
        toast.success('Payment successful!')
        setReported(true)
        onSuccess(paymentIntentId || result.paymentIntent.id)
      } else if (result.paymentIntent?.status === 'processing') {
        toast.info('Payment is processing...')
        setReported(true)
        onSuccess(paymentIntentId || result.paymentIntent.id)
      } else if (result.paymentIntent) {
        onSuccess(paymentIntentId || result.paymentIntent.id)
      }
    } catch (error: any) {
      console.error('Payment error:', error)
      toast.error(error.message || 'Payment failed')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold">Payment Details</h3>
      <p className="text-gray-600 text-sm">Securely pay Rs. {amount.toFixed(2)} using Stripe</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-lg border border-gray-300">
          <PaymentElement
            options={{
              layout: 'tabs',
            }}
          />
        </div>

        <div className="text-lg font-bold">
          Total Amount: <span className="text-[#FFA500]">Rs. {amount.toFixed(2)}</span>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
            className="flex-1 bg-gray-200 text-gray-800 px-4 py-3 rounded font-semibold hover:bg-gray-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={processing || !stripe}
            className="flex-1 bg-[#FFA500] text-white px-4 py-3 rounded font-semibold hover:bg-orange-600 disabled:opacity-50"
          >
            {processing ? 'Processing...' : 'Pay Now'}
          </button>
        </div>
      </form>
    </div>
  )
}

const StripePayment: React.FC<StripePaymentProps> = ({ amount, onSuccess, onCancel, returnUrl }) => {
  const { data: session } = useSession()
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)

  const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:4000').replace(/\/$/, '')
  const token = (session as any)?.backendToken || (session as any)?.accessToken

  useEffect(() => {
    if (!token || !session) return

    setClientSecret(null)
    setPaymentIntentId(null)

    const initializePayment = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/payments/intent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amountPkr: amount,
            currency: 'usd',
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.msg || 'Failed to create payment intent')
        }

        const data = await response.json()
        setClientSecret(data.clientSecret)
        setPaymentIntentId(data.paymentIntentId)
      } catch (err: any) {
        console.error('Failed to initialize payment:', err)
        toast.error('Failed to initialize payment. Please try again.')
      }
    }

    void initializePayment()
  }, [token, session, amount, API_BASE])

  if (!clientSecret) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#FFA500]"></div>
        <p className="mt-2 text-gray-600">Initializing payment...</p>
      </div>
    )
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <StripePaymentForm
        amount={amount}
        onSuccess={onSuccess}
        onCancel={onCancel}
        clientSecret={clientSecret}
        paymentIntentId={paymentIntentId}
        returnUrl={returnUrl || (typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}${window.location.search}` : undefined)}
      />
    </Elements>
  )
}


export default StripePayment
