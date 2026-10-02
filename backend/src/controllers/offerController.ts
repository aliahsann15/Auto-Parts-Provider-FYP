import { Request, Response } from 'express'
import mongoose from 'mongoose'
import Offer from '../models/Offer'
import { AuthRequest } from '../middleware/authMiddleware'
import PartsRequest from '../models/Parts-Request'
import Product from '../models/Product'
import User from '../models/User'
import ChatMessage from '../models/ChatMessage'
import Notification from '../models/Notification'
import { createNotification } from '../utils/notificationService'
import { sendPushToUserTokens } from '../utils/pushService'
import { getEffectiveSellerId } from '../utils/sellerHelper'
import { getIO } from '../socket'
import { sendMail } from '../utils/mailer'

// Create a new offer
export const createOffer = async (req: AuthRequest, res: Response) => {
  try {
    const { requestId, price, message, warranty, returnDays, dimensions } = req.body
    const sellerId = req.user?.userId

    if (!sellerId) return res.status(400).json({ msg: 'Seller id required' })
    if (!requestId) return res.status(400).json({ msg: 'requestId is required' })
    if (typeof price !== 'number' || price < 0) return res.status(400).json({ msg: 'Valid price is required' })
    if (returnDays !== undefined && (Number.isNaN(Number(returnDays)) || Number(returnDays) < 0)) {
      return res.status(400).json({ msg: 'Valid returnDays is required' })
    }
    const widthVal = dimensions?.width
    const lengthVal = dimensions?.length
    const heightVal = dimensions?.height
    const parseDim = (val: any) => {
      if (typeof val === 'number') return val
      if (typeof val === 'string') return Number(val)
      return undefined
    }
    const widthNum = parseDim(widthVal)
    const lengthNum = parseDim(lengthVal)
    const heightNum = parseDim(heightVal)
    if (
      widthNum === undefined ||
      lengthNum === undefined ||
      heightNum === undefined ||
      Number.isNaN(widthNum) ||
      Number.isNaN(lengthNum) ||
      Number.isNaN(heightNum) ||
      widthNum <= 0 ||
      lengthNum <= 0 ||
      heightNum <= 0
    ) {
      return res.status(400).json({ msg: 'Valid product dimensions are required' })
    }

    // Validate requestId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ msg: 'Invalid requestId' })
    }

    // generate 5-digit numeric offer number
    const generateOfferNumber = async (): Promise<string> => {
      for (let i = 0; i < 5; i++) {
        const num = Math.floor(10000 + Math.random() * 90000).toString()
        const exists = await Offer.exists({ offerNumber: num })
        if (!exists) return num
      }
      // fallback deterministic
      const fallback = Math.floor(Date.now() % 100000).toString().padStart(5, '0')
      return fallback
    }
    const offerNumber = await generateOfferNumber()

    const offer = new Offer({
      request: new mongoose.Types.ObjectId(requestId),
      seller: new mongoose.Types.ObjectId(sellerId),
      price,
      message: message || undefined,
      warranty: warranty || undefined,
      returnDays: returnDays !== undefined ? Number(returnDays) : undefined,
      offerNumber,
      dimensions: {
        width: widthNum,
        length: lengthNum,
        height: heightNum,
      },
    })

    await offer.save()
    try {
      await PartsRequest.updateOne(
        { _id: requestId, status: { $ne: 'Completed' } },
        {
          $set: { status: 'Offer Sent' },
          $addToSet: { sellerIds: sellerId },
        }
      ).exec()
    } catch (err) {
      console.error('createOffer status update error:', err)
    }

    // Emit real-time event to buyer via Socket.IO
    const io = getIO()
    if (io) {
      io.to(String(requestId)).emit('offer:created', {
        requestId,
        offerId: offer._id,
        sellerId,
        price,
        offerNumber,
      })
    }

    // Notify the buyer about the new offer
    try {
      const [reqDoc, sellerDoc] = await Promise.all([
        PartsRequest.findById(requestId)
          .select('userId partName companyName carName variant year requestNumber')
          .lean(),
        User.findById(sellerId).select('name businessName storeName').lean()
      ])
      if (reqDoc?.userId) {
        const requestNumber =
          (reqDoc as any).requestNumber ||
          Math.abs(parseInt(String(reqDoc._id).slice(-5), 16) % 100000)
            .toString()
            .padStart(5, '0')
        const storeName = sellerDoc?.storeName || sellerDoc?.businessName || sellerDoc?.name || 'A seller'
        const partParts = [
          (reqDoc as any)?.companyName,
          (reqDoc as any)?.carName,
          (reqDoc as any)?.variant,
          (reqDoc as any)?.year,
          (reqDoc as any)?.partName,
        ].filter(Boolean)
        const partLabel = partParts.length ? partParts.join(' ') : ((reqDoc as any)?.partName || 'requested part')
        const extras = []
        if (warranty) extras.push(`with ${warranty} Warranty &`)
        if (returnDays !== undefined) extras.push(`${returnDays} days Refund & Exchange Policy`)
        const extraText = extras.length ? `${extras.join(' ')}` : ''
        const desc = `${storeName} offered PKR ${price} for ${partLabel}${extraText}`
        const encodedPartName = (reqDoc as any)?.partName
          ? `&requestPartName=${encodeURIComponent((reqDoc as any)?.partName)}`
          : ''
        const targetRoute = `/requestoffers?requestId=${requestId}${encodedPartName}`
        await createNotification(
          reqDoc.userId as any,
          'New Offer Received',
          desc,
          'order',
          {
            requestId,
            offerId: offer._id,
            offerNumber,
            requestNumber,
            warranty: offer.warranty,
            returnDays: offer.returnDays,
            route: targetRoute,
          }
        )
        // Send push notification to buyer
        await sendPushToUserTokens(String(reqDoc.userId), {
          title: 'New Offer Received',
          body: desc,
          data: {
            type: 'new-offer',
            requestId: String(requestId),
            offerId: String(offer._id),
            offerNumber,
            requestNumber,
            route: targetRoute,
          }
        })
      }
    } catch (notifyErr) {
      console.error('createOffer notification error:', notifyErr)
    }

    return res.status(201).json({ msg: 'Offer created', offer })
  } catch (err) {
    console.error('createOffer error:', err)
    return res.status(500).json({ msg: 'Server error', error: (err as Error).message })
  }
}

