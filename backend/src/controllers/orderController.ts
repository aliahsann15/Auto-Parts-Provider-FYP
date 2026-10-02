import { Request, Response } from 'express'
import { HydratedDocument } from 'mongoose'
import mongoose from 'mongoose'
import Order, { IOrder } from '../models/Order'
import ReturnModel from '../models/Return'
import Cart from '../models/Cart'
import Product from '../models/Product'
import ReturnModel, { IReturn, IReturnItem } from '../models/Return'
import { AuthRequest } from '../middleware/authMiddleware'
import { generateTrackingNumber } from '../utils/trackingGenerator'
import { createNotification } from '../utils/notificationService'
import { sendPushToUserTokens } from '../utils/pushService'
import { sendMail } from '../utils/mailer'
import User from '../models/User'
import { getProductWarrantyData } from '../utils/warrantyUtils'

type ShippingTier = 'eco' | 'regular' | 'express'
type ParcelCode = 'S' | 'M' | 'L' | 'XL'

const PARCELS: { code: ParcelCode; maxVolume: number }[] = [
  { code: 'S', maxVolume: 280 },
  { code: 'M', maxVolume: 840 },
  { code: 'L', maxVolume: 2160 },
  { code: 'XL', maxVolume: 24000 },
]

const SHIPPING_TIERS: Record<ShippingTier, { minDays: number; maxDays: number; prices: Record<ParcelCode, number> }> = {
  eco: { minDays: 3, maxDays: 5, prices: { S: 250, M: 350, L: 550, XL: 1800 } },
  regular: { minDays: 2, maxDays: 3, prices: { S: 350, M: 500, L: 750, XL: 2600 } },
  express: { minDays: 1, maxDays: 2, prices: { S: 550, M: 750, L: 1100, XL: 3800 } },
}

const getParcelForVolume = (volume: number): ParcelCode => {
  const found = PARCELS.find(p => volume <= p.maxVolume)
  return (found?.code ?? 'XL') as ParcelCode
}

const computeArrivalText = (method?: string) => {
  const m = (method || '').toLowerCase() as ShippingTier
  const tier = SHIPPING_TIERS[m]
  if (!tier) return undefined
  const today = new Date()
  const start = addDaysUtc(today, tier.minDays)
  const end = addDaysUtc(today, tier.maxDays)
  const format = (d: Date) => d.toISOString().split('T')[0]
  return tier.minDays === tier.maxDays
    ? format(end)
    : `${format(start)} - ${format(end)}`
}

const buildOrderEmail = ({
  storeName,
  items,
  orderNumber,
  customer,
  arrivalText,
  shippingAddr,
}: {
  storeName: string
  items: any[]
  orderNumber: string
  customer: any
  arrivalText?: string
  shippingAddr?: any
}) => {
  const rows = items
    .map(it => {
      const title =
        it.productSnapshot?.name ||
        it.productSnapshot?.productName ||
        it.productSnapshot?.partName ||
        it.product?.name ||
        it.product?.productName ||
        it.product?.partName ||
        'Item'
      const qty = it.quantity || 1
      const unit =
        typeof it.salePrice === 'number' && it.salePrice < (it.price || 0) ? it.salePrice : it.price || 0
      const subtotal = unit * qty
      return `<tr>
        <td style="padding:8px 4px;border:1px solid #eee;font-size:14px;">${title}</td>
        <td style="padding:8px 4px;border:1px solid #eee;font-size:14px;text-align:center;">${qty}</td>
        <td style="padding:8px 4px;border:1px solid #eee;font-size:14px;text-align:right;">PKR ${
          unit?.toLocaleString?.() || unit
        }</td>
        <td style="padding:8px 4px;border:1px solid #eee;font-size:14px;text-align:right;">PKR ${
          subtotal?.toLocaleString?.() || subtotal
        }</td>
      </tr>`
    })
    .join('')

  const total = items.reduce((sum, it) => {
    const unit =
      typeof it.salePrice === 'number' && it.salePrice < (it.price || 0) ? it.salePrice : it.price || 0
    return sum + unit * (it.quantity || 1)
  }, 0)

  return `
    <div style="font-family:Arial,sans-serif;color:#222;">
      <h2 style="margin:0 0 8px;">New order from ${customer?.firstName || 'Buyer'} ${customer?.lastName || ''}</h2>
      <p style="margin:0 0 16px;">Order Number: <strong>${orderNumber}</strong></p>
      <table style="border-collapse:collapse;width:100%;margin-bottom:16px;">
        <thead>
          <tr>
            <th style="text-align:left;padding:8px 4px;border:1px solid #eee;">Item</th>
            <th style="text-align:center;padding:8px 4px;border:1px solid #eee;">Qty</th>
            <th style="text-align:right;padding:8px 4px;border:1px solid #eee;">Price</th>
            <th style="text-align:right;padding:8px 4px;border:1px solid #eee;">Subtotal</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="font-size:14px;margin:0 0 4px;">Total: <strong>PKR ${total.toLocaleString()}</strong></p>
      ${arrivalText ? `<p style="font-size:14px;margin:0 0 4px;">Shipping: ${arrivalText}</p>` : ''}
      ${
        shippingAddr
          ? `<p style="font-size:14px;margin:0 0 4px;">Ship to: ${shippingAddr.addressLine1 || ''} ${shippingAddr.city || ''} ${shippingAddr.country || ''}</p>`
          : ''
      }
      <p style="font-size:13px;color:#555;margin-top:12px;">Thank you,<br/>${storeName || 'Your store'} team</p>
      </div>
  `
}
const generateNumericOrderNumber = () => Math.floor(100000 + Math.random() * 900000).toString()

const ensureUniqueOrderNumber = async () => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateNumericOrderNumber()
    const exists = await Order.exists({ orderNumber: candidate })
    if (!exists) {
      return candidate
    }
  }
  return Math.floor(Date.now() % 1000000)
    .toString()
    .padStart(6, '0')
}
import { getEffectiveSellerId } from '../utils/sellerHelper'

