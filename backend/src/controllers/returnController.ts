import { Request, Response } from 'express'
import mongoose, { HydratedDocument } from 'mongoose'
import Order, { IOrder } from '../models/Order'
import Product from '../models/Product'
import ReturnModel, { IReturn, IReturnItem } from '../models/Return'
import User from '../models/User'
import Withdrawal from '../models/Withdrawal'
import { AuthRequest } from '../middleware/authMiddleware'
import { createNotification } from '../utils/notificationService'
import { sendPushToUserTokens } from '../utils/pushService'
import { sendMail } from '../utils/mailer'
import { getEffectiveSellerId } from '../utils/sellerHelper'
import { refreshStoreBalance } from './withdrawalController'

const MS_DAY = 24 * 60 * 60 * 1000
const ADMIN_ROLES = new Set(['SuperAdmin', 'SubAdmin'])
type OrderDoc = HydratedDocument<IOrder>

const formatCurrencyValue = (amount?: number, currency = 'PKR') => {
  const safeAmount = Number(amount ?? 0)
  return `${currency} ${safeAmount.toLocaleString()}`
}

const normalizeStatus = (value?: string) => (value || '').toString().toLowerCase()

const buildOrderLabel = (order: IOrder | null) => {
  if (!order) return 'Order'
  if (order.orderNumber) return `#${order.orderNumber}`
  const id = order._id ? String(order._id) : ''
  return id ? `#${id.slice(-6).toUpperCase()}` : 'Order'
}

const getDeliveredAt = (order: IOrder) => {
  if (order.deliveredAt) return order.deliveredAt
  const status = normalizeStatus(order.status)
  if (status === 'delivered') {
    return order.updatedAt || order.createdAt
  }
  return order.createdAt || order.updatedAt
}

const sendReturnItems = (res: Response, docs: any[]) => {
  res.json({ items: docs })
}

const findSellerIdFromOrder = (order: IOrder) => {
  for (const item of order.items || []) {
    const seller = item.seller?.toString()
    if (seller) return seller
    const snapshotSeller = (item.productSnapshot as any)?.seller?.toString?.()
    if (snapshotSeller) return snapshotSeller
  }
  return null
}

const notifyUser = async ({
  userId,
  title,
  body,
  data,
  email,
}: {
  userId: string
  title: string
  body: string
  data?: Record<string, any>
  email?: string
}) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) return
  createNotification(userId, title, body, 'order', data).catch(() => null)
  sendPushToUserTokens(userId, { title, body, data: data || {} }).catch(() => null)
  if (email) {
    try {
      await sendMail({
        to: email,
        subject: title,
        text: body,
        html: `<p>${body}</p>`,
      })
    } catch (err) {
      console.warn('send mail failed for return notification', err)
    }
  }
}

const restockReturnItems = async (items: IReturnItem[], sellerId?: mongoose.Types.ObjectId | string) => {
  if (!sellerId) return
  const sellerObjectId =
    sellerId instanceof mongoose.Types.ObjectId
      ? sellerId
      : mongoose.Types.ObjectId.isValid(String(sellerId))
        ? new mongoose.Types.ObjectId(String(sellerId))
        : undefined
  if (!sellerObjectId) return

  const quantities = new Map<string, number>()
  items.forEach(item => {
    if (item.isTemporaryProduct) return
    if (item.productSnapshot?.isTemporaryProduct) return
    if (!item.product) return
    const key = String(item.product)
    if (!key) return
    const existing = quantities.get(key) || 0
    quantities.set(key, existing + Number(item.quantity || 0))
  })

  if (!quantities.size) return

  const ops = Array.from(quantities.entries())
    .map(([productId, qty]) => {
      if (!mongoose.Types.ObjectId.isValid(productId) || qty <= 0) return null
      return {
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(productId), seller: sellerObjectId },
          update: { $inc: { stock: qty } },
        },
      }
    })
    .filter(
      (
        op
      ): op is {
        updateOne: {
          filter: { _id: mongoose.Types.ObjectId; seller: mongoose.Types.ObjectId }
          update: { $inc: { stock: number } }
        }
      } => op !== null
    )

  if (!ops.length) return
  try {
    await Product.bulkWrite(ops, { ordered: false })
  } catch (err) {
    console.error('Return restock failed', err)
  }
}


