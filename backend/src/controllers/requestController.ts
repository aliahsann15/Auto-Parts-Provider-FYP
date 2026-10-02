import { Request, Response } from 'express'
import PartsRequest, { IPartsRequest } from '../models/Parts-Request'
import mongoose from 'mongoose'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../middleware/auth'
import { createNotification } from '../utils/notificationService'
import User from '../models/User'
import Notification from '../models/Notification'
import Offer from '../models/Offer'
import { sendPushToUserTokens } from '../utils/pushService'
import ChatMessage from '../models/ChatMessage'

const decodeAuthUser = (req: Request) => {
  try {
    const authHeader = ((req.headers.authorization as string) || '').trim()
    if (!authHeader) return null
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader
    if (!token) return null
    return jwt.verify(token, JWT_SECRET) as { userId?: string; role?: string }
  } catch {
    return null
  }
}

/**
 * Create a new parts request.
 * Expects multipart/form-data with fields:
 *  - companyName (required)
 *  - carName (required)
 *  - partName (required)
 *  - variant, year, description, quantity (optional)
 *  - images[] (optional, handled by multer memoryStorage)
 * Requires userId either on req.user (auth middleware) or in req.body.userId.
 */
export async function createPartsRequest(req: Request, res: Response) {
  try {
    const {
      companyName,
      carName,
      partName,
      category,
      variant,
      year,
      description,
      quantity
    } = req.body

    // Determine userId: prefer authenticated user (req.user), fallback to body.userId
    const authUser = (req as any).user
    const userIdRaw = authUser?.userId || authUser?._id || req.body.userId
    if (!userIdRaw) {
      return res.status(400).json({
        ok: false,
        msg: 'userId is required (provide via authenticated req.user or body.userId)'
      })
    }
    if (!mongoose.Types.ObjectId.isValid(String(userIdRaw))) {
      return res.status(400).json({ ok: false, msg: 'Invalid userId' })
    }
    const userId = new mongoose.Types.ObjectId(String(userIdRaw))

    // Basic validation
    if (!companyName || !carName || !partName) {
      return res.status(400).json({
        ok: false,
        msg: 'companyName, carName and partName are required'
      })
    }

    // generate request number (5-digit)
    const generateRequestNumber = async (): Promise<string> => {
      for (let i = 0; i < 5; i++) {
        const num = Math.floor(10000 + Math.random() * 90000).toString()
        const exists = await PartsRequest.exists({ requestNumber: num })
        if (!exists) return num
      }
      const fallback = Math.floor(Date.now() % 100000).toString().padStart(5, '0')
      return fallback
    }
    const requestNumber = await generateRequestNumber()

    const files = (req.files as Express.Multer.File[] | undefined) || []

    // Persist images to web/public/images/requests and store served path
    const uploadDir = path.resolve(process.cwd(), '../web/public/images/requests')
    await fs.mkdir(uploadDir, { recursive: true })

    const images: IPartsRequest['images'] = []
    for (const f of files) {
      const ext = path.extname(f.originalname) || ''
      const safeName = `${Date.now()}-${crypto.randomUUID()}${ext}`
      const dest = path.join(uploadDir, safeName)
      await fs.writeFile(dest, f.buffer)
      images.push({
        filename: f.originalname,
        contentType: f.mimetype,
        path: `/images/requests/${safeName}`,
        size: f.size
      })
    }

    const doc = new PartsRequest({
      userId,
      requestNumber,
      companyName: String(companyName),
      carName: String(carName),
      partName: String(partName),
      category: category ? String(category) : undefined,
      variant: variant ? String(variant) : undefined,
      year: year ? String(year) : undefined,
      description: description ? String(description) : undefined,
      quantity: quantity ? Number(quantity) : undefined,
      images,
      status: 'Pending'
    } as Partial<IPartsRequest>)

    await doc.save()

    // Notify requester
    await createNotification(
      userId,
      'Your Request has been posted',
      'Go to your request tab to check offers',
      'order',
      { requestId: doc._id, route: '/(tabs)/inbox' }
    )

    // Notify all sellers (broadcast) instead of matching on make/category
    const sellers = await User.find({ role: 'Seller' })
      .select('_id')
      .lean()
    const descParts = [
      companyName,
      carName,
      variant,
      year,
      partName
    ].filter(Boolean).join(' ');
    const notificationDesc = `A buyer requested a request for ${descParts || 'a part'}. Send a quote or chat.`;

    const notifications = sellers.map(s =>
      createNotification(
        s._id,
        'New Parts Request',
        notificationDesc,
        'request',
        { requestId: doc._id }
      )
    )
    await Promise.all(notifications)

    // Send push notifications to each seller (best-effort; don't block request creation)
    const pushPayload = {
      title: 'New Parts Request',
      body: notificationDesc,
      data: { type: 'request', requestId: String(doc._id) }
    }
    const pushSends = sellers.map(s =>
      sendPushToUserTokens(String(s._id), pushPayload).catch(err => {
        console.error('Failed to send push to seller', s._id, err)
        return null
      })
    )
    await Promise.allSettled(pushSends)

    return res.status(201).json({ ok: true, id: doc._id })
  } catch (err) {
    console.error('createPartsRequest error:', err)
    return res.status(500).json({ ok: false, error: 'Server error' })
  }
}