// Default to Pakistan time; override with REPORT_TZ env if needed. Expected format: +05:00 or -04:00
const REPORT_TZ = process.env.REPORT_TZ || '+05:00'
const MS_DAY = 24 * 60 * 60 * 1000

const collectPendingReturnQuantities = async (orderId?: mongoose.Types.ObjectId) => {
  const map = new Map<string, number>()
  if (!orderId) return map
  const docs = await ReturnModel.find({
    order: orderId,
    status: { $nin: ['cancelled'] }, // keep every request once it exists
  })
    .select('items')
    .lean<{ items?: IReturnItem[] }[]>()

  docs.forEach(doc => {
    doc.items?.forEach(item => {
      if (!item.orderItemId) return
      const key = `${orderId}-${String(item.orderItemId)}`
      map.set(key, (map.get(key) || 0) + Number(item.quantity || 0))
    })
  })

  return map
}

const annotateOrderItemsWithReturnData = (
  items: IOrder['items'],
  pendingMap: Map<string, number>,
  orderId?: mongoose.Types.ObjectId
) => {
  const orderKey = orderId ? String(orderId) : ''
  return items.map(item => {
    const base = (item as any)?.toObject?.() ?? { ...item }
    const itemId = base._id ? String(base._id) : base.id ? String(base.id) : ''
    const pendingQty = itemId && orderKey ? pendingMap.get(`${orderKey}-${itemId}`) || 0 : 0
    const quantity = Number(base.quantity || 0)
    const returnableQuantity = Math.max(0, quantity - pendingQty)
    return {
      ...base,
      pendingReturnQuantity: pendingQty,
      returnableQuantity,
    }
  })
}

const collectPendingReturnQuantitiesForOrders = async (orderIds: mongoose.Types.ObjectId[]) => {
  const map = new Map<string, number>()
  if (!orderIds.length) return map
  const docs = await ReturnModel.find({
    order: { $in: orderIds },
    status: { $nin: ['cancelled'] },
  })
    .select('order items')
    .lean<{ order?: mongoose.Types.ObjectId; items?: IReturnItem[] }[]>()

  docs.forEach(doc => {
    const orderKey = doc.order ? String(doc.order) : ''
    doc.items?.forEach(item => {
      if (!item.orderItemId || !orderKey) return
      const key = `${orderKey}-${String(item.orderItemId)}`
      map.set(key, (map.get(key) || 0) + Number(item.quantity || 0))
    })
  })

  return map
}

const normalizeObjectId = (value: any): mongoose.Types.ObjectId | undefined => {
  if (!value) return undefined
  if (value instanceof mongoose.Types.ObjectId) return value
  const str = String(value)
  if (mongoose.Types.ObjectId.isValid(str)) {
    return new mongoose.Types.ObjectId(str)
  }
  return undefined
}

const parseOffsetMinutes = (tz: string) => {
  const m = tz.match(/([+-])(\d{2}):(\d{2})/)
  if (!m) return 0
  const sign = m[1] === '-' ? -1 : 1
  const hours = Number(m[2])
  const minutes = Number(m[3])
  return sign * (hours * 60 + minutes)
}

const offsetMinutes = parseOffsetMinutes(REPORT_TZ)
const offsetMs = offsetMinutes * 60 * 1000

// Build a Date representing midnight of y-m-d in the configured report timezone.
const buildReportMidnight = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d) - offsetMs)

// Parse YYYY-MM-DD as midnight in the configured report timezone.
const parseLocalDateString = (val: string | undefined | null) => {
  if (!val) return null
  const [y, m, d] = val.split('-').map(v => Number(v))
  if (!y || !m || !d) return null
  return buildReportMidnight(y, m, d)
}

// Take any Date and return midnight for that calendar day in the configured timezone.
const zonedStartOfDay = (date: Date) => {
  const shifted = new Date(date.getTime() + offsetMs) // shift into report tz
  const y = shifted.getUTCFullYear()
  const m = shifted.getUTCMonth() + 1
  const d = shifted.getUTCDate()
  return buildReportMidnight(y, m, d)
}

const addDaysUtc = (date: Date, days: number) => new Date(date.getTime() + days * MS_DAY)

type OrderDoc = HydratedDocument<IOrder>