const resolveObjectId = (value: any) => {
  if (!value) return undefined
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    if ('_id' in value && value._id) return String(value._id)
    if ('id' in value && value.id) return String(value.id)
  }
  return undefined
}

const notifyReturnEvent = async (params: {
  returnDoc: IReturn
  order: IOrder | null
  actorRole: 'buyer' | 'seller' | 'admin'
  statusLabel: string
}) => {
  const { returnDoc, order, actorRole, statusLabel } = params
  const buyerUser = await User.findById(returnDoc.buyer).select('email name').lean()
  const sellerUser = await User.findById(returnDoc.seller)
    .select('email name businessName storeName')
    .lean()
  const orderLabel = buildOrderLabel(order)
  const bodySuffix = orderLabel ? `${orderLabel}` : ''
  const metadata = {
    returnId: returnDoc._id,
    orderId: returnDoc.order,
  }

  const message = `Return ${returnDoc.returnNumber} ${statusLabel}${bodySuffix ? ` on ${bodySuffix}` : ''}.`

  if (actorRole === 'seller' || actorRole === 'admin') {
    if (buyerUser) {
      notifyUser({
        userId: String(buyerUser._id),
        title: `Return ${statusLabel}`,
        body: message,
        data: metadata,
        email: buyerUser.email,
      })
    }
  } else {
    if (sellerUser) {
      notifyUser({
        userId: String(sellerUser._id),
        title: `Return ${statusLabel}`,
        body: message,
        data: metadata,
        email: sellerUser.email,
      })
    }
  }
}

const notifyBuyerTrackingUpdate = async (returnDoc: IReturn, trackingId: string) => {
  const buyerUser = await User.findById(returnDoc.buyer).select('email name').lean()
  if (!buyerUser) return
  const notificationBody =
    'Your return has been accepted by the seller. Please check your email for further instructions.'
  notifyUser({
    userId: String(buyerUser._id),
    title: 'Return Accepted',
    body: notificationBody,
    data: { returnId: returnDoc._id },
  }).catch(() => null)
  const emailBody = `Your return request #${returnDoc.returnNumber} has been accepted by the seller.

Here is your tracking number: ${trackingId}

Please follow the instructions below:
- Go to your nearby TCS office and tell them the tracking number and handover the product to them.
- Once the seller receives the product you will get your amount refunded in your provided bank account.

For Any problem or complaints please contact us on info@autopartsprovider.com`
  try {
    await sendMail({
      to: buyerUser.email,
      subject: `Return ${returnDoc.returnNumber} Tracking Info`,
      text: emailBody,
      html: `<p>${emailBody.replace(/\n/g, '<br/>')}</p>`,
    })
  } catch (err) {
    console.warn('send mail failed for tracking notification', err)
  }
}

const notifyBuyerReturnReceived = async (returnDoc: IReturn) => {
  const buyerUser = await User.findById(returnDoc.buyer).select('email name').lean()
  if (!buyerUser) return
  const returnLabel = returnDoc.returnNumber || '—'
  const refundAmountStr = formatCurrencyValue(returnDoc.refundAmount, returnDoc.refundCurrency)
  const bankDescription =
    returnDoc.refundAccountName && returnDoc.refundBankName && returnDoc.refundAccountLast4
      ? `${returnDoc.refundAccountName}, ${returnDoc.refundBankName}, ending ${returnDoc.refundAccountLast4}`
      : 'your registered bank account'
  const notificationBody = `Request #${returnLabel} - The seller has received the product. Your refund amount ${refundAmountStr} will be refunded in ${bankDescription} within 5-7 working days.`
  notifyUser({
    userId: String(buyerUser._id),
    title: 'Return Received',
    body: notificationBody,
    data: { returnId: returnDoc._id },
  }).catch(() => null)
  const emailBody = `Request #${returnLabel} - The seller has received the product. 

Your refund amount ${refundAmountStr} will be refunded in your bank account ${bankDescription} within 5-7 working days.

For complaints please contact us at info@autopartsprovider.com`
  try {
      await sendMail({
        to: buyerUser.email,
        subject: `Return ${returnLabel} Received`,
        text: emailBody,
        html: `<p>${emailBody.replace(/\n/g, '<br/>')}</p>`,
      })
    } catch (err) {
      console.warn('send mail failed for received notification', err)
    }
}