// Get all offers for a specific request
export const getOffersByRequestId = async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ msg: 'Invalid requestId' })
    }

    const reqDoc = await PartsRequest.findById(requestId).lean()
    if (!reqDoc) return res.status(404).json({ msg: 'Request not found' })

    const offers = await Offer.find({ request: new mongoose.Types.ObjectId(requestId) })
      .populate('seller', 'name email phone storeName businessName')
      .sort({ createdAt: -1 })
      .lean()

    const sellersInterested = (reqDoc.sellerIds || []).map(s => s.toString())
    const existing = new Set<string>()
    offers.forEach((o: any) => existing.add((o.seller as any)?._id?.toString?.() || (o.seller as any)?.toString?.()))

    const missingSellerIds = sellersInterested.filter(id => !existing.has(id))
    if (missingSellerIds.length) {
      const sellers = await User.find({ _id: { $in: missingSellerIds } })
        .select('name email phone storeName businessName')
        .lean()
      sellers.forEach(s => {
        offers.push({
          _id: `${requestId}-${s._id}-pending`,
          request: reqDoc,
          seller: s,
          price: undefined,
          createdAt: reqDoc.createdAt || new Date(),
        } as any)
      })
    }

    // unread per seller
    const chatUnread: Record<string, number> = {}
    const chats = await ChatMessage.find({ requestId: requestId })
      .select('seller sender readBy')
      .lean()
    chats.forEach(c => {
      const sellerId = (c as any)?.seller?.toString?.()
      const senderId = (c as any)?.sender?.toString?.()
      if (!sellerId) return
      const readBy = ((c as any).readBy || []).map((x: any) => x?.toString?.())
      // buyer thread is viewing all sellers; count buyer-unread only
      if (senderId && senderId === reqDoc.userId?.toString?.()) return
      if (readBy.includes(reqDoc.userId?.toString?.())) return
      chatUnread[sellerId] = (chatUnread[sellerId] || 0) + 1
    })

    offers.forEach((o: any) => {
      const sellerId = (o.seller as any)?._id?.toString?.() || (o.seller as any)?.toString?.()
      if (sellerId) o.unreadMessages = chatUnread[sellerId] || 0
      if (!o.offerNumber) {
        const fallback = Math.abs(parseInt(String(o._id).slice(-5), 16) % 100000)
          .toString()
          .padStart(5, '0')
        o.offerNumber = fallback
      }
      o.accepted = reqDoc.acceptedOffer && String(reqDoc.acceptedOffer) === String(o._id)
    })

    const acceptedOffer = reqDoc.acceptedOffer
      ? offers.find((o: any) => String(o._id) === String(reqDoc.acceptedOffer))
      : null
    let acceptedSeller: any = null
    if (reqDoc.assignedSeller) {
      acceptedSeller = await User.findById(reqDoc.assignedSeller)
        .select('name email storeName businessName')
        .lean()
    }

    const requestNumber =
      (reqDoc as any).requestNumber ||
      Math.abs(parseInt(String(reqDoc._id).slice(-5), 16) % 100000)
        .toString()
        .padStart(5, '0')

    offers.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())

    return res.json({
      msg: 'Offers retrieved',
      offers,
      isClosed: reqDoc.status === 'Completed',
      acceptedOfferId: reqDoc.acceptedOffer,
      acceptedSeller,
      acceptedPrice: (acceptedOffer as any)?.price,
      requestNumber,
    })
  } catch (err) {
    console.error('getOffersByRequestId error:', err)
    return res.status(500).json({ msg: 'Server error', error: (err as Error).message })
  }
}