// Create a new order from cart or from client-provided items (validated server-side)
export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ msg: 'Not authenticated' })

    const {
      shippingAddress,
      paymentMethod,
      items: incomingItems,
      totalAmount: incomingTotal,
      customer,
      status: incomingStatus,
      paymentStatus: incomingPaymentStatus,
      shippingFee: incomingShippingFee = 0,
    inspectionFee = 0,
    promoDiscount = 0,
    autoPartsInspection = false,
      shippingMethod,
      arrivalText,
    } = req.body as {
      shippingAddress?: any
      paymentMethod?: string
      items?: any[]
      totalAmount?: number
      customer?: any
      status?: string
      paymentStatus?: string
      shippingFee?: number
      inspectionFee?: number
      promoDiscount?: number
      autoPartsInspection?: boolean
      shippingMethod?: ShippingTier | string
      arrivalText?: string
    }
    let shippingFeeTotal = 0

    // If client supplied items, validate each and compute total on server
    let orderItems: any[] = []
    let totalAmount = 0
    const sellerTotals: Record<string, number> = {}
    const sellerShipping: Record<string, number> = {}

    if (Array.isArray(incomingItems) && incomingItems.length > 0) {
      for (const it of incomingItems) {
        const quantity = Number(it.quantity ?? 1)
        let product: any = null
        let isTemp = false

        if (it.productSnapshot && (!it.product || it.product === 'null')) {
          // temporary product provided by client
          product = it.productSnapshot
          isTemp = true
        } else {
          const productId = it.product
          if (!productId) return res.status(400).json({ msg: 'Invalid item: missing product id' })
          product = await Product.findById(productId)
          if (!product) return res.status(400).json({ msg: `Product ${productId} not found` })
        }

        const price = product.price ?? 0
        const salePrice = product.salePrice ?? undefined
        const unit = salePrice || price
        totalAmount += unit * quantity

        const itemReturnDays =
          typeof (product as any)?.returnDays === 'number'
            ? Number((product as any)?.returnDays)
            : undefined
        const warrantyInfo = getProductWarrantyData(product)
        const snapshotBase = isTemp
          ? product
          : {
              name: product.name || product.productName || product.partName,
              productName: product.name || product.productName,
              partName: product.partName,
              make: product.make,
              carModel: product.carModel,
              variant: product.variant,
              returnDays: itemReturnDays,
            }
        const snapshot = {
          ...snapshotBase,
          images: Array.isArray(product.images) ? product.images : snapshotBase?.images ?? [],
          ...(warrantyInfo.durationValue !== undefined
            ? { warrantyDurationValue: warrantyInfo.durationValue }
            : {}),
          ...(warrantyInfo.durationUnit
            ? { warrantyDurationUnit: warrantyInfo.durationUnit }
            : {}),
        }

        orderItems.push({
          product: isTemp ? null : product._id,
          productSnapshot: snapshot,
          seller: product.seller ?? it.seller ?? undefined,
          quantity,
          price,
          ...(typeof salePrice !== 'undefined' ? { salePrice } : {}),
          returnDays: itemReturnDays,
        })
        if (product.seller) {
          const sid = product.seller.toString()
          sellerTotals[sid] = (sellerTotals[sid] || 0) + unit * quantity
        }
        const volume =
          Number(product?.dimensions?.length || 0) *
          Number(product?.dimensions?.width || 0) *
          Number(product?.dimensions?.height || 0) *
          Math.max(1, quantity)
        const sellerKey = product.seller ? product.seller.toString() : 'unknown'
        sellerShipping[sellerKey] = (sellerShipping[sellerKey] || 0) + volume
      }
    } else {
      // Fallback: build items from the authenticated user's cart
      const cart = await Cart.findOne({ user: req.user.userId }).populate('items.product')
      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ msg: 'Cart is empty' })
      }

      for (const item of cart.items) {
        let product: any = null
        const cartItemAny = item as any
        
        // Check if this is a temporary product from accepted offer
        if (cartItemAny.tempProductData) {
          // Use temporary product data instead of database product
          product = cartItemAny.tempProductData
        } else {
          // Regular product from database
          product = await Product.findById(item.product)
          if (!product) return res.status(400).json({ msg: `Product ${item.product} not found` })
        }

        const price = product.price ?? 0
        const salePrice = product.salePrice ?? undefined
        const unit = salePrice || price
        totalAmount += unit * item.quantity

        const itemReturnDays =
          typeof (product as any)?.returnDays === 'number'
            ? Number((product as any)?.returnDays)
            : undefined
        const snapshotBase = cartItemAny.tempProductData
          ? product
          : {
              name: product.name || product.productName || product.partName,
              productName: product.name || product.productName,
              partName: product.partName,
              make: product.make,
              carModel: product.carModel,
              variant: product.variant,
              returnDays: itemReturnDays,
            }
        const warrantyInfo = getProductWarrantyData(product)
        const snapshot = {
          ...snapshotBase,
          images: Array.isArray(product.images) ? product.images : snapshotBase?.images ?? [],
          ...(warrantyInfo.durationValue !== undefined
            ? { warrantyDurationValue: warrantyInfo.durationValue }
            : {}),
          ...(warrantyInfo.durationUnit
            ? { warrantyDurationUnit: warrantyInfo.durationUnit }
            : {}),
        }

        orderItems.push({
          product: cartItemAny.tempProductData ? null : product._id, // null for temp products
          productSnapshot: snapshot, // Store full temp product data or snapshot for regular
          seller: product.seller ?? undefined,
          quantity: item.quantity,
          price,
          ...(typeof salePrice !== 'undefined' ? { salePrice } : {}),
          returnDays: itemReturnDays,
        })
        if (product.seller) {
          const sid = product.seller.toString()
          sellerTotals[sid] = (sellerTotals[sid] || 0) + unit * item.quantity
        }
        const volume =
          Number(product?.dimensions?.length || 0) *
          Number(product?.dimensions?.width || 0) *
          Number(product?.dimensions?.height || 0) *
          Math.max(1, item.quantity)
        const sellerKey = product.seller ? product.seller.toString() : 'unknown'
        sellerShipping[sellerKey] = (sellerShipping[sellerKey] || 0) + volume
      }
    }

    // Convert accumulated volumes into per-seller shipping fees
    const tierKey = (shippingMethod || 'regular').toString().toLowerCase() as ShippingTier
    const tier = SHIPPING_TIERS[tierKey] || SHIPPING_TIERS.regular
    const sellerShippingFees: Record<string, number> = {}
    Object.entries(sellerShipping).forEach(([sid, volume]) => {
      const parcel = getParcelForVolume(Number(volume) || 0)
      const fee = tier.prices[parcel] || 0
      sellerShippingFees[sid] = fee
      shippingFeeTotal += fee
    })

    const customerFirst = customer?.firstName || shippingAddress?.firstName || shippingAddress?.name || 'Customer'
    const explicitLastName =
      typeof customer?.lastName === 'string' ? customer.lastName.trim() : ''
    const savedShippingLastName =
      typeof shippingAddress?.lastName === 'string' ? shippingAddress.lastName.trim() : ''
    const customerLast = explicitLastName || savedShippingLastName || 'Customer'

    if (explicitLastName) {
      await User.findByIdAndUpdate(req.user.userId, { lastName: explicitLastName })
    }
    const customerEmail = customer?.email || shippingAddress?.email || 'no-email@example.com'
    const customerPhone = customer?.phoneNumber || shippingAddress?.phoneNumber || 'N/A'

    const shippingAddr = {
      street: shippingAddress?.street || shippingAddress?.fullAddress || 'N/A',
      city: shippingAddress?.city || 'N/A',
      state: shippingAddress?.state || shippingAddress?.province || '',
      country: shippingAddress?.country || 'Pakistan',
      zipCode: shippingAddress?.zipCode || shippingAddress?.postalCode || '00000',
    }

    // Build per-seller orders
    const resolvedPaymentMethod = paymentMethod ?? 'Cash on Delivery'
    const resolvedPaymentStatus =
      incomingPaymentStatus ??
      (resolvedPaymentMethod.toLowerCase().includes('cash') ? 'pending' : 'pending')

    const sellerKeys = Array.from(new Set(
      orderItems.map(it => (
        it.seller?.toString?.() || it.productSnapshot?.seller?.toString?.() || 'unknown'
      ))
    ))
    const totalMerch = sellerKeys.reduce((sum, sid) => sum + (sellerTotals[sid] || 0), 0)
    const ordersCreated: any[] = []

    const allocValue = (base: number, sid: string) => {
      if (!base) return 0
      if (!totalMerch) return base / sellerKeys.length
      const share = sellerTotals[sid] || 0
      return (share / totalMerch) * base
    }

    for (const sid of sellerKeys) {
      const itemsForSeller = orderItems.filter(it => (
        it.seller?.toString?.() || it.productSnapshot?.seller?.toString?.() || 'unknown'
      ) === sid)
      if (!itemsForSeller.length) continue
      const merch = sellerTotals[sid] || 0
      const shipFee = sellerShippingFees[sid] || 0
      const inspectionShare = allocValue(Number(inspectionFee) || 0, sid)
      const promoShare = allocValue(Number(promoDiscount) || 0, sid)
      const orderTotal = Math.max(0, merch + shipFee + inspectionShare - promoShare)

      const orderNumberValue = await ensureUniqueOrderNumber()
      const order = new Order({
        user: req.user.userId,
        customer: {
          firstName: customerFirst,
          lastName: customerLast,
          email: customerEmail,
          phoneNumber: customerPhone,
        },
        items: itemsForSeller,
        totalAmount: orderTotal,
        shippingAddress: shippingAddr,
        paymentMethod: resolvedPaymentMethod,
        status: incomingStatus ?? 'pending',
        deliveredAt:
          (incomingStatus || '').toString().toLowerCase() === 'delivered' ? new Date() : undefined,
        paymentStatus: resolvedPaymentStatus,
        shippingFee: shipFee,
        inspectionFee: inspectionShare,
        promoDiscount: promoShare,
        autoPartsInspection: Boolean(autoPartsInspection),
        grandTotal: orderTotal,
        trackingNumber: generateTrackingNumber(), // Generate unique tracking number
        shippingMethod,
        arrivalText: arrivalText || computeArrivalText(shippingMethod),
        sellerShipping: { [sid]: shipFee },
        orderNumber: orderNumberValue,
      })

      await order.save()
      ordersCreated.push(order)

      // notify this seller
      if (sid !== 'unknown') {
        const orderIdStr = order._id?.toString?.()
        const formattedOrderNumber = order.orderNumber ? `#${order.orderNumber}` : (orderIdStr ? `#${orderIdStr.slice(-6).toUpperCase()}` : 'Order')
        const body = `You’ve received a new order (${formattedOrderNumber}). Prepare it for delivery.`
        const metadata = {
          orderId: orderIdStr,
          orderNumber: formattedOrderNumber,
          route: `/sellerorderdetails?orderId=${orderIdStr}`,
        }
        createNotification(
          sid,
          `New order received - ${formattedOrderNumber}`,
          body,
          'order',
          metadata
        ).catch(() => null)
        sendPushToUserTokens(String(sid), {
          title: `New order received - ${formattedOrderNumber}`,
          body,
          data: { orderId: orderIdStr, type: 'order', route: metadata.route }
        }).catch(() => null)

        // fire off seller email (best effort)
        try {
          const sellerUser = await User.findById(sid).select('email name').lean()
          if (sellerUser?.email) {
            await sendMail({
              to: sellerUser.email,
              subject: `New order ${formattedOrderNumber}`,
              text: `You received a new order (${formattedOrderNumber}).`,
              html: buildOrderEmail({
                storeName: sellerUser.name || 'Your store',
                items: itemsForSeller,
                orderNumber: formattedOrderNumber,
                customer: order.customer,
                arrivalText: order.arrivalText,
                shippingAddr: order.shippingAddress,
              }),
            })
          }
        } catch (mailErr) {
          console.warn('send seller order email failed', mailErr)
        }
      }
    }

    // Decrement product stock (best-effort) - skip temporary products
    for (const it of orderItems) {
      if (!it.product || it.productSnapshot) continue // Skip if no product or is temporary
      await Product.updateOne(
        { _id: it.product },
        { $inc: { stock: -Math.abs(it.quantity || 1) } }
      ).catch(() => null)
    }

    // Clear cart if we used cart fallback
    if (!Array.isArray(incomingItems) || incomingItems.length === 0) {
      const cart = await Cart.findOne({ user: req.user.userId })
      if (cart) {
        cart.items = []
        await cart.save()
      }
    }

    res.status(201).json({ orders: ordersCreated })
  } catch (err) {
    console.error('createOrder error:', err)
    res.status(500).json({ msg: 'Server error', error: (err as Error).message })
  }
}