const createReturnDeduction = async (returnDoc: IReturn) => {
  const amount = Number(returnDoc.refundAmount || 0)
  if (amount <= 0 || !returnDoc.returnNumber) return null
  const note = `Return ${returnDoc.returnNumber} Deduction`
  const existing = await Withdrawal.findOne({
    seller: returnDoc.seller,
    note,
    amount,
  })
  if (existing) return existing
  return Withdrawal.create({
    seller: returnDoc.seller,
    amount,
    currency: returnDoc.refundCurrency || 'PKR',
    status: 'completed',
    note,
    processedAt: new Date(),
  })
}

const notifySellerReturnDeduction = async (returnDoc: IReturn, amount: number) => {
  const sellerUser = await User.findById(returnDoc.seller).select('email name').lean()
  if (!sellerUser) return
  const formattedAmount = `PKR ${amount.toLocaleString()}`
  const message = `We have deducted ${formattedAmount} from your balance for Return ${returnDoc.returnNumber}. Please check your withdrawal history.`
  notifyUser({
    userId: String(sellerUser._id),
    title: 'Return Deduction',
    body: message,
    data: { returnId: returnDoc._id, route: 'withdrawalhistory', type: 'return-deduction' },
  }).catch(() => null)
  const emailBody = `We have deducted ${formattedAmount} from your balance for Return ${returnDoc.returnNumber}.

We have restocked your returned item(s) in your inventory. Please check your withdrawal history for the deduction details.`
  try {
    await sendMail({
      to: sellerUser.email,
      subject: `Return ${returnDoc.returnNumber} Deduction`,
      text: emailBody,
      html: `<p>${emailBody.replace(/\n/g, '<br/>')}</p>`,
    })
  } catch (err) {
    console.warn('send mail failed for seller deduction notification', err)
  }
}