// Get all offers created by a seller
export const getOffersBySellerId = async (req: AuthRequest, res: Response) => {
  try {
    const sellerId = getEffectiveSellerId(req)

    if (!sellerId) return res.status(400).json({ msg: 'Seller id required' })
    if (!mongoose.Types.ObjectId.isValid(sellerId)) {
      return res.status(400).json({ msg: 'Invalid sellerId' })
    }

    const offers = await Offer.find({ seller: new mongoose.Types.ObjectId(sellerId) })
      .populate('request', 'title description category')
      .sort({ createdAt: -1 })
      .lean()

    return res.json({ msg: 'Offers retrieved', offers })
  } catch (err) {
    console.error('getOffersBySellerId error:', err)
    return res.status(500).json({ msg: 'Server error', error: (err as Error).message })
  }
}

// Get offer by ID
export const getOfferById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ msg: 'Invalid offer id' })
    }

    const offer = await Offer.findById(id)
      .populate('request', 'title description category')
      .populate('seller', 'name email phone')
      .lean()

    if (!offer) return res.status(404).json({ msg: 'Offer not found' })
    return res.json({ msg: 'Offer retrieved', offer })
  } catch (err) {
    console.error('getOfferById error:', err)
    return res.status(500).json({ msg: 'Server error', error: (err as Error).message })
  }
}

// Update offer (change message, price)
export const updateOffer = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { price, message, warranty, returnDays } = req.body
    const sellerId = req.user?.userId

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ msg: 'Invalid offer id' })
    }

    const offer = await Offer.findById(id).populate('request')
    if (!offer) return res.status(404).json({ msg: 'Offer not found' })

    // Authorization: only seller can update their own offer
    if (String(offer.seller) !== String(sellerId)) {
      return res.status(403).json({ msg: 'Not authorized to update this offer' })
    }

    // Update allowed fields aligned with model
    if (typeof price === 'number' && price >= 0) offer.price = price
    if (typeof message === 'string') offer.message = message
    if (typeof warranty === 'string') offer.warranty = warranty
    if (returnDays !== undefined) {
      const rd = Number(returnDays)
      if (Number.isNaN(rd) || rd < 0) {
        return res.status(400).json({ msg: 'Valid returnDays is required' })
      }
      offer.returnDays = rd
    }

    await offer.save()

    // Emit real-time update to buyer via WebSocket
    const io = getIO()
    if (io && offer.request) {
      const requestId = (offer.request as any)._id || offer.request
      io.to(String(requestId)).emit('offer:updated', {
        offerId: offer._id,
        price: offer.price,
        message: offer.message,
        warranty: offer.warranty,
        returnDays: offer.returnDays,
        sellerId: offer.seller,
        offerNumber: offer.offerNumber,
      })
    }

    return res.json({ msg: 'Offer updated', offer })
  } catch (err) {
    console.error('updateOffer error:', err)
    return res.status(500).json({ msg: 'Server error', error: (err as Error).message })
  }
}