// Get all orders for a user
export const getUserOrders = async (req: AuthRequest, res: Response) => {
  try {
    // Ensure req.user and req.user.userId exist after authentication
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ msg: 'Not authenticated or user ID missing' });
    }

    const userIdString = req.user.userId;

    const orders = await Order.find({ user: userIdString })
      .populate('items.product')
      .populate({ path: 'customer', select: "name email profileImage" })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const orderIds = orders
      .map(order => normalizeObjectId(order._id))
      .filter((id): id is mongoose.Types.ObjectId => !!id);
    const pendingMap = await collectPendingReturnQuantitiesForOrders(orderIds);
    const enrichedOrders = orders.map(order => {
      const orderId = normalizeObjectId(order._id)
      return {
        ...order,
        items: annotateOrderItemsWithReturnData(order.items ?? [], pendingMap, orderId),
      }
    });

    type ReturnDocSummary = {
      order?: mongoose.Types.ObjectId
      status?: string
      returnNumber?: string
      refundAmount?: number
      requestedAt?: Date
      items?: IReturnItem[]
    }
    const returnDocs: ReturnDocSummary[] = orderIds.length
      ? await ReturnModel.find({ order: { $in: orderIds } })
          .select('order status returnNumber refundAmount requestedAt items')
          .lean<ReturnDocSummary[]>()
      : []
    type ReturnSummaryWithTimestamp = {
      status?: string
      returnNumber?: string
      refundAmount?: number
      requestedAtMs?: number
      hasRejected?: boolean
    }
    const summaryMap: Record<string, ReturnSummaryWithTimestamp> = {}
    const requestedQtyMap: Record<string, number> = {}
    returnDocs.forEach((ret: ReturnDocSummary) => {
      const orderKey = ret.order ? String(ret.order) : ''
      if (!orderKey) return
      const timestamp = ret.requestedAt ? ret.requestedAt.getTime() : 0
      const isRejected = String(ret.status || '').toLowerCase() === 'rejected'
      const existing = summaryMap[orderKey]
      const shouldUpdateLatest = !existing || (timestamp && timestamp > (existing.requestedAtMs || 0))
      if (shouldUpdateLatest) {
        summaryMap[orderKey] = {
          status: ret.status,
          returnNumber: ret.returnNumber,
          refundAmount: ret.refundAmount,
          requestedAtMs: timestamp,
          hasRejected: (existing?.hasRejected || isRejected) || undefined,
        }
      } else if (isRejected && existing) {
        existing.hasRejected = true
      }
      const qty = (ret.items || []).reduce<number>((sum, item) => sum + Number(item.quantity || 0), 0)
      requestedQtyMap[orderKey] = (requestedQtyMap[orderKey] || 0) + qty
    })
    const returnSummary = Object.fromEntries(
      Object.entries(summaryMap).map(([orderId, info]) => {
        const { requestedAtMs, ...rest } = info
        return [
          orderId,
          {
            ...rest,
            requestedQuantity: requestedQtyMap[orderId] || 0,
          },
        ]
      })
    )

    res.json({ orders: enrichedOrders, returnSummary });

  } catch (err) {
    console.error('Error fetching user orders:', err); // Log the error details on the server
    res.status(500).json({ msg: 'Server error', error: (err as Error).message }); // Send a more helpful error in development
  }
};