/**
 * List parts requests with optional pagination.
 * Query params: page (1-based), limit
 */
export async function listPartsRequests(req: Request, res: Response) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Number(req.query.limit) || 20)
    const skip = (page - 1) * limit

    const [items, total] = await Promise.all([
      PartsRequest.find()
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      PartsRequest.countDocuments().exec()
    ])

    const requestIds = items.map(item => item._id).filter(Boolean)
    const offerCountMap = new Map<string, number>()
    const offerSellerMap = new Map<string, Set<string>>()
    if (requestIds.length) {
      const offerCounts = await Offer.aggregate([
        { $match: { request: { $in: requestIds } } },
        {
          $group: {
            _id: '$request',
            count: { $sum: 1 },
            sellers: { $addToSet: '$seller' }
          }
        }
      ])
      offerCounts.forEach((row: any) => {
        const key = row?._id?.toString?.()
        if (!key) return
        offerCountMap.set(key, row.count ?? 0)
        const sellers = Array.isArray(row?.sellers) ? row.sellers.map((s: any) => String(s)) : []
        offerSellerMap.set(key, new Set(sellers.filter(Boolean)))
      })
    }

    const chatStatsMap = new Map<string, { threadCount: number; unreadCount: number }>()
    const decodedUser = decodeAuthUser(req)
    const userRole = (decodedUser?.role || '').toLowerCase()
    const isSuperAdminRequestList = userRole === 'superadmin'
    const superAdminUserId =
      isSuperAdminRequestList && decodedUser?.userId
        ? new mongoose.Types.ObjectId(String(decodedUser.userId))
        : null
    const superAdminUnreadMap = new Map<string, number>()
    if (requestIds.length) {
      const chatStats = await ChatMessage.aggregate([
        { $match: { requestId: { $in: requestIds } } },
        {
          $group: {
            _id: '$requestId',
            sellers: { $addToSet: '$seller' },
            unreadCount: {
              $sum: {
                $cond: [
                  { $eq: ['$sender', '$seller'] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ])
      chatStats.forEach((row: any) => {
        const key = row?._id?.toString?.()
        if (!key) return
        const sellers = Array.isArray(row?.sellers) ? row.sellers.map((s: any) => String(s)) : []
        chatStatsMap.set(key, {
          threadCount: sellers.filter(Boolean).length,
          unreadCount: Number(row?.unreadCount || 0),
        })
      })
      if (superAdminUserId) {
        const unreadAgg = await ChatMessage.aggregate([
          { $match: { requestId: { $in: requestIds } } },
          {
            $group: {
              _id: '$requestId',
              unreadCount: {
                $sum: {
                  $cond: [
                    { $in: [superAdminUserId, { $ifNull: ['$readBy', []] }] },
                    0,
                    1,
                  ],
                },
              },
            },
          },
        ])
        unreadAgg.forEach((row: any) => {
          const key = row?._id?.toString?.()
          if (!key) return
          superAdminUnreadMap.set(key, Number(row?.unreadCount || 0))
        })
      }
    }

    const acceptedOfferIds = Array.from(
      new Set(
        items
          .map(item => item.acceptedOffer)
          .filter(Boolean)
          .map(id => String(id))
      )
    )
    const acceptedOfferDetails = acceptedOfferIds.length
      ? await Offer.find({ _id: { $in: acceptedOfferIds } })
          .populate('seller', 'storeName businessName name')
          .lean()
      : []
    const acceptedOfferMap = new Map<string, { price?: number; sellerName?: string }>()
    acceptedOfferDetails.forEach((offer: any) => {
      const seller = offer?.seller
      const sellerName =
        seller?.storeName || seller?.businessName || seller?.name || 'Store'
      acceptedOfferMap.set(String(offer._id), {
        price: offer.price,
        sellerName,
      })
    })

    items.forEach(item => {
      const key = String(item._id)
      ;(item as any).offerCount = offerCountMap.get(key) ?? 0
      const sellerIds = Array.isArray(item.sellerIds) ? item.sellerIds.map(s => String(s)) : []
      const sellersSet = new Set(sellerIds.filter(Boolean))
      const offerSellers = offerSellerMap.get(key)
      let interestedCount = sellersSet.size
      if (offerSellers && offerSellers.size) {
        for (const sellerId of offerSellers) {
          if (sellersSet.has(sellerId)) {
            interestedCount -= 1
          }
        }
        interestedCount = Math.max(0, interestedCount)
      }
      (item as any).interestedCount = interestedCount
      const acceptedInfo = acceptedOfferMap.get(String(item.acceptedOffer))
      if (acceptedInfo) {
        ;(item as any).acceptedOfferPrice = acceptedInfo.price
        ;(item as any).acceptedSellerName = acceptedInfo.sellerName
      }
      const chatInfo = chatStatsMap.get(key)
      ;(item as any).chatThreadCount = chatInfo?.threadCount ?? 0
      ;(item as any).chatUnreadCount = isSuperAdminRequestList
        ? superAdminUnreadMap.get(key) ?? 0
        : chatInfo?.unreadCount ?? 0
    })

    return res.json({
      ok: true,
      page,
      limit,
      total,
      items
    })
  } catch (err) {
    console.error('listPartsRequests error:', err)
    return res.status(500).json({ ok: false, error: 'Server error' })
  }
}

/**
 * Get a single parts request by id.
 * If ?includeImages=true query param is provided, images binary data will be returned.
 */
export async function getPartsRequestById(req: Request, res: Response) {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, error: 'Invalid id' })
    }

    const includeImages = req.query.includeImages === 'true'

    const query = PartsRequest.findById(id)
    if (!includeImages) {
      query.select('-images.data')
    }

    const doc = await query.lean().exec()

    if (!doc) {
      return res.status(404).json({ ok: false, error: 'Not found' })
    }

    return res.json({ ok: true, item: doc })
  } catch (err) {
    console.error('getPartsRequestById error:', err)
    return res.status(500).json({ ok: false, error: 'Server error' })
  }
}