// Accept an offer
export const acceptOffer = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any)?.user
    const buyerIdRaw = authUser?.userId
    if (!buyerIdRaw || !mongoose.Types.ObjectId.isValid(String(buyerIdRaw))) {
      return res.status(401).json({ msg: 'Not authenticated' })
    }

    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ msg: 'Invalid offer id' })
    }

    const offer = await Offer.findById(id).populate('request').lean()
    if (!offer) return res.status(404).json({ msg: 'Offer not found' })

    const request = await PartsRequest.findById(offer.request as any).lean()
    if (!request) return res.status(404).json({ msg: 'Request not found' })

    // Ensure this buyer owns the request
    if (String(request.userId) !== String(buyerIdRaw)) {
      return res.status(403).json({ msg: 'Not authorized to accept this offer' })
    }

    // Create temporary product object (NOT stored in DB)
    // Build detailed product name including part name and car details
    const vehicleParts = [request.companyName, request.carName, request.variant, request.year].filter(Boolean)
    const vehicleLabel = vehicleParts.length > 0 ? vehicleParts.join(' ') : ''
    const detailedProductName = vehicleLabel
      ? `${request.partName || 'Quoted Part'} - ${vehicleLabel}`
      : (request.partName || 'Quoted Part')

    const tempProduct = {
      _id: new mongoose.Types.ObjectId(),
      name: detailedProductName,
      description: request.description || 'Quoted part for your request',
      price: offer.price,
      salePrice: offer.price,
      categories: request.companyName ? [request.companyName] : ['Quote'],
      brand: request.companyName || 'Quote',
      make: request.carName || 'N/A',
      carModel: request.carName || 'N/A',
      variant: request.variant || '',
      year: request.year || '',
      sku: `TEMP-${offer._id.toString().slice(-6)}-${Date.now().toString(36)}`,
      stock: request.quantity || 1,
      images: request.images?.[0]?.path ? [request.images[0].path] : ['https://via.placeholder.com/300?text=Quote'],
      technicalDescription: request.description || '',
      dimensions: {
        width: (offer as any)?.dimensions?.width || 0,
        length: (offer as any)?.dimensions?.length || 0,
        height: (offer as any)?.dimensions?.height || 0,
      },
      seller: offer.seller,
      returnDays: typeof offer.returnDays === 'number' ? offer.returnDays : undefined,
      status: 'active',
      isTemporary: true,
      tempRequestId: request._id,
      tempOfferId: offer._id,
      partName: request.partName,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Import Cart model dynamically
    const Cart = (await import('../models/Cart')).default

    // Add temporary product to buyer's cart
    let cart = await Cart.findOne({ user: buyerIdRaw })
    if (!cart) {
      cart = new Cart({ user: buyerIdRaw, items: [] })
    }

    // Add temp product to cart with special flag
    const cartItem = {
      product: tempProduct._id,
      quantity: request.quantity || 1,
      tempProductData: tempProduct // Store complete temp product data in cart
    }
    
    cart.items.push(cartItem as any)
    await cart.save()

    // Mark request as completed and assign seller
    const now = new Date()
    await PartsRequest.updateOne(
      { _id: request._id },
      {
        $set: { 
          assignedSeller: offer.seller, 
          acceptedOffer: offer._id, 
          status: 'Completed', 
          acceptedAt: now 
        },
        $addToSet: { sellerIds: offer.seller as any }
      }
    ).exec()

    // Delete all offers related to this request
    await Offer.deleteMany({ request: request._id }).exec()

    // Delete all chat messages related to this request
    await ChatMessage.deleteMany({ requestId: request._id }).exec()
    await Notification.deleteMany({ 'metadata.requestId': request._id, type: 'message' }).exec()

    const requestQuantity = request.quantity || 1
    const responsePayload = {
      msg: 'Offer accepted. Temporary product added to cart. Please complete checkout.',
      tempProductId: tempProduct._id,
      productId: tempProduct._id,
      quantity: requestQuantity,
      requestId: request._id,
      acceptedOfferId: offer._id,
      acceptedPrice: offer.price,
      isClosed: true,
      cartUpdated: true
    }

    // Emit real-time acceptance event to seller(s) via Socket.IO
    const io = getIO()
    if (io) {
      // Notify accepted seller immediately
      io.to(String(request._id)).emit('offer:accepted', {
        requestId: request._id,
        offerId: offer._id,
        sellerId: offer.seller,
        acceptedPrice: offer.price,
        partLabel: request.partName || 'part',
      })
    }

    // Notify accepted seller and other interested sellers about closure
    ;(async () => {
      try {
        const sellerDoc = await User.findById(offer.seller).select('name businessName storeName email').lean()
        const sellerName = sellerDoc?.businessName || sellerDoc?.storeName || sellerDoc?.name || 'Seller'
        const partLabel = request.partName || 'part'
        await createNotification(
          offer.seller as any,
          'Offer accepted',
          `Buyer accepted your offer of PKR ${offer.price} for ${partLabel}.`,
          'order',
          { requestId: request._id, offerId: offer._id }
        )
        await sendPushToUserTokens(String(offer.seller), {
          title: 'Offer accepted',
          body: `Your offer for ${partLabel} was accepted.`,
          data: { type: 'offer-accepted', requestId: String(request._id), offerId: String(offer._id) }
        })
        if (sellerDoc?.email) {
          const html = `
            <div style="font-family:Arial,sans-serif;color:#222;">
              <h2 style="margin:0 0 8px;">Your offer was accepted</h2>
              <p style="margin:0 0 6px;">Request: ${partLabel}</p>
              <p style="margin:0 0 6px;">Vehicle: ${[request.companyName, request.carName, request.variant, request.year].filter(Boolean).join(' ')}</p>
              <p style="margin:0 0 6px;">Accepted price: <strong>PKR ${offer.price?.toLocaleString?.() || offer.price}</strong></p>
              <p style="margin:8px 0 0;">Please prepare the item for checkout.</p>
            </div>
          `
          sendMail({
            to: sellerDoc.email,
            subject: 'Offer accepted',
            text: `Your offer for ${partLabel} was accepted at PKR ${offer.price}.`,
            html,
          }).catch(() => null)
        }

        const otherSellers = (request.sellerIds || [])
          .map((s: any) => s?.toString?.() || String(s))
          .filter((sid: string) => sid && sid !== String(offer.seller))
        if (otherSellers.length) {
          const closeDesc = `${request.companyName || ''} ${request.carName || ''} ${request.variant || ''} ${partLabel} request is closed.`
          await Promise.all(
            otherSellers.map(sid =>
              createNotification(
                sid as any,
                'Request closed',
                closeDesc.trim(),
                'order',
                { requestId: request._id }
              ).catch(() => null)
            )
          )
        }
      } catch (notifyErr) {
        console.error('acceptOffer notification error', notifyErr)
      }
    })()

    return res.json(responsePayload)
  } catch (err) {
    console.error('acceptOffer error:', err)
    return res.status(500).json({ msg: 'Server error', error: (err as Error).message })
  }
}