// Get all orders for a seller (orders containing their products)
export const getSellerOrders = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ msg: 'Not authenticated or user ID missing' });
    }

    // For Store Managers, use their assigned seller ID; otherwise use their own ID
    const sellerId = req.user.role === 'StoreManager' && req.user.sellerId 
      ? req.user.sellerId 
      : req.user.userId;

    const sellerProducts = await Product.find({ seller: sellerId }).select('_id').lean();
    const sellerProductIds = sellerProducts.map(p => p._id);

    const orders = await Order.find({
      $or: [
        { 'items.seller': sellerId },
        { 'items.product': { $in: sellerProductIds } },
        // Include temp-product orders where seller is only in productSnapshot
        { 'items.productSnapshot.seller': sellerId },
      ],
    })
      .populate('items.product')
      .populate({ path: 'user', select: 'name email' })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const mapped = orders
      .map(order => {
        const sellerItems = (order.items as any[]).filter(item => {
          const sellerFromItem = item.seller?.toString?.();
          const sellerFromProduct = item.product?.seller?.toString?.();
          const sellerFromSnapshot = item.productSnapshot?.seller?.toString?.();
          const productId = item.product?._id || item.product;
          return (
            sellerFromItem === sellerId ||
            sellerFromProduct === sellerId ||
            sellerFromSnapshot === sellerId ||
            sellerProductIds.some(id => id.toString() === productId?.toString())
          );
        });

        if (sellerItems.length === 0) return null;

        const sellerTotal = sellerItems.reduce((sum: number, item: any) => {
          const unit = typeof item.salePrice === 'number' ? item.salePrice : item.price || 0;
          return sum + unit * (item.quantity || 1);
        }, 0);

        const extraShipping = (order as any).sellerShipping?.[sellerId] || 0;

        return {
          ...order,
          items: sellerItems,
          totalAmount: sellerTotal + extraShipping,
          shippingFee: extraShipping,
        };
      })
      .filter(Boolean);

    res.json({ orders: mapped });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: (err as Error).message });
  }
};

// Seller stats (counts + earnings) without loading full orders
export const getSellerStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.userId) {
      res.status(401).json({ msg: 'Not authenticated or user ID missing' })
      return
    }

    // For Store Managers, use their assigned seller ID; otherwise use their own ID
    const sellerId = req.user.role === 'StoreManager' && req.user.sellerId 
      ? req.user.sellerId 
      : req.user.userId

    // Collect seller product ids (may be zero for sellers who only sell temp products)
    const sellerProductIds = await Product.find({ seller: sellerId }).distinct('_id') as mongoose.Types.ObjectId[]
    const productsCount = sellerProductIds.length

    // Match orders that contain seller's items either by product ownership,
    // explicit item.seller assignment, or temp-product snapshot seller.
    const stats = await Order.aggregate([
      { $match: { $or: [
        { 'items.product': { $in: sellerProductIds } },
        { 'items.seller': sellerId },
        { 'items.productSnapshot.seller': sellerId },
      ] } },
      { $unwind: '$items' },
      { $match: { $or: [
        { 'items.product': { $in: sellerProductIds } },
        { 'items.seller': sellerId },
        { 'items.productSnapshot.seller': sellerId },
      ] } },
      {
        $group: {
          _id: '$_id',
          status: { $first: '$status' },
          orderTotal: {
            $sum: {
              $multiply: [
                { $ifNull: ['$items.salePrice', '$items.price'] },
                '$items.quantity',
              ],
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          pendingOrders: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          // Earnings should only include delivered orders
          earnings: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, '$orderTotal', 0] } },
        },
      },
    ])

    const aggregated = stats[0] || { totalOrders: 0, pendingOrders: 0, earnings: 0 }

    // Subtract approved/refunded return amounts for this seller
    let refundTotal = 0
    try {
      const refunds = await ReturnModel.aggregate([
        { $match: { seller: new mongoose.Types.ObjectId(sellerId), status: { $in: ['approved','refunded'] } } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$refundAmount', 0] } } } },
      ])
      refundTotal = refunds[0]?.total || 0
    } catch (e) {
      refundTotal = 0
    }

    res.json({
      totalOrders: aggregated.totalOrders,
      pendingOrders: aggregated.pendingOrders,
      earnings: Math.max(0, Number(aggregated.earnings || 0) - Number(refundTotal || 0)),
      products: productsCount,
    })
  } catch (err) {
    console.error('getSellerStats error:', err)
    res.status(500).json({ msg: 'Server error', error: (err as Error).message })
  }
}