export const createReturn = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ msg: 'Not authenticated' })
    }

    const { orderId, items, reason, note, images, returnMethod } = req.body as {
      orderId?: string
      items?: Array<{ orderItemId?: string; quantity?: number; reason?: string; images?: string[] }>
      reason?: string
      note?: string
      images?: string[]
      returnMethod?: string
    }

    if (!orderId) return res.status(400).json({ msg: 'orderId is required' })
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ msg: 'items array is required' })
    }

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ msg: 'Invalid orderId' })
    }

    const order = (await Order.findById(orderId)) as OrderDoc | null
    if (!order) return res.status(404).json({ msg: 'Order not found' })

    if (String(order.user) !== req.user.userId) {
      return res.status(403).json({ msg: 'Not authorized to request return for this order' })
    }

    if (normalizeStatus(order.status) !== 'delivered') {
      return res.status(400).json({ msg: 'Only delivered orders can be returned' })
    }

    const deliveredAt = getDeliveredAt(order)
    if (!deliveredAt) {
      return res.status(400).json({ msg: 'Order delivered date is not available yet' })
    }

    const orderItemsList = order.items ?? []
    const orderMerchTotal = orderItemsList.reduce((sum, ordItem) => {
      const priceValue =
        typeof ordItem.salePrice === 'number' && ordItem.salePrice > 0 ? ordItem.salePrice : ordItem.price || 0
      const qty = Number(ordItem.quantity || 0)
      return sum + priceValue * qty
    }, 0)
    const promoDiscountShare = Math.max(0, Number(order.promoDiscount || 0))
    const promoRatio = orderMerchTotal > 0 ? promoDiscountShare / orderMerchTotal : 0

    const existingReturns = await ReturnModel.find({
      order: order._id,
      status: { $nin: ['rejected', 'cancelled'] },
    }).lean<IReturn>()

    const consumed = new Map<string, number>()
    existingReturns.forEach((ret: IReturn) => {
      ret.items?.forEach((item: IReturnItem) => {
        if (!item.orderItemId) return
        const key = String(item.orderItemId)
        const prev = consumed.get(key) || 0
        consumed.set(key, prev + (item.quantity || 0))
      })
    })

    const normalizedItems: IReturnItem[] = []
    const deadlines: number[] = []
    const windowDays: number[] = []
    let refundAmount = 0
    const itemImagesAccumulator: string[] = []

    for (const reqItem of items) {
      if (!reqItem.orderItemId) {
        return res.status(400).json({ msg: 'orderItemId is required for each item' })
      }

      if (!mongoose.Types.ObjectId.isValid(reqItem.orderItemId)) {
        return res.status(400).json({ msg: `Invalid orderItemId ${reqItem.orderItemId}` })
      }

      const orderDoc = order as OrderDoc
      const orderItem =
        orderDoc.items.find(it => String((it as any)?._id) === reqItem.orderItemId)
      if (!orderItem) {
        return res.status(400).json({ msg: `Order item ${reqItem.orderItemId} not found` })
      }

      const requestedQty = Math.max(0, Number(reqItem.quantity ?? 0))
      if (requestedQty <= 0) {
        return res.status(400).json({ msg: 'Quantity must be greater than zero' })
      }

      const already = consumed.get(String(reqItem.orderItemId)) || 0
      const maxQty = Number(orderItem.quantity || 0)
      if (requestedQty + already > maxQty) {
        return res.status(400).json({ msg: 'Quantity exceeds available quantity for return' })
      }

      const allowedDays = Number(orderItem.returnDays ?? 0)
      if (allowedDays <= 0) {
        return res.status(400).json({ msg: 'Return window is not available for this item' })
      }

      const deadline = new Date(deliveredAt.getTime() + allowedDays * MS_DAY)
      if (new Date() > deadline) {
        return res.status(400).json({ msg: 'Return window has expired for one of the selected items' })
      }

      deadlines.push(deadline.getTime())
      windowDays.push(allowedDays)

      const unitPrice =
        typeof orderItem.salePrice === 'number' && orderItem.salePrice > 0 ? orderItem.salePrice : orderItem.price || 0
      const subtotal = unitPrice * requestedQty
      const promoShare = promoRatio > 0 ? subtotal * promoRatio : 0
      const refundable = Math.max(subtotal - promoShare, 0)
      refundAmount += refundable

      const orderItemId = (orderItem as any)?._id
      const cleanItemImages = Array.isArray(reqItem.images) ? reqItem.images.filter(Boolean) : []
      const isTempProduct = !orderItem.product
      normalizedItems.push({
        orderItemId,
        product: orderItem.product || undefined,
        productSnapshot: {
          ...orderItem.productSnapshot,
          isTemporaryProduct: Boolean(isTempProduct || orderItem.productSnapshot?.isTemporaryProduct),
        },
        quantity: requestedQty,
        unitPrice,
        subtotal,
        reason: reqItem.reason,
        returnDays: allowedDays,
        images: cleanItemImages,
        isTemporaryProduct: isTempProduct,
      })

      if (cleanItemImages.length) {
        itemImagesAccumulator.push(...cleanItemImages)
      }
      consumed.set(String(reqItem.orderItemId), already + requestedQty)
    }

    const sellerId = findSellerIdFromOrder(order)
    if (!sellerId) {
      return res.status(400).json({ msg: 'Unable to determine seller for this order' })
    }

    const returnDoc = new ReturnModel({
      order: order._id,
      buyer: new mongoose.Types.ObjectId(req.user.userId),
      seller: new mongoose.Types.ObjectId(sellerId),
      items: normalizedItems,
      reason,
      note,
      images: Array.from(
        new Set([
          ...(Array.isArray(images) ? images.filter(Boolean) : []),
          ...itemImagesAccumulator,
        ])
      ),
      returnMethod,
      refundAmount,
      returnWindowDays: windowDays.length ? Math.min(...windowDays) : undefined,
      returnDeadline: deadlines.length ? new Date(Math.min(...deadlines)) : undefined,
    })

    await returnDoc.save()
    await refreshStoreBalance(String(returnDoc.seller))
    await notifyReturnEvent({ returnDoc, order, actorRole: 'buyer', statusLabel: 'requested' })
    notifyUser({
      userId: req.user.userId,
      title: 'Return request submitted',
      body: `Return ${returnDoc.returnNumber} is now under review.`,
      data: { returnId: returnDoc._id, orderId: order._id },
    })

    return res.status(201).json(returnDoc)
  } catch (err: any) {
    console.error('createReturn error:', err)
    return res.status(500).json({ msg: 'Server error', error: err?.message || 'Could not create return' })
  }
}

