import { Response } from 'express'
import mongoose from 'mongoose'
import WarrantyClaim, { IWarrantyClaim, WarrantyDecision, WarrantyStatus } from '../models/WarrantyClaim'
import Order from '../models/Order'
import Product from '../models/Product'
import { AuthRequest } from '../middleware/authMiddleware'
import { createNotification } from '../utils/notificationService'
import { sendPushToUserTokens } from '../utils/pushService'
import { sendMail } from '../utils/mailer'
import User from '../models/User'
import { getEffectiveSellerId } from '../utils/sellerHelper'
import { addDurationToDate, getProductWarrantyData } from '../utils/warrantyUtils'

const EMAIL_FOOTER = 'For Issues & Complaints please contact us at info@autopartsprovider.com'
const buyerRoute = (id: string) => `/warrantyclaims/${id}`
const sellerRoute = (id: string) => `/seller/warrantyclaims/${id}`
const PENDING_WARRANTY_STATUSES: WarrantyStatus[] = [
  'REQUESTED',
  'APPROVED',
  'BUYER_SHIPPED',
  'SELLER_RECEIVED',
  'SELLER_SHIPPED',
]

const notifyUser = async (
  userId: string,
  claimId: string,
  title: string,
  body: string,
  route: string,
  extra: Record<string, any> = {}
) => {
  const metadata = { claimId, route, type: 'warranty', ...extra }
  try {
    await createNotification(userId, title, body, 'order', metadata)
  } catch {
    // ignore notification failures
  }
  try {
    await sendPushToUserTokens(userId, { title, body, data: metadata })
  } catch {
    // ignore push failures
  }
}

const sendWarrantyEmail = async (to: string | undefined, subject: string, text: string, html: string) => {
  if (!to) return
  try {
    await sendMail({
      to,
      subject,
      text: `${text}\n\n${EMAIL_FOOTER}`,
      html: `${html}<p>${EMAIL_FOOTER}</p>`,
    })
  } catch (err) {
    console.warn('warranty email failed', err)
  }
}

const formatBuyerName = (customer: any) => {
  const first = customer?.firstName || customer?.name || ''
  const last = customer?.lastName || ''
  return `${first}${last ? ` ${last}` : ''}`.trim() || 'Buyer'
}

const hydrateClaimsWithSku = async (claims: IWarrantyClaim[]) => {
  const missingProductIds = Array.from(
    new Set(
      claims
        .filter(({ productSku, productId }) => !productSku && productId)
        .map(({ productId }) => String(productId))
    )
  )
  if (!missingProductIds.length) return claims
  const products = await Product.find({ _id: { $in: missingProductIds } })
    .select('sku')
    .lean()
  const skuMap = new Map(products.map(product => [String(product._id), product.sku]))
  claims.forEach(claim => {
    if (!claim.productSku && claim.productId) {
      const sku = skuMap.get(String(claim.productId))
      if (sku) {
        claim.productSku = sku
      }
    }
  })
  return claims
}

const hydrateSingleClaimSku = async (claim: IWarrantyClaim) => {
  if (claim.productSku || !claim.productId) return claim
  const product = await Product.findById(claim.productId).select('sku').lean()
  if (product?.sku) {
    claim.productSku = product.sku
  }
  return claim
}