export const listAllOrders = async (req: AuthRequest, res: Response) => {
  try {
    const orders = await Order.find()
      .populate('items.product')
      .populate({ path: 'customer', select: 'name email phoneNumber' })
      .sort({ createdAt: -1 })
      .lean()
      .exec()

    res.json({ ok: true, orders })
  } catch (err) {
    console.error('listAllOrders error:', err)
    res.status(500).json({ msg: 'Server error', error: (err as Error).message })
  }
}

// Profit insights per day for a seller (revenue/cost/profit)
export const getSellerProfitInsights = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.userId) {
      res.status(401).json({ msg: 'Not authenticated or user ID missing' })
      return
    }

    const effectiveSellerId = getEffectiveSellerId(req) || req.user.userId;
    const sellerId = new mongoose.Types.ObjectId(effectiveSellerId);
    const sellerIdStr = sellerId.toString();
    const days = Number(req.query.days || 30)
    const startDateParam = parseLocalDateString(req.query.startDate as string)
    const endDateParam = parseLocalDateString(req.query.endDate as string)

    const endDate = endDateParam ?? zonedStartOfDay(new Date())
    const endExclusive = addDaysUtc(endDate, 1)
    const startDate = startDateParam ?? addDaysUtc(endDate, -Math.max(days - 1, 0))

    // Collect seller product ids
    const sellerProductIds = await Product.find({ seller: sellerId }).distinct('_id') as mongoose.Types.ObjectId[]

    const matchSellerProducts = {
      $or: [
        { 'items.seller': sellerId },
        { 'items.product': { $in: sellerProductIds } },
        { 'items.productSnapshot.seller': sellerId },
      ],
    }

    const pipeline: any[] = [
      { $match: { createdAt: { $gte: startDate, $lt: endExclusive }, ...matchSellerProducts } },
      { $unwind: '$items' },
      { $match: matchSellerProducts },
      {
        $addFields: {
          itemProduct: '$items.product',
          unitPrice: { $ifNull: ['$items.salePrice', '$items.price'] },
          qty: { $ifNull: ['$items.quantity', 1] },
        },
      },
      { $match: matchSellerProducts },
      {
        $project: {
          dateKey: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: REPORT_TZ } },
          revenue: { $multiply: ['$unitPrice', '$qty'] },
          shipping: {
            $let: {
              vars: {
                match: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: { $objectToArray: { $ifNull: ['$sellerShipping', {}] } },
                        as: 'sh',
                        cond: { $eq: ['$$sh.k', sellerIdStr] },
                      },
                    },
                    0,
                  ],
                },
              },
              in: { $ifNull: ['$$match.v', 0] },
            },
          },
        },
      },
      {
        $group: {
          _id: '$dateKey',
          revenue: { $sum: '$revenue' },
          shipping: { $sum: '$shipping' },
        },
      },
      { $addFields: { profit: { $subtract: ['$revenue', '$shipping'] } } },
      { $sort: { _id: 1 } },
    ]

    const points = await Order.aggregate(pipeline)

    const summary = points.reduce(
      (acc, p) => {
        acc.revenue += p.revenue || 0
        acc.shipping += p.shipping || 0
        acc.profit += p.profit || 0
        return acc
      },
      { revenue: 0, shipping: 0, profit: 0 }
    )

    res.json({
      summary,
      points: points.map(p => ({
        date: p._id,
        revenue: p.revenue,
        shipping: p.shipping,
        profit: p.profit,
      })),
    })
  } catch (err) {
    console.error('getSellerProfitInsights error:', err)
    res.status(500).json({ msg: 'Server error', error: (err as Error).message })
  }
}