export const listReturns = async (req: AuthRequest, res: Response) => {
  try {
    const query: any = {}
    if (req.query.user) {
      query.buyer = req.query.user
    } else if (req.user?.userId) {
      query.buyer = req.user.userId
    }

    if (req.query.all && ADMIN_ROLES.has(req.user?.role || '')) {
      delete query.buyer
    }

    const docs = await ReturnModel.find(query)
      .sort({ requestedAt: -1 })
      .populate('order')
      .populate('items.product')
      .lean()

    sendReturnItems(res, docs)
  } catch (err: any) {
    console.error('listReturns error:', err)
    res.status(500).json({ msg: 'Server error', error: err?.message || 'Could not load returns' })
  }
}

export const listBuyerReturns = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.userId) return res.status(401).json({ msg: 'Not authenticated' })
    const docs = await ReturnModel.find({ buyer: req.user.userId })
      .sort({ requestedAt: -1 })
      .populate('order')
      .populate('items.product')
      .lean()
    sendReturnItems(res, docs)
  } catch (err: any) {
    console.error('listBuyerReturns error:', err)
    res.status(500).json({ msg: 'Server error', error: err?.message || 'Could not load buyer returns' })
  }
}

export const listSellerReturns = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.userId) return res.status(401).json({ msg: 'Not authenticated' })
    const sellerId = getEffectiveSellerId(req)
    if (!sellerId) return res.status(403).json({ msg: 'Not authorized' })

    const docs = await ReturnModel.find({ seller: sellerId })
      .sort({ requestedAt: -1 })
      .populate('order')
      .populate('items.product')
      .lean()

    sendReturnItems(res, docs)
  } catch (err: any) {
    console.error('listSellerReturns error:', err)
    res.status(500).json({ msg: 'Server error', error: err?.message || 'Could not load seller returns' })
  }
}

export const listReturnsByOrder = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.userId) return res.status(401).json({ msg: 'Not authenticated' })
    const { orderId } = req.params
    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ msg: 'Invalid order id' })
    }
    const order = await Order.findById(orderId).lean<OrderDoc>()
    if (!order) return res.status(404).json({ msg: 'Order not found' })
    const isBuyer = String(order.user) === req.user.userId
    const isAdmin = ADMIN_ROLES.has(req.user.role || '')
    if (!isBuyer && !isAdmin) {
      return res.status(403).json({ msg: 'Not authorized to view these returns' })
    }
    const docs = await ReturnModel.find({ order: order._id, buyer: order.user })
      .sort({ requestedAt: -1 })
      .populate('order')
      .populate('items.product')
      .lean<IReturn[]>()
    sendReturnItems(res, docs)
  } catch (err: any) {
    console.error('listReturnsByOrder error:', err)
    res.status(500).json({ msg: 'Server error', error: err?.message || 'Could not load returns' })
  }
}

export const getReturnById = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.userId) return res.status(401).json({ msg: 'Not authenticated' })
    const { id } = req.params
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ msg: 'Invalid return id' })
    }

    const ret = await ReturnModel.findById(id)
      .populate('order')
      .populate('items.product')
      .populate('seller', 'name lastName email phoneNumber storeName businessName address')
      .populate('buyer', 'name lastName email phoneNumber address')
      .lean<IReturn & { seller?: any; buyer?: any }>()
    if (!ret) return res.status(404).json({ msg: 'Return not found' })

    const isAdmin = ADMIN_ROLES.has(req.user.role || '')
    const effectiveSellerId = getEffectiveSellerId(req)
    const buyerId = resolveObjectId(ret.buyer)
    const sellerId = resolveObjectId(ret.seller)
    const isBuyer = buyerId === req.user.userId
    const isSeller = effectiveSellerId && sellerId === effectiveSellerId

    if (!isAdmin && !isBuyer && !isSeller) {
      return res.status(403).json({ msg: 'Not authorized to view this return' })
    }

    res.json(ret)
  } catch (err: any) {
    console.error('getReturnById error:', err)
    res.status(500).json({ msg: 'Server error', error: err?.message || 'Could not load return' })
  }
}