export const createWarrantyClaim = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.userId) return res.status(401).json({ msg: 'Not authenticated' })
    const { orderId, orderItemId, claimQuantity, notes, images } = req.body as {
      orderId?: string
      orderItemId?: string
      claimQuantity?: number
      notes?: string
      images?: string[]
    }

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ msg: 'Invalid order id' })
    }
    if (!orderItemId || !mongoose.Types.ObjectId.isValid(orderItemId)) {
      return res.status(400).json({ msg: 'Invalid order item id' })
    }
    const requestedQuantity = Number(claimQuantity || 0)
    if (Number.isNaN(requestedQuantity) || requestedQuantity <= 0) {
      return res.status(400).json({ msg: 'claimQuantity must be greater than zero' })
    }

    const order = await Order.findById(orderId)
    if (!order) return res.status(404).json({ msg: 'Order not found' })
    if (String(order.user) !== req.user.userId) {
      return res.status(403).json({ msg: 'Not authorized to claim warranty for this order' })
    }
    if (order.status !== 'delivered') {
      return res.status(400).json({ msg: 'Only delivered orders can request warranty' })
    }
    const orderDeliveredAt = order.deliveredAt || order.updatedAt || order.createdAt
    if (!orderDeliveredAt) {
      return res.status(400).json({ msg: 'Order delivery date missing' })
    }

    const targetItem = order.items.find(item => {
      const idValue =
        item._id?.toString?.() ||
        (item as any).id ||
        ''
      return idValue === orderItemId
    })
    if (!targetItem) {
      return res.status(400).json({ msg: 'Order item not found' })
    }
    const orderedQuantity = Number(targetItem.quantity || 0)
    if (orderedQuantity <= 0) {
      return res.status(400).json({ msg: 'Invalid order item quantity' })
    }

    const existingClaims = await WarrantyClaim.find({
      orderId: order._id,
      orderItemId: targetItem._id,
      status: { $in: PENDING_WARRANTY_STATUSES },
    }).lean<{ claimQuantity: number }[]>()
    const consumedQty = existingClaims.reduce((sum, claim) => sum + (Number(claim.claimQuantity) || 0), 0)
    const remainingQty = orderedQuantity - consumedQty
    if (remainingQty <= 0) {
      return res.status(400).json({ msg: 'No warranty quantity remaining for this item' })
    }
    if (requestedQuantity > remainingQty) {
      return res.status(400).json({ msg: `You can claim up to ${remainingQty} item(s)` })
    }

    const warrantyInfo = getProductWarrantyData(targetItem.productSnapshot || targetItem.product)
    if (!warrantyInfo.durationValue || !warrantyInfo.durationUnit) {
      return res.status(400).json({ msg: 'Warranty is not applicable for this product' })
    }
    const expiryDate = addDurationToDate(new Date(orderDeliveredAt), warrantyInfo.durationValue, warrantyInfo.durationUnit)
    if (new Date() > expiryDate) {
      return res.status(400).json({ msg: 'Warranty is not applicable for this product' })
    }

    const sellerId =
      targetItem.seller?.toString?.() ||
      targetItem.productSnapshot?.seller?.toString?.() ||
      undefined
    if (!sellerId) {
      return res.status(400).json({ msg: 'Unable to determine seller for this item' })
    }

    const productName =
      targetItem.productSnapshot?.partName ||
      targetItem.productSnapshot?.name ||
      targetItem.productSnapshot?.productName ||
      'Product'
    const productImage = targetItem.productSnapshot?.images?.[0] || ''
    let resolvedSku = targetItem.productSnapshot?.sku
    if (!resolvedSku && targetItem.product) {
      const product = await Product.findById(targetItem.product).select('sku').lean()
      if (product?.sku) {
        resolvedSku = product.sku
      }
    }
    const sanitizedImages = Array.isArray(images) ? images.filter(Boolean) : []

    const claim = new WarrantyClaim({
      buyerId: new mongoose.Types.ObjectId(req.user.userId),
      sellerId: new mongoose.Types.ObjectId(sellerId),
      orderId: order._id,
      orderItemId: targetItem._id,
      orderNumber: order.orderNumber,
      productId: targetItem.product,
      productName,
      productImage,
      productSku: resolvedSku,
      orderedQuantity,
      claimQuantity: requestedQuantity,
      notes: typeof notes === 'string' && notes.trim() ? notes.trim() : undefined,
      images: sanitizedImages,
    })
    await claim.save()

    const buyerDisplay = formatBuyerName(order.customer)
    const sellerUser = await User.findById(sellerId).select('email name businessName storeName').lean()
    const sellerName = sellerUser?.businessName || sellerUser?.storeName || sellerUser?.name || 'Seller'
    const sellerNotificationTitle = `New warranty claim ${claim.claimNumber}`
    const sellerNotificationBody = `${buyerDisplay} requested a warranty claim for ${productName} (${requestedQuantity}/${orderedQuantity}).`
    await notifyUser(
      sellerId,
      claim._id.toString(),
      sellerNotificationTitle,
      sellerNotificationBody,
      sellerRoute(claim._id.toString())
    )
    const claimUrl = sellerRoute(claim._id.toString())
    await sendWarrantyEmail(
      sellerUser?.email,
      `Warranty claim ${claim.claimNumber}`,
      `Hello ${sellerName},\n\n${buyerDisplay} submitted a warranty claim (#${claim.claimNumber}) for ${productName}.\nPlease review it on your dashboard: ${claimUrl}`,
      `<p>Hello ${sellerName},</p><p>${buyerDisplay} submitted a warranty claim (#${claim.claimNumber}) for <strong>${productName}</strong>. Please review it on your dashboard: <a href="${claimUrl}">View Claim</a>.</p>`
    )

    return res.status(201).json(claim)
  } catch (err: any) {
    console.error('createWarrantyClaim error:', err)
    return res.status(500).json({ msg: 'Server error', error: err?.message || 'Could not create warranty claim' })
  }
}