/**
 * Delete a parts request by id.
 */
export async function deletePartsRequest(req: Request, res: Response) {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, error: 'Invalid id' })
    }

    const result = await PartsRequest.findByIdAndDelete(id).exec()
    if (!result) {
      return res.status(404).json({ ok: false, error: 'Not found' })
    }

    return res.json({ ok: true, id: result._id })
  } catch (err) {
    console.error('deletePartsRequest error:', err)
    return res.status(500).json({ ok: false, error: 'Server error' })
  }
}

/**
 * List parts requests for the authenticated user.
 * Query params: page (1-based), limit
 */
export async function listUserPartsRequests(req: Request, res: Response) {
  try {
    const authUser = (req as any).user
    const userIdRaw = authUser?.userId || authUser?._id
    if (!userIdRaw) {
      return res.status(400).json({ ok: false, msg: 'Authenticated user id not found' })
    }
    if (!mongoose.Types.ObjectId.isValid(String(userIdRaw))) {
      return res.status(400).json({ ok: false, msg: 'Invalid userId' })
    }
    const userId = new mongoose.Types.ObjectId(String(userIdRaw))

    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Number(req.query.limit) || 50)
    const skip = (page - 1) * limit

    const [items, total] = await Promise.all([
      PartsRequest.find({ $or: [{ userId }, { user: userId }] })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      PartsRequest.countDocuments({ $or: [{ userId }, { user: userId }] }).exec()
    ])

    return res.json({
      ok: true,
      page,
      limit,
      total,
      items
    })
  } catch (err) {
    console.error('listUserPartsRequests error:', err)
    return res.status(500).json({ ok: false, error: 'Server error' })
  }
}

