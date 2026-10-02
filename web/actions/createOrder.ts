"use server"
/* eslint-disable @typescript-eslint/no-explicit-any */

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';


export async function createOrder(
  _prevState: any,
  formData: FormData
): Promise<{ success: boolean; message: string }> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { success: false, message: 'Not logged in' };
  }

  // Read form fields
  const firstName = String(formData.get('firstName') ?? '')
  const lastName = String(formData.get('lastName') ?? '')
  const email = String(formData.get('email') ?? '')
  const phone = String(formData.get('phone') ?? '')
  const address = String(formData.get('address') ?? '')
  const city = String(formData.get('city') ?? '')
  const state = String(formData.get('state') ?? '')
  const country = String(formData.get('country') ?? '')
  const postalCode = String(formData.get('postalCode') ?? '')
  const paymentMethod = String(formData.get('paymentMethod') ?? 'Cash on Delivery')
  const incomingPaymentStatus = String(formData.get('paymentStatus') ?? '')
  const paymentIntentId = String(formData.get('paymentIntentId') ?? '')

  // Parse cart (we append JSON from the client)
  let cart: any[] = []
  try {
    const cartRaw = formData.get('cart')
    if (typeof cartRaw === 'string' && cartRaw.length) {
      cart = JSON.parse(cartRaw)
    } else if (cartRaw instanceof Blob) {
      const txt = await cartRaw.text()
      cart = JSON.parse(txt || '[]')
    }
  } catch (err) {
    console.error('createOrder: failed to parse cart', err)
    cart = []
  }

  // Build items array; support temp products (missing _id) by sending productSnapshot
  const items = cart.map((it: any) => {
    const product = it.product ?? {}
    const quantity = Number(it.quantity ?? 1)
    const price = Number(product.salePrice ?? product.price ?? 0)
    const salePrice = typeof product.salePrice !== 'undefined' ? Number(product.salePrice) : undefined
    const sellerId = product.seller ?? product.sellerId ?? undefined
    const isTemp = it.isTemporary === true || product.isTemporary === true || product.isTemp === true

    const base: any = {
      seller: sellerId,
      quantity,
      price,
      ...(typeof salePrice !== 'undefined' ? { salePrice } : {}),
    }

    if (isTemp) {
      base.product = null
      base.productSnapshot = product
    } else {
      base.product = product._id
    }
    return base
  })

  // const hasTempProducts = items.some((it: any) => !it.product && it.productSnapshot)

  const subtotal = Number(formData.get('subtotal') ?? items.reduce((s: number, i: any) => s + (i.salePrice ?? i.price) * i.quantity, 0))
  const shipping = Number(formData.get('shipping') ?? 0)
  const totalAmount = Number(formData.get('total') ?? subtotal + shipping)
  const shippingMethod = String(formData.get('shippingTier') ?? 'regular')

  // Determine seller from first item if you still need it elsewhere
  // const firstProduct = cart[0]?.product ?? {}
  // const topSeller = firstProduct?.seller ?? firstProduct?.sellerId ?? undefined

  // Build final payload to send to backend API
  const body: Record<string, any> = {
    // required by Order schema
    user: session.user?.id ?? undefined,
    customer: {
      firstName,
      lastName,
      email,
      phoneNumber: phone,
    },
    // Include items; backend now supports productSnapshot for temp items
    items,
    totalAmount,
    status: 'pending',
    shippingAddress: {
      street: address,
      city,
      state,
      country,
      zipCode: postalCode,
    },
    paymentStatus: incomingPaymentStatus || (paymentMethod === 'Cash on Delivery' ? 'pending' : 'completed'),
    paymentMethod,
    shippingMethod,
  }

  if (paymentIntentId) {
    body.paymentIntentId = paymentIntentId
  }

  // Remove undefined fields (backend may require them)
  Object.keys(body).forEach(k => {
    if (typeof body[k] === 'undefined') delete body[k]
  })

  let res: Response | undefined;
  const token = session.backendToken || session.accessToken;

  try {
    res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });
  } catch (err) {
    console.error('createOrder: network error', err)
    return { success: false, message: 'Network error' }
  }

  if (!res?.ok) {
    let msg = `HTTP ${res?.status}`
    try {
      const err = await res.json()
      msg = err.message || err.msg || err.error || Array.isArray(err.errors) && err.errors[0]?.msg || msg
    } catch {
      // ignore
    }
    return { success: false, message: msg }
  }


  // Clear any static or dynamic cache if needed
  revalidatePath("/cart");

  return {
    success: true,
    message: 'Order placed successfully!'
  };
}