export const listBuyerWarrantyClaims = async (req: AuthRequest, res: Response) => {
  if (!req.user?.userId) return res.status(401).json({ msg: 'Not authenticated' })
  try {
    const claims = (await WarrantyClaim.find({ buyerId: req.user.userId })
      .sort({ requestedAt: -1 })
      .lean()) as unknown as IWarrantyClaim[]
    await hydrateClaimsWithSku(claims)
    return res.json({ ok: true, items: claims })
  } catch (err: any) {
    console.error('listBuyerWarrantyClaims error:', err)
    return res.status(500).json({ msg: 'Server error', error: err?.message || 'Could not load warranty claims' })
  }
}

export const listSellerWarrantyClaims = async (req: AuthRequest, res: Response) => {
  if (!req.user?.userId) return res.status(401).json({ msg: 'Not authenticated' })
  try {
    const sellerId = getEffectiveSellerId(req)
    if (!sellerId) return res.status(403).json({ msg: 'Not authorized' })
    const claims = (await WarrantyClaim.find({ sellerId })
      .sort({ requestedAt: -1 })
      .lean()) as unknown as IWarrantyClaim[]
    await hydrateClaimsWithSku(claims)
    return res.json({ ok: true, items: claims })
  } catch (err: any) {
    console.error('listSellerWarrantyClaims error:', err)
    return res.status(500).json({ msg: 'Server error', error: err?.message || 'Could not load warranty claims' })
  }
}

export const getWarrantyClaimById = async (req: AuthRequest, res: Response) => {
  if (!req.user?.userId) return res.status(401).json({ msg: 'Not authenticated' })
  const { id } = req.params
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ msg: 'Invalid claim id' })
  }

  try {
    const claim = (await WarrantyClaim.findById(id).lean()) as IWarrantyClaim | null
    if (!claim) return res.status(404).json({ msg: 'Warranty claim not found' })
    const sellerId = getEffectiveSellerId(req)
    const isSeller = sellerId && String(claim.sellerId) === sellerId
    const isBuyer = String(claim.buyerId) === req.user.userId
    const isAdmin = ['SuperAdmin', 'SubAdmin'].includes(req.user.role || '')
    if (!isSeller && !isBuyer && !isAdmin) {
      return res.status(403).json({ msg: 'Not authorized to view this claim' })
    }
    await hydrateSingleClaimSku(claim)
    return res.json(claim)
  } catch (err: any) {
    console.error('getWarrantyClaimById error:', err)
    return res.status(500).json({ msg: 'Server error', error: err?.message || 'Could not load warranty claim' })
  }
}

const VALID_STATUSES: WarrantyStatus[] = [
  'APPROVED',
  'REJECTED',
  'BUYER_SHIPPED',
  'SELLER_RECEIVED',
  'SELLER_SHIPPED',
  'COMPLETED',
]

const humanDecision = (decision: WarrantyDecision) =>
  decision === 'REPLACE' ? 'Replace' : 'Repair'