// Reject an offer
export const rejectOffer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ msg: 'Invalid offer id' })
    }

    const offer = await Offer.findById(id)
    if (!offer) return res.status(404).json({ msg: 'Offer not found' })

    await offer.save()
    return res.json({ msg: 'Offer rejected', offer })
  } catch (err) {
    console.error('rejectOffer error:', err)
    return res.status(500).json({ msg: 'Server error', error: (err as Error).message })
  }
}

// Delete offer
export const deleteOffer = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const requesterId = req.user?.userId

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ msg: 'Invalid offer id' })
    }

    const offer = await Offer.findById(id)
    if (!offer) return res.status(404).json({ msg: 'Offer not found' })

    // Authorization: seller who created the offer OR buyer who owns the request
    const request = offer.request ? await PartsRequest.findById(offer.request).lean() : null
    const isSeller = requesterId && String(offer.seller) === String(requesterId)
    const isBuyer = requesterId && request && String(request.userId) === String(requesterId)

    if (!isSeller && !isBuyer) {
      return res.status(403).json({ msg: 'Not authorized to delete this offer' })
    }

    // If this was the accepted offer for the request, clear it to avoid dangling refs
    if (request && request.acceptedOffer && String(request.acceptedOffer) === String(offer._id)) {
      await PartsRequest.findByIdAndUpdate(request._id, {
        $unset: { acceptedOffer: "", acceptedAt: "", assignedSeller: "" }
      })
    }

    await Offer.findByIdAndDelete(id)
    return res.json({ msg: 'Offer deleted' })
  } catch (err) {
    console.error('deleteOffer error:', err)
    return res.status(500).json({ msg: 'Server error', error: (err as Error).message })
  }
}