/**
 * List parts requests for a seller that has engaged or been assigned.
 */
export async function listSellerPartsRequests(req: Request, res: Response) {
  try {
    const sellerIdRaw = (req as any)?.user?.userId;
    const assignedSeller = (req as any)?.user?.sellerId;
    const effectiveSellerIdStr =
      (req as any)?.user?.role === 'StoreManager' && assignedSeller
        ? String(assignedSeller)
        : String(sellerIdRaw);

    if (!effectiveSellerIdStr || !mongoose.Types.ObjectId.isValid(String(effectiveSellerIdStr))) {
      return res.status(401).json({ ok: false, msg: 'Unauthorized' });
    }
    const sellerId = new mongoose.Types.ObjectId(String(effectiveSellerIdStr));
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 50);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      PartsRequest.find({
        $or: [{ sellerIds: sellerId }, { assignedSeller: sellerId }]
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      PartsRequest.countDocuments({
        $or: [{ sellerIds: sellerId }, { assignedSeller: sellerId }]
      }).exec()
    ]);

    // compute unread messages for seller (count buyer messages)
    const requestIds = items.map(r => r._id.toString());
    if (requestIds.length) {
      const chatMessages = await (await import('../models/ChatMessage')).default
        .find({ requestId: { $in: requestIds }, seller: sellerId })
        .select('requestId sender readBy')
        .lean();
      const unreadByRequest: Record<string, number> = {};
       chatMessages.forEach(m => {
    const reqId = (m as any).requestId?.toString?.() || String((m as any).requestId);
    const senderId = (m as any).sender?.toString?.() || String((m as any).sender || '');
    if (!reqId) return;
    const sellerIdStr = sellerId.toString();

    // ignore seller's own messages
    if (senderId === sellerIdStr) return;

    const readBy = Array.isArray((m as any).readBy) ? (m as any).readBy.map((x: any) => String(x)) : [];
    const isReadBySeller = readBy.includes(sellerIdStr);

    if (!isReadBySeller) {
      unreadByRequest[reqId] = (unreadByRequest[reqId] || 0) + 1;
    }
  });
      items.forEach(r => {
        const reqId = r._id.toString();
        (r as any).unreadMessages = unreadByRequest[reqId] || 0;
      });
    }

    // attach accepted offer price/time for winning seller
    const acceptedOfferIds = items
      .filter(r => String((r as any)?.assignedSeller) === sellerId.toString() && (r as any)?.acceptedOffer)
      .map(r => (r as any).acceptedOffer?.toString());
    if (acceptedOfferIds.length) {
      const acceptedOffers = await Offer.find({ _id: { $in: acceptedOfferIds } })
        .select('price createdAt')
        .lean();
      const acceptedMap = new Map<string, any>();
      acceptedOffers.forEach((o: any) => acceptedMap.set(o._id.toString(), o));
      items.forEach(r => {
        const offerId = (r as any)?.acceptedOffer?.toString?.();
        if (offerId && acceptedMap.has(offerId)) {
          const offer = acceptedMap.get(offerId);
          (r as any).acceptedOfferPrice = offer?.price;
          (r as any).acceptedAt = (r as any).acceptedAt || offer?.createdAt;
        }
      });
    }

    // ensure requestNumber fallback for legacy docs
    items.forEach(r => {
      if (!(r as any).requestNumber) {
        (r as any).requestNumber = Math.abs(parseInt(String(r._id).slice(-5), 16) % 100000)
          .toString()
          .padStart(5, '0');
      }
    });

    return res.json({ ok: true, page, limit, total, items });
  } catch (err) {
    console.error('listSellerPartsRequests error:', err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}

/**
 * Mark seller engagement on a request (first tap on quote/chat).
 */
export async function engagePartsRequest(req: Request, res: Response) {
  try {
    const sellerIdRaw = (req as any)?.user?.userId;
    if (!sellerIdRaw || !mongoose.Types.ObjectId.isValid(String(sellerIdRaw))) {
      return res.status(401).json({ ok: false, msg: 'Unauthorized' });
    }
    const sellerId = new mongoose.Types.ObjectId(String(sellerIdRaw));
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, msg: 'Invalid request id' });
    }

    const existing = await PartsRequest.findById(id).lean();
    if (!existing) {
      return res.status(404).json({ ok: false, msg: 'Request not found' });
    }
    const alreadyInterested = Array.isArray((existing as any).sellerIds)
      ? (existing as any).sellerIds.some((sid: any) => String(sid) === String(sellerId))
      : false;

    const updated = await PartsRequest.findOneAndUpdate(
      { _id: id },
      { $addToSet: { sellerIds: sellerId } },
      { new: true }
    ).lean();

    // mark related request notifications as read for this seller
    await Notification.updateMany(
      { user: sellerId, type: 'request', 'metadata.requestId': updated?._id },
      { $set: { isRead: true } }
    ).exec();

    // notify buyer that a seller is interested (only on first engagement)
    const buyerId = (updated as any)?.userId;
    if (buyerId && !alreadyInterested) {
      const seller = await User.findById(sellerId).select('name businessName storeName').lean();
      const sellerName = seller?.businessName || seller?.storeName || seller?.name || 'A seller';
      const detailParts = [
        updated?.companyName,
        updated?.carName,
        updated?.variant,
        updated?.year,
        updated?.partName,
      ].filter(Boolean);
      const detailLabel = detailParts.length ? detailParts.join(' ') : (updated?.partName || 'your request');
      const desc = `${sellerName} is interested in your request for ${detailLabel}.`;
      const route = `/requestoffers?requestId=${updated?._id || ''}${
        updated?.partName ? `&requestPartName=${encodeURIComponent(updated?.partName)}` : ''
      }`;
      createNotification(
        buyerId as any,
        'Seller is interested',
        desc,
        'request',
        { requestId: updated?._id, sellerId, route, skipAction: true }
      ).catch(() => null);
      sendPushToUserTokens(String(buyerId), {
        title: 'Seller is interested',
        body: desc,
        data: { type: 'request-interest', requestId: String(updated?._id), sellerId: String(sellerId), route }
      }).catch(() => null);
    }

    return res.json({ ok: true, item: updated });
  } catch (err) {
    console.error('engagePartsRequest error:', err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}

/**
 * Remove seller engagement on a request (unassign from sellerIds, clear assignment if matches).
 */
export async function disengagePartsRequest(req: Request, res: Response) {
  try {
    const sellerIdRaw = (req as any)?.user?.userId;
    if (!sellerIdRaw || !mongoose.Types.ObjectId.isValid(String(sellerIdRaw))) {
      return res.status(401).json({ ok: false, msg: 'Unauthorized' });
    }
    const sellerId = new mongoose.Types.ObjectId(String(sellerIdRaw));
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, msg: 'Invalid request id' });
    }

    const updated = await PartsRequest.findOneAndUpdate(
      { _id: id },
      {
        $pull: { sellerIds: sellerId },
        $unset: { assignedSeller: '' }
      },
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ ok: false, msg: 'Request not found' });
    }

    // mark related request notifications as read for this seller
    await Notification.updateMany(
      { user: sellerId, type: 'request', 'metadata.requestId': updated._id },
      { $set: { isRead: true } }
    ).exec();

    return res.json({ ok: true, item: updated });
  } catch (err) {
    console.error('disengagePartsRequest error:', err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