export const updateWarrantyClaimStatus = async (req: AuthRequest, res: Response) => {
  if (!req.user?.userId) return res.status(401).json({ msg: 'Not authenticated' })
  const { id } = req.params
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ msg: 'Invalid claim id' })
  }

  try {
    const claim = await WarrantyClaim.findById(id)
    if (!claim) return res.status(404).json({ msg: 'Warranty claim not found' })

    const target = (req.body.status || '').toString().trim().toUpperCase() as WarrantyStatus
    if (!VALID_STATUSES.includes(target)) {
      return res.status(400).json({ msg: 'Invalid status value' })
    }
    if (target === claim.status) {
      return res.status(400).json({ msg: 'Claim already in this status' })
    }

    const sellerId = getEffectiveSellerId(req)
    const isSeller = sellerId && String(claim.sellerId) === sellerId
    const isBuyer = String(claim.buyerId) === req.user.userId
    const isAdmin = ['SuperAdmin', 'SubAdmin'].includes(req.user.role || '')

    const buyerUser = await User.findById(claim.buyerId).select('email name lastName').lean()
    const sellerUser = await User.findById(claim.sellerId).select('email name businessName storeName').lean()
    const buyerEmail = buyerUser?.email || undefined
    const sellerEmail = sellerUser?.email || undefined
    const buyerName = `${buyerUser?.name || ''}${buyerUser?.lastName ? ` ${buyerUser.lastName}` : ''}`.trim() || 'Buyer'
    const sellerName = sellerUser?.businessName || sellerUser?.storeName || sellerUser?.name || 'Seller'
    const claimId = claim._id.toString()
    const now = new Date()

    const updateData: Partial<IWarrantyClaim> = {}

    switch (target) {
      case 'APPROVED': {
        if (!isSeller && !isAdmin) return res.status(403).json({ msg: 'Not authorized' })
        if (claim.status !== 'REQUESTED') return res.status(400).json({ msg: 'Claim must be requested first' })
        const decisionRaw = (req.body.sellerDecision || '').toString().trim().toUpperCase()
        if (decisionRaw !== 'REPLACE' && decisionRaw !== 'REPAIR') {
          return res.status(400).json({ msg: 'sellerDecision is required (REPLACE or REPAIR)' })
        }
        const buyerTracking = (req.body.buyerToSellerTrackingId || '').toString().trim()
        if (!buyerTracking) {
          return res.status(400).json({ msg: 'buyerToSellerTrackingId is required' })
        }
        updateData.sellerDecision = decisionRaw as WarrantyDecision
        updateData.tracking = {
          ...(claim.tracking || {}),
          buyerToSellerTrackingId: buyerTracking,
        }
        updateData.approvedAt = now
        break
      }
      case 'REJECTED': {
        if (!isSeller && !isAdmin) return res.status(403).json({ msg: 'Not authorized' })
        if (claim.status !== 'REQUESTED') return res.status(400).json({ msg: 'Claim must be requested first' })
        const reasonCode = (req.body.rejectionReasonCode || req.body.reasonCode || '').toString().trim()
        const reasonText = (req.body.rejectionReasonText || '').toString().trim()
        const sellerMessage = (req.body.sellerMessage || '').toString().trim()
        if (!reasonCode && !sellerMessage) {
          return res.status(400).json({ msg: 'rejection reason or message is required' })
        }
        updateData.rejection = {
          ...(reasonCode ? { reasonCode } : {}),
          ...(reasonText ? { reasonText } : {}),
          ...(sellerMessage ? { sellerMessage } : {}),
        }
        updateData.rejectedAt = now
        break
      }
      case 'BUYER_SHIPPED': {
        if (!isBuyer && !isAdmin) return res.status(403).json({ msg: 'Not authorized' })
        if (claim.status !== 'APPROVED') return res.status(400).json({ msg: 'Claim must be approved first' })
        updateData.buyerShippedAt = now
        break
      }
      case 'SELLER_RECEIVED': {
        if (!isSeller && !isAdmin) return res.status(403).json({ msg: 'Not authorized' })
        if (claim.status !== 'BUYER_SHIPPED') return res.status(400).json({ msg: 'Claim must be marked shipped by buyer first' })
        updateData.sellerReceivedAt = now
        break
      }
      case 'SELLER_SHIPPED': {
        if (!isSeller && !isAdmin) return res.status(403).json({ msg: 'Not authorized' })
        if (claim.status !== 'SELLER_RECEIVED') return res.status(400).json({ msg: 'Claim must be received by seller first' })
        const sellerTracking = (req.body.sellerToBuyerTrackingId || '').toString().trim()
        if (!sellerTracking) {
          return res.status(400).json({ msg: 'sellerToBuyerTrackingId is required' })
        }
        updateData.tracking = {
          ...(claim.tracking || {}),
          sellerToBuyerTrackingId: sellerTracking,
        }
        updateData.sellerShippedAt = now
        break
      }
      case 'COMPLETED': {
        if (!isBuyer && !isAdmin) return res.status(403).json({ msg: 'Not authorized' })
        if (claim.status !== 'SELLER_SHIPPED') return res.status(400).json({ msg: 'Claim must be shipped by seller first' })
        updateData.completedAt = now
        break
      }
      default:
        return res.status(400).json({ msg: 'Unsupported status transition' })
    }

    claim.set({ ...updateData, status: target })
    await claim.save()

    const buyerDestination = buyerRoute(claimId)
    const sellerDestination = sellerRoute(claimId)

    if (target === 'APPROVED') {
      const decisionLabel = humanDecision((claim.sellerDecision as WarrantyDecision) || 'REPAIR')
      const trackingId = claim.tracking?.buyerToSellerTrackingId || ''
      const bodyText = `Warranty Claim #${claim.claimNumber} has been approved by the seller. please check your email for further instruction`
      await notifyUser(claim.buyerId.toString(), claimId, 'Warranty claim approved', bodyText, buyerDestination)
      await sendWarrantyEmail(
        buyerEmail,
        `Warranty claim ${claim.claimNumber} approved`,
        `Warranty Claim #${claim.claimNumber} has been approved. Seller will ${decisionLabel.toLowerCase()} your product.\n\nFollow these instructions:\n- Please go to your nearby TCS office, hand over the product and provide this tracking id: ${trackingId}.\n- When you have shipped the product, return to the warranty claim and mark it as shipped.`,
        `<p>Warranty Claim #${claim.claimNumber} has been approved. Seller will <strong>${decisionLabel}</strong> your product.</p><p>Follow these instructions:</p><ul><li>Go to your nearby TCS office, hand over the product and provide this tracking id: <strong>${trackingId}</strong>.</li><li>Once shipped, return to the warranty claim and mark it as shipped.</li></ul>`
      )
    } else if (target === 'REJECTED') {
      const reason = claim.rejection?.reasonText || claim.rejection?.reasonCode || 'No reason provided.'
      await notifyUser(
        claim.buyerId.toString(),
        claimId,
        'Warranty claim rejected',
        `Warranty Claim #${claim.claimNumber} has been rejected. Reason: ${reason}`,
        buyerDestination
      )
      await sendWarrantyEmail(
        buyerEmail,
        `Warranty claim ${claim.claimNumber} rejected`,
        `Your warranty claim #${claim.claimNumber} has been rejected. Reason: ${reason}`,
        `<p>Your warranty claim #${claim.claimNumber} has been rejected.</p><p>Reason: ${reason}</p>`
      )
    } else if (target === 'BUYER_SHIPPED') {
      await notifyUser(
        claim.sellerId.toString(),
        claimId,
        'Warranty item shipped',
        `Warranty Claim #${claim.claimNumber} has been shipped by the buyer.`,
        sellerDestination
      )
      await sendWarrantyEmail(
        sellerEmail,
        `Warranty claim ${claim.claimNumber} shipped by buyer`,
        `Buyer ${buyerName} has shipped the product for warranty claim #${claim.claimNumber}. Please mark it received once you receive it.`,
        `<p>Buyer ${buyerName} has shipped the product for warranty claim #${claim.claimNumber}.</p><p>Please mark it received once you receive it.</p>`
      )
    } else if (target === 'SELLER_RECEIVED') {
      await notifyUser(
        claim.buyerId.toString(),
        claimId,
        'Warranty item received',
        `Warranty Claim #${claim.claimNumber} - the product has been received by the seller.`,
        buyerDestination
      )
      await sendWarrantyEmail(
        buyerEmail,
        `Warranty claim ${claim.claimNumber} received`,
        `Warranty Claim #${claim.claimNumber} has been received by the seller. You will be notified once it is shipped back.`,
        `<p>Warranty Claim #${claim.claimNumber} has been received by the seller.</p><p>You will be notified once it is shipped back.</p>`
      )
    } else if (target === 'SELLER_SHIPPED') {
      const sellerTracking = claim.tracking?.sellerToBuyerTrackingId || ''
      await notifyUser(
        claim.buyerId.toString(),
        claimId,
        'Warranty product shipped',
        `Warranty Claim #${claim.claimNumber} - Product has been shipped by the seller.`,
        buyerDestination
      )
      await sendWarrantyEmail(
        buyerEmail,
        `Warranty claim ${claim.claimNumber} shipped by seller`,
        `Warranty Claim #${claim.claimNumber} - the product has been shipped by the seller.\n\nPlease follow the below instructions:\n- Go to your nearby TCS office and give them the seller provided tracking id: ${sellerTracking}.\n- When you receive the product, go to your warranty claims and mark it as received to complete the claim.`,
        `<p>Warranty Claim #${claim.claimNumber} - the product has been shipped by the seller.</p><p>Please follow the below instructions:</p><ul><li>Go to your nearby TCS office and provide the seller-provided tracking id: <strong>${sellerTracking}</strong>.</li><li>When you receive the product, go to your warranty claims and mark it as received to complete the claim.</li></ul>`
      )
    } else if (target === 'COMPLETED') {
      await notifyUser(
        claim.sellerId.toString(),
        claimId,
        'Warranty claim completed',
        `Warranty Claim #${claim.claimNumber} - Product has been received by the seller. Thanks for your cooperation.`,
        sellerDestination
      )
      await sendWarrantyEmail(
        sellerEmail,
        `Warranty claim ${claim.claimNumber} completed`,
        `Warranty Claim #${claim.claimNumber} has been completed. The buyer has received the product.`,
        `<p>Warranty Claim #${claim.claimNumber} has been completed. The buyer has received the product.</p>`
      )
    }

    return res.json(claim)
  } catch (err: any) {
    console.error('updateWarrantyClaimStatus error:', err)
    return res.status(500).json({ msg: 'Server error', error: err?.message || 'Could not update warranty claim' })
  }
}