// Get offers for the authenticated buyer (their requests)
export const getOffersForBuyer = async (req: AuthRequest, res: Response) => {
  try {
    const buyerId = req.user?.userId
    if (!buyerId || !mongoose.Types.ObjectId.isValid(buyerId)) {
      return res.status(401).json({ msg: 'Not authenticated' })
    }

    const requests = await PartsRequest.find({ userId: buyerId })
      .select('_id partName images companyName carName variant year sellerIds acceptedOffer status requestNumber createdAt updatedAt')
      .lean()
    requests.forEach((r: any) => {
      if (!r.requestNumber) {
        r.requestNumber = Math.abs(parseInt(String(r._id).slice(-5), 16) % 100000)
          .toString()
          .padStart(5, '0')
      }
    })
    const requestIds = requests.map(r => r._id)
    if (requestIds.length === 0) return res.json({ offers: [] })

    const offers = await Offer.find({ request: { $in: requestIds } })
      .populate('seller', 'name email storeName businessName')
      .populate('request')
      .sort({ createdAt: -1 })
      .lean()

    // map assigned sellers for accepted requests
    const assignedSellerIds = requests
      .map(r => (r as any)?.assignedSeller)
      .filter(Boolean)
      .map(id => id.toString())
    const assignedSellerMap = new Map<string, any>()
    if (assignedSellerIds.length) {
      const sellers = await User.find({ _id: { $in: assignedSellerIds } })
        .select('name email storeName businessName')
        .lean()
      sellers.forEach(s => assignedSellerMap.set(s._id.toString(), s))
    }

    const allRequestIds = requestIds.map(r => r.toString())

    // unread counts per request per seller
    const chatByRequest: Record<string, Record<string, number>> = {}
    if (allRequestIds.length) {
      const chats = await ChatMessage.find({ requestId: { $in: allRequestIds } })
        .select('requestId sender readBy seller')
        .lean()
      chats.forEach(c => {
        const reqId = (c.requestId as any)?.toString?.() || String(c.requestId)
        const sellerId = (c as any)?.seller?.toString?.()
        const senderId = (c.sender as any)?.toString?.()
        const readBy = ((c as any).readBy || []).map((x: any) => x?.toString?.())
        if (!reqId || !sellerId) return
        if (!chatByRequest[reqId]) chatByRequest[reqId] = {}
        if (senderId && senderId !== buyerId && !readBy.includes(buyerId)) {
          chatByRequest[reqId][sellerId] = (chatByRequest[reqId][sellerId] || 0) + 1
        }
      })
    }

    // include sellers that marked interest but haven't sent an offer yet
    const existingByRequest = new Map<string, Set<string>>()
    offers.forEach((o: any) => {
      const reqId = (o.request as any)?._id?.toString?.() || (o.request as any)?.toString?.()
      const sellerId = (o.seller as any)?._id?.toString?.() || (o.seller as any)?.toString?.()
      if (reqId && sellerId) {
        if (!existingByRequest.has(reqId)) existingByRequest.set(reqId, new Set())
        existingByRequest.get(reqId)!.add(sellerId)
      }
    })

    const missingPairs: { requestId: string; sellerId: string }[] = []
    requests.forEach(req => {
      const reqId = req._id.toString()
      const seen = existingByRequest.get(reqId) || new Set<string>()
      ;(req.sellerIds || []).forEach(sid => {
        const s = sid.toString()
        if (!seen.has(s)) {
          missingPairs.push({ requestId: reqId, sellerId: s })
        }
      })
    })

    if (missingPairs.length) {
      const sellerIds = missingPairs.map(p => p.sellerId)
      const sellers = await User.find({ _id: { $in: sellerIds } })
        .select('name email storeName businessName')
        .lean()
      const sellerMap = new Map<string, any>()
      sellers.forEach(s => sellerMap.set(s._id.toString(), s))

      missingPairs.forEach(pair => {
        const req = requests.find(r => r._id.toString() === pair.requestId)
        const seller = sellerMap.get(pair.sellerId)
        if (req && seller) {
          offers.push({
            _id: `${pair.requestId}-${pair.sellerId}-pending`,
            request: req,
            seller,
            price: undefined,
            message: undefined,
            createdAt: req.createdAt,
            unreadMessages: chatByRequest[pair.requestId]?.[pair.sellerId] ?? 0,
          } as any)
        }
      })
    }

    // ensure every request appears at least once (placeholder with 0 offers)
    const requestsWithEntries = new Set<string>(
      offers.map((o: any) => ((o.request as any)?._id || (o.request as any)?.toString?.() || '').toString())
    )
    requests.forEach(req => {
      const reqId = req._id.toString()
      if (!requestsWithEntries.has(reqId)) {
        offers.push({
          _id: `${reqId}-placeholder`,
          request: req,
          seller: null,
          price: undefined,
          message: undefined,
          createdAt: req.createdAt || new Date(),
          unreadMessages: 0,
        } as any)
      }
    })

    // attach unread counts for real offers as well
    offers.forEach((o: any) => {
      const reqId = (o.request as any)?._id?.toString?.() || (o.request as any)?.toString?.()
      const sellerId = (o.seller as any)?._id?.toString?.() || (o.seller as any)?.toString?.()
      if (reqId && sellerId) {
        if ((o as any).request && !(o as any).request.requestNumber) {
          ;(o as any).request.requestNumber = Math.abs(parseInt(String(reqId).slice(-5), 16) % 100000)
            .toString()
            .padStart(5, '0')
        }
        o.unreadMessages = chatByRequest[reqId]?.[sellerId] ?? 0
        if (!o.offerNumber) {
          const fallback = Math.abs(parseInt(String(o._id).slice(-5), 16) % 100000)
            .toString()
            .padStart(5, '0')
          o.offerNumber = fallback
        }
        const reqMatch = requests.find(r => r._id.toString() === reqId)
        if (reqMatch) {
          ;(o as any).requestClosed = reqMatch.status === 'Completed'
          ;(o as any).acceptedOfferId = reqMatch.acceptedOffer
          ;(o as any).accepted = reqMatch.acceptedOffer && String(reqMatch.acceptedOffer) === String(o._id)
          const assignedSeller = (reqMatch as any)?.assignedSeller
            ? assignedSellerMap.get((reqMatch as any).assignedSeller.toString())
            : undefined
          if (assignedSeller) {
            ;(o as any).acceptedSeller = assignedSeller
          }
          if ((reqMatch as any)?.acceptedOffer && String((reqMatch as any).acceptedOffer) === String(o._id) && typeof o.price === 'number') {
            ;(o as any).acceptedPrice = o.price
          }
        }
      }
    })

    offers.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())

    return res.json({ offers })
  } catch (err) {
    console.error('getOffersForBuyer error:', err)
    return res.status(500).json({ msg: 'Server error', error: (err as Error).message })
  }
}