// Order insights per day for a seller (completed/pending/cancelled counts)
export const getSellerOrderInsights = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.userId) {
      res.status(401).json({ msg: 'Not authenticated or user ID missing' })
      return
    }

    const effectiveSellerId = getEffectiveSellerId(req) || req.user.userId;
    const sellerId = new mongoose.Types.ObjectId(effectiveSellerId);
    const days = Number(req.query.days || 30)
    const startDateParam = parseLocalDateString(req.query.startDate as string)
    const endDateParam = parseLocalDateString(req.query.endDate as string)

    const endDate = endDateParam ?? zonedStartOfDay(new Date())
    const endExclusive = addDaysUtc(endDate, 1)
    const startDate = startDateParam ?? addDaysUtc(endDate, -Math.max(days - 1, 0))

    const sellerProductIds = await Product.find({ seller: sellerId }).distinct('_id') as mongoose.Types.ObjectId[]

    const matchSellerProducts = {
      $or: [
        { 'items.seller': sellerId },
        { 'items.product': { $in: sellerProductIds } },
        { 'items.productSnapshot.seller': sellerId },
      ],
    }

    const pipeline: any[] = [
      { $match: { createdAt: { $gte: startDate, $lt: endExclusive }, ...matchSellerProducts } },
      { $addFields: { dateKey: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: REPORT_TZ } } } },
      { $unwind: '$items' },
      { $match: matchSellerProducts },
      {
        $group: {
          _id: '$_id',
          dateKey: { $first: '$dateKey' },
          status: { $first: '$status' },
        },
      },
      {
        $group: {
          _id: '$dateKey',
          completed: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          pending: {
            $sum: {
              $cond: [
                { $in: ['$status', ['pending', 'processing', 'shipped']] },
                1,
                0,
              ],
            },
          },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]

    const points = await Order.aggregate(pipeline)

    const summary = points.reduce(
      (acc, p) => {
        acc.completed += p.completed || 0
        acc.pending += p.pending || 0
        acc.cancelled += p.cancelled || 0
        return acc
      },
      { completed: 0, pending: 0, cancelled: 0 }
    )

    res.json({
      summary,
      points: points.map(p => ({
        date: p._id,
        completed: p.completed,
        pending: p.pending,
        cancelled: p.cancelled,
      })),
    })
  } catch (err) {
    console.error('getSellerOrderInsights error:', err)
    res.status(500).json({ msg: 'Server error', error: (err as Error).message })
  }
}

// Get single order
export const getOrder = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ msg: 'Not authenticated' })

    const order = await Order.findById(req.params.id)
      .populate('items.product') as OrderDoc | null

    if (!order) {
      return res.status(404).json({ msg: 'Order not found' })
    }

    const orderId = normalizeObjectId(order._id)
    const pendingMap = await collectPendingReturnQuantities(orderId)
    const enrichedItems = annotateOrderItemsWithReturnData(order.items, pendingMap, orderId)
    const baseOrder = {
      ...order.toObject(),
      items: enrichedItems,
    }

    const isAdmin = ['SuperAdmin', 'SubAdmin'].includes(req.user.role);
    const isOwner = order.user.toString() === req.user.userId;
    const isSeller = req.user.role === 'Seller';

    let sellerOwnsProduct = false;
    if (isSeller) {
      sellerOwnsProduct = order.items.some((item: any) => {
        const sellerFromItem = item.seller?.toString?.();
        const sellerFromProduct = item.product?.seller?.toString?.();
        return sellerFromItem === req.user?.userId || sellerFromProduct === req.user?.userId;
      });
    }

    if (!isOwner && !isAdmin && !(isSeller && sellerOwnsProduct)) {
      return res.status(403).json({ msg: 'Not authorized' })
    }

    // If seller, filter items and recalc totals so they only see their portion
    if (isSeller) {
      const filteredItems = enrichedItems.filter((item: any) => {
        const sellerFromItem = item.seller?.toString?.();
        const sellerFromProduct = (item.product as any)?.seller?.toString?.();
        return sellerFromItem === req.user?.userId || sellerFromProduct === req.user?.userId;
      });
      const sellerTotal = filteredItems.reduce((sum: number, item: any) => {
        const unit = typeof item.salePrice === 'number' ? item.salePrice : item.price || 0;
        return sum + unit * (item.quantity || 1);
      }, 0);
      const toReturn: any = {
        ...baseOrder,
        items: filteredItems,
        totalAmount: sellerTotal,
      };
      return res.json(toReturn);
    }

    res.json(baseOrder)
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err })
  }
}

// Update order status (SuperAdmin, SubAdmin, or Seller for their own products)
export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ msg: 'Not authenticated' })

    const { status } = req.body

    const order = await Order.findById(req.params.id).populate('items.product')
    if (!order) {
      return res.status(404).json({ msg: 'Order not found' })
    }

    // Check authorization
    const isAdmin = ['SuperAdmin', 'SubAdmin'].includes(req.user.role)
    const isSeller = req.user.role === 'Seller' || req.user.role === 'StoreManager';

    if (!isAdmin && !isSeller) {
      return res.status(403).json({ msg: 'Not authorized' })
    }

    // If seller or store manager, verify they own at least one product in the order
    if (isSeller) {
      const effectiveSellerId = getEffectiveSellerId(req) || req.user.userId;
      const sellerStr = effectiveSellerId?.toString?.();
      const sellerProducts = await Product.find({ seller: effectiveSellerId }).select('_id').lean();
      const sellerProductIds = sellerProducts.map(p => p._id.toString())
      
      const hasSellerProduct = order.items.some((item: any) => {
        const productId = item.product?._id?.toString?.() || item.product?.toString?.()
        const itemSeller = item.seller?.toString?.() || (item.product?._id ? undefined : undefined)
        const snapshotSeller = (item.productSnapshot?.seller || item.seller)?.toString?.()
        const ownsProduct = productId && sellerProductIds.includes(productId)
        const isSellerOwner = sellerStr && (snapshotSeller === sellerStr || itemSeller === sellerStr)
        return ownsProduct || isSellerOwner
      })

      if (!hasSellerProduct) {
        return res.status(403).json({ msg: 'Not authorized to update this order' })
      }
    }

    if (['cancelled', 'delivered'].includes((order.status || '').toLowerCase())) {
      return res.status(400).json({ msg: 'Order cannot be modified once completed or cancelled' })
    }

    // Update the order
    const normalizedStatus = (status || '').toLowerCase()
    order.status = status
    if (normalizedStatus === 'delivered' && !order.deliveredAt) {
      order.deliveredAt = new Date()
    }

    await order.save()
    const isSellerActor = (req.user.role || '').toLowerCase() === 'seller'
    if (normalizedStatus === 'cancelled' && isSellerActor) {
      const orderId = order._id?.toString?.() || ''
      const formattedOrderNumber = order.orderNumber ? `#${order.orderNumber}` : orderId ? `#${orderId.slice(-6).toUpperCase()}` : 'Order'
      const paymentMethodLabel = String(order.paymentMethod || 'Online').toLowerCase().includes('cash')
        ? 'Cash on Delivery'
        : 'Online'
      const buyerNotificationTitle = `Order ${formattedOrderNumber} cancelled`
      const refundNote = paymentMethodLabel === 'Cash on Delivery'
        ? 'Your order has been cancelled by the seller.'
        : 'Your amount will be refunded to your default bank account within 5-7 working days.'
      const buyerBody = `${buyerNotificationTitle}. ${refundNote}`
      createNotification(
        order.user?.toString?.() || '',
        buyerNotificationTitle,
        buyerBody,
        'order',
        { orderId, orderNumber: formattedOrderNumber }
      ).catch(() => null)
      sendPushToUserTokens(String(order.user), {
        title: buyerNotificationTitle,
        body: buyerBody,
        data: { orderId, type: 'order' }
      }).catch(() => null)
      const buyerCustomer = Array.isArray(order.customer) ? order.customer[0] : order.customer
      const buyerEmail = buyerCustomer?.email
      if (buyerEmail) {
        try {
          await sendMail({
            to: buyerEmail,
            subject: buyerNotificationTitle,
            text: buyerBody,
            html: `<p>${buyerBody}</p>`,
          })
        } catch (mailErr) {
          console.warn('send buyer cancellation email failed', mailErr)
        }
      }
    }

    res.json(order)
  } catch (err) {
    console.error('Error updating order status:', err)
    res.status(500).json({ msg: 'Server error', error: (err as Error).message })
  }
}