export const updateReturnStatus = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.userId) return res.status(401).json({ msg: 'Not authenticated' })
    const { id } = req.params
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ msg: 'Invalid return id' })
    }

    const ret = await ReturnModel.findById(id)
    if (!ret) return res.status(404).json({ msg: 'Return not found' })

    const {
      status,
      sellerNote,
      note,
      trackingId,
      returnMethod,
      refundAmount,
      refundCurrency,
      images,
      sellerRejectionReason,
      sellerRejectionMessage,
    } = req.body as {
      status?: string
      sellerNote?: string
      note?: string
      trackingId?: string
      returnMethod?: string
      refundAmount?: number
      refundCurrency?: string
      images?: string[]
      sellerRejectionReason?: string
      sellerRejectionMessage?: string
    }

    const statusValue = typeof status === 'string' ? status.trim() : ''
    if (!statusValue) {
      return res.status(400).json({ msg: 'status is required' })
    }

    const requestedStatus = normalizeStatus(statusValue)
    const trackingValue = typeof trackingId === 'string' ? trackingId.trim() : ''
    const isTrackingSubmission =
      !!trackingValue && ret.status === 'approved' && ['approved', 'shipped'].includes(requestedStatus)
    const targetStatus = isTrackingSubmission ? 'shipped' : requestedStatus

    const allowedStatuses = new Set([
      'requested',
      'approved',
      'shipped',
      'rejected',
      'pickup_scheduled',
      'shipped_back',
      'received',
      'refunded',
      'cancelled',
    ])
    if (!allowedStatuses.has(targetStatus)) {
      return res.status(400).json({ msg: 'Invalid status value' })
    }

    if (targetStatus === 'shipped' && !trackingValue) {
      return res.status(400).json({ msg: 'Tracking ID is required for shipping updates' })
    }

    if (ret.status === targetStatus && !isTrackingSubmission) {
      return res.status(400).json({ msg: 'Return already in this status' })
    }

    const effectiveSellerId = getEffectiveSellerId(req)
    const actorIsBuyer = String(ret.buyer) === req.user.userId
    const actorIsSeller = effectiveSellerId && String(ret.seller) === effectiveSellerId
    const isAdmin = ADMIN_ROLES.has(req.user.role || '')

    const canSellerAct = actorIsSeller || isAdmin
    const canBuyerAct = actorIsBuyer || isAdmin

    const currentStatus = ret.status
    let transitionAllowed = false

    switch (targetStatus) {
      case 'approved':
        transitionAllowed = currentStatus === 'requested' && canSellerAct
        break
      case 'shipped':
        transitionAllowed = currentStatus === 'approved' && canSellerAct
        break
      case 'rejected':
        transitionAllowed = currentStatus === 'requested' && canSellerAct
        break
      case 'pickup_scheduled':
      case 'shipped_back':
        transitionAllowed =
          ['approved', 'pickup_scheduled', 'shipped_back', 'shipped'].includes(currentStatus) && canSellerAct
        break
      case 'received':
        transitionAllowed = currentStatus === 'shipped' && canSellerAct
        break
      case 'refunded':
        transitionAllowed = currentStatus === 'received' && canSellerAct
        break
      case 'cancelled':
        transitionAllowed = currentStatus === 'requested' && canBuyerAct
        break
      default:
        transitionAllowed = false
    }

    if (!transitionAllowed && !isAdmin) {
      return res.status(403).json({ msg: 'Not authorized to transition return to this status' })
    }

    const now = new Date()
    const normalizedRejectionReason =
      typeof sellerRejectionReason === 'string' ? sellerRejectionReason.trim() : undefined
    const normalizedRejectionMessage =
      typeof sellerRejectionMessage === 'string' ? sellerRejectionMessage.trim() : undefined

    if (targetStatus === 'approved' && !isTrackingSubmission) {
      ret.approvedAt = now
    }
    if (targetStatus === 'rejected') {
      ret.rejectedAt = now
      ret.sellerRejectionReason = normalizedRejectionReason
      ret.sellerRejectionMessage = normalizedRejectionMessage
      if (normalizedRejectionMessage) {
        ret.sellerNote = normalizedRejectionMessage
      }
    }
    if (targetStatus === 'received' && !ret.receivedAt) {
      ret.receivedAt = now
      await restockReturnItems(ret.items, ret.seller)
    }
    if (targetStatus !== 'rejected') {
      ret.sellerRejectionReason = undefined
      ret.sellerRejectionMessage = undefined
    }
    if (targetStatus === 'refunded') {
      ret.refundedAt = now
    }
    if (targetStatus === 'cancelled') {
      ret.cancelledAt = now
    }

    ret.status = targetStatus as any

    if (sellerNote !== undefined) ret.sellerNote = sellerNote
    if (note !== undefined) ret.note = note
    if (trackingValue) ret.trackingId = trackingValue
    if (returnMethod !== undefined) ret.returnMethod = returnMethod
    if (refundAmount !== undefined) ret.refundAmount = Number(refundAmount) || 0
    if (refundCurrency !== undefined) ret.refundCurrency = refundCurrency
    if (Array.isArray(images)) ret.images = images

    await ret.save()
    const deductionEntry =
      targetStatus === 'received' ? await createReturnDeduction(ret as IReturn) : null

    const order = await Order.findById(ret.order)

    const actorRole = canSellerAct ? 'seller' : actorIsBuyer ? 'buyer' : 'admin'
    const statusLabel =
      targetStatus === 'pickup_scheduled'
        ? 'pickup scheduled'
        : targetStatus === 'shipped_back'
        ? 'marked as shipped back'
        : targetStatus

    const defaultNotifyStatuses = new Set([
      'rejected',
      'pickup_scheduled',
      'shipped_back',
      'refunded',
      'cancelled',
    ])
    if (defaultNotifyStatuses.has(targetStatus)) {
      await notifyReturnEvent({
        returnDoc: ret as IReturn,
        order,
        actorRole: actorRole as any,
        statusLabel,
      }).catch(() => null)
    } else if (targetStatus === 'shipped' && trackingValue) {
      await notifyBuyerTrackingUpdate(ret as IReturn, trackingValue).catch(() => null)
    } else if (targetStatus === 'received') {
      await notifyBuyerReturnReceived(ret as IReturn).catch(() => null)
      if (deductionEntry?.amount) {
        await notifySellerReturnDeduction(ret as IReturn, deductionEntry.amount).catch(() => null)
      }
    }

    if (targetStatus === 'received') {
      await refreshStoreBalance(String(ret.seller))
    }
    return res.json(ret)
  } catch (err: any) {
    console.error('updateReturnStatus error:', err)
    return res.status(500).json({ msg: 'Server error', error: err?.message || 'Could not update return' })
  }
}