// Update payment status
export const updatePaymentStatus = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ msg: 'Not authenticated' })

    const { paymentStatus } = req.body

    const order = await Order.findById(req.params.id) as OrderDoc | null
    if (!order) {
      return res.status(404).json({ msg: 'Order not found' })
    }

    // Check if user owns the order or is a SuperAdmin/SubAdmin
    if (order.user.toString() !== req.user.userId && 
        !['SuperAdmin', 'SubAdmin'].includes(req.user.role)) {
      return res.status(403).json({ msg: 'Not authorized' })
    }

    order.paymentStatus = paymentStatus
    await order.save()

    res.json(order)
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err })
  }
}

// Cancel order
export const cancelOrder = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ msg: 'Not authenticated' })

    const { reason, note, comment } = (req.body || {}) as { reason?: string; note?: string; comment?: string }
    const order = await Order.findById(req.params.id)
      .populate('items.product')
      .exec() as OrderDoc | null
    if (!order) {
      return res.status(404).json({ msg: 'Order not found' })
    }

    // Check if user owns the order or is a SuperAdmin/SubAdmin
    if (order.user.toString() !== req.user.userId && 
        !['SuperAdmin', 'SubAdmin'].includes(req.user.role)) {
      return res.status(403).json({ msg: 'Not authorized' })
    }

    // Only allow cancellation of active orders
    if (['cancelled', 'canceled', 'delivered'].includes(order.status)) {
      return res.status(400).json({ msg: 'Order cannot be cancelled' })
    }
    if (order.status === 'shipped') {
      return res.status(400).json({ msg: 'Shipped orders cannot be cancelled' })
    }

    const orderId = order._id?.toString?.() || ''
    const orderNumber = orderId ? `#${orderId.slice(-6).toUpperCase()}` : 'this order'
    const cancellationReason = reason || note || comment || 'Cancelled by customer'

    // Restock products best-effort
    const bulkOps = []
    const sellerSet = new Set<string>()
    for (const it of order.items || []) {
      const qty = Math.max(0, Number((it as any).quantity) || 0)
      const productId =
        (it as any)?.product?._id?.toString?.() ||
        (it as any)?.product?.toString?.()
      if (productId && qty > 0) {
        bulkOps.push({
          updateOne: {
            filter: { _id: productId },
            update: { $inc: { stock: qty } }
          }
        })
      }
      const sellerId =
        (it as any)?.seller?.toString?.() ||
        (it as any)?.product?.seller?.toString?.()
      if (sellerId) sellerSet.add(sellerId)
    }
    if (bulkOps.length) {
      await Product.bulkWrite(bulkOps, { ordered: false }).catch(err => {
        console.error('Restock failed during cancellation', err)
      })
    }

    order.status = 'cancelled'
    order.cancellationReason = cancellationReason
    order.cancelledAt = new Date()
    await order.save()

    const formattedOrderNumber = order.orderNumber ? `#${order.orderNumber}` : orderId ? `#${orderId.slice(-6).toUpperCase()}` : 'Order'
    const paymentMethodLabel = String(order.paymentMethod || 'Online').toLowerCase().includes('cash')
      ? 'Cash on Delivery'
      : 'Online'
    const notificationTitle = `${formattedOrderNumber} cancelled by customer`
    const notificationBody = `Order ${formattedOrderNumber} (${paymentMethodLabel}) was cancelled by the customer. Reason: ${cancellationReason}.`

    for (const sellerId of sellerSet) {
      createNotification(
        sellerId,
        notificationTitle,
        notificationBody,
        'order',
        { orderId, orderNumber: formattedOrderNumber }
      ).catch(() => null)
      sendPushToUserTokens(String(sellerId), {
        title: notificationTitle,
        body: notificationBody,
        data: { orderId, type: 'order' }
      }).catch(() => null)
      try {
        const sellerUser = await User.findById(sellerId).select('email name').lean()
        if (sellerUser?.email) {
          await sendMail({
            to: sellerUser.email,
            subject: `Order ${formattedOrderNumber} cancelled`,
            text: `
Order ${formattedOrderNumber} (${paymentMethodLabel}) was cancelled by the customer.
Reason: ${cancellationReason}.
`,
            html: `<p>Order ${formattedOrderNumber} (${paymentMethodLabel}) was cancelled by the customer.</p><p>Reason: ${cancellationReason}.</p>`,
          })
        }
      } catch (mailErr) {
        console.warn('send seller cancellation email failed', mailErr)
      }
    }

    res.json(order)
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err })
  }
}