export const updateReturnBankDetails = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.userId) return res.status(401).json({ msg: 'Not authenticated' })
    const { id } = req.params
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ msg: 'Invalid return id' })
    }

    const ret = await ReturnModel.findById(id)
    if (!ret) return res.status(404).json({ msg: 'Return not found' })

    const isBuyer = String(ret.buyer) === req.user.userId
    if (!isBuyer) return res.status(403).json({ msg: 'Not authorized to update bank details' })

    const { bankName, accountTitle, accountNumber } = req.body as {
      bankName?: string
      accountTitle?: string
      accountNumber?: string
    }

    const bankNameValue = typeof bankName === 'string' ? bankName.trim() : ''
    const accountNumberValue =
      typeof accountNumber === 'string' ? accountNumber.replace(/\D+/g, '') : ''

    if (!bankNameValue) {
      return res.status(400).json({ msg: 'bankName is required' })
    }

    if (!accountNumberValue) {
      return res.status(400).json({ msg: 'accountNumber is required' })
    }

    ret.refundBankName = bankNameValue
    ret.refundAccountName = typeof accountTitle === 'string' && accountTitle.trim() ? accountTitle.trim() : undefined
    ret.refundAccountNumber = accountNumberValue
    ret.refundAccountLast4 = accountNumberValue.slice(-4)

    await ret.save()
    return res.json(ret)
  } catch (err: any) {
    console.error('updateReturnBankDetails error:', err)
    return res.status(500).json({ msg: 'Server error', error: err?.message || 'Could not update bank details' })
  }
}

export const deleteReturn = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ msg: 'Not authenticated' })
    }
    const { id } = req.params
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ msg: 'Invalid return id' })
    }

    const ret = await ReturnModel.findById(id)
    if (!ret) return res.status(404).json({ msg: 'Return not found' })

    const isAdmin = ADMIN_ROLES.has(req.user.role || '')
    if (!isAdmin) {
      return res.status(403).json({ msg: 'Not authorized' })
    }

    await ret.remove()
    return res.json({ msg: 'Return deleted' })
  } catch (err: any) {
    console.error('deleteReturn error:', err)
    return res.status(500).json({ msg: 'Server error', error: err?.message || 'Could not delete return' })
  }
}
