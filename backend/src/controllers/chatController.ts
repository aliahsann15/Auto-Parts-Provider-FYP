import { Request, Response } from 'express';
import mongoose from 'mongoose';
import ChatMessage from '../models/ChatMessage';
import PartsRequest from '../models/Parts-Request';
import User from '../models/User';
import { getIO } from '../socket';
import { AuthRequest } from '../middleware/authMiddleware';
import { createNotification } from '../utils/notificationService';
import { sendPushToUserTokens } from '../utils/pushService';
import axios from 'axios';

// Default to loopback to avoid hitting other local servers on :8000
const MODERATION_SERVICE_URL = process.env.MODERATION_SERVICE_URL || 'http://127.0.0.1:8000';

export async function listChatMessages(req: any, res: Response) {
  try {
    const { requestId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ ok: false, msg: 'Invalid request id' });
    }
    const role = (req as any)?.user?.role;
    const userId = (req as any)?.user?.userId;
    const sellerIdFromAuth = (req as any)?.user?.sellerId;
    let sellerFilter: any = {};
    if (role === 'Seller') {
      if (!userId) return res.status(401).json({ ok: false, msg: 'Unauthorized' });
      // Convert userId to ObjectId for proper MongoDB matching
      sellerFilter = { seller: new mongoose.Types.ObjectId(userId) };
    } else if (role === 'StoreManager' && sellerIdFromAuth) {
      // StoreManager: use their assigned seller's ID
      sellerFilter = { seller: new mongoose.Types.ObjectId(sellerIdFromAuth) };
    } else {
      // buyer must specify which seller thread to view
      const sellerId = req.query.sellerId as string | undefined;
      if (!sellerId || !mongoose.Types.ObjectId.isValid(String(sellerId))) {
        return res.status(400).json({ ok: false, msg: 'sellerId is required for this thread' });
      }
      sellerFilter = { seller: new mongoose.Types.ObjectId(String(sellerId)) };
    }


    const messages = await ChatMessage.find({ requestId, ...sellerFilter })
      .sort({ createdAt: 1 })
      .lean()
      .exec();
    
    
    return res.json({ ok: true, items: messages });
  } catch (err) {
    console.error('listChatMessages error', err);
    return res.status(500).json({ ok: false, msg: 'Server error' });
  }
}

export async function postChatMessage(req: any, res: Response) {
  console.log(MODERATION_SERVICE_URL)
  try {
    const { requestId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ ok: false, msg: 'Invalid request id' });
    }
    const { text, imageUrl } = req.body as { text?: string; imageUrl?: string };
    const sellerIdParam = req.body?.sellerId;
    
    if (!text && !imageUrl) {
      return res.status(400).json({ ok: false, msg: 'Message text or image is required' });
    }

    
    // Moderate text message if present
    if (text) {
      try {
        const moderationResponse = await axios.post(`${MODERATION_SERVICE_URL}/moderate`, { text });
        if (!moderationResponse.data.allowed) {
          return res.status(400).json({ 
            ok: false, 
            msg: 'Message contains personal information. Please revise and resend.',
            reason: moderationResponse.data.reason 
          });
        }
      } catch (modErr) {
        const errMsg =
          (modErr as any)?.message ||
          (modErr as any)?.response?.data?.msg ||
          (modErr as any)?.toString?.() ||
          'moderation error';
        console.warn('Moderation service error (allowing message):', errMsg);
        // If moderation service is down, log warning but allow message (fail open)
      }
    }

    const senderIdRaw = req.user?.userId;
    if (!senderIdRaw || !mongoose.Types.ObjectId.isValid(senderIdRaw)) {
      return res.status(401).json({ ok: false, msg: 'Unauthorized' });
    }
    const sender = new mongoose.Types.ObjectId(senderIdRaw);
    let sellerThread: mongoose.Types.ObjectId | undefined;
    if (req.user?.role === 'Seller') {
      sellerThread = sender;
    } else if (req.user?.role === 'StoreManager' && req.user?.sellerId) {
      // StoreManager: use their assigned seller's ID
      sellerThread = new mongoose.Types.ObjectId(req.user.sellerId);
    } else {
      if (!sellerIdParam || !mongoose.Types.ObjectId.isValid(String(sellerIdParam))) {
        console.error('Invalid sellerId:', sellerIdParam);
        return res.status(400).json({ ok: false, msg: 'sellerId is required' });
      }
      sellerThread = new mongoose.Types.ObjectId(String(sellerIdParam));
    }


    const exists = await PartsRequest.findById(requestId).lean();
    if (!exists) {
      return res.status(404).json({ ok: false, msg: 'Request not found' });
    }

    const msg = await ChatMessage.create({
      requestId,
      seller: sellerThread,
      sender,
      text,
      imageUrl,
    });


    try {
      const io = getIO();
      if (io) {
        io.to(requestId).emit('chat:new', {
          _id: (msg._id as any)?.toString?.() || String(msg._id),
          requestId: (msg.requestId as any)?.toString?.() || String(msg.requestId),
          seller: (msg.seller as any)?.toString?.() || String(msg.seller),
          sender: (msg.sender as any)?.toString?.() || String(msg.sender),
          text: msg.text,
          imageUrl: msg.imageUrl,
          createdAt: msg.createdAt,
        });
      }
    } catch (err) {
      console.error('socket emit failed', err);
    }

    // send notification to the other party
    try {
      const requestDoc = await PartsRequest.findById(requestId).select('userId partName requestNumber').lean();
      const senderUser = await User.findById(sender).select('name businessName storeName').lean();
      const senderName = senderUser?.businessName || senderUser?.storeName || senderUser?.name || 'A user';
      const messageText = text || '[Image]';

      let recipientId: mongoose.Types.ObjectId | null = null;
      if (String(req.user?.role).toLowerCase() === 'seller') {
        recipientId = requestDoc?.userId ? new mongoose.Types.ObjectId(requestDoc.userId as any) : null;
      } else {
        recipientId = sellerThread;
      }

      if (recipientId) {
      const baseTitle = requestDoc?.requestNumber ? `New Message - #${requestDoc.requestNumber}` : 'New Message';
      const title =
        req.user?.role === 'Seller' ? `${baseTitle} from ${senderName}` : baseTitle;
      const body =
        req.user?.role === 'Seller'
          ? `Seller: ${messageText}`
          : `Customer: ${messageText}`;
      const chatRoute = `/sellerchatbox?requestId=${requestId}${sellerThread ? `&sellerId=${sellerThread}` : ''}`;
      await createNotification(
        recipientId,
        title,
        body,
        'message',
        { requestId, sellerId: sellerThread, senderId: sender, route: chatRoute }
      );
      await sendPushToUserTokens(String(recipientId), {
        title,
        body,
        data: { type: 'chat', requestId, sellerId: String(sellerThread), senderId: String(sender), route: chatRoute }
      });
      }
    } catch (notifyErr) {
      console.error('chat notification error', notifyErr);
    }

    return res.status(201).json({ ok: true, item: msg });
  } catch (err) {
    console.error('postChatMessage error', err);
    return res.status(500).json({ ok: false, msg: 'Server error' });
  }
}

export async function markChatRead(req: AuthRequest, res: Response) {
  try {
    const { requestId } = req.params;
    if (!req.user?.userId) {
      return res.status(401).json({ ok: false, msg: 'Unauthorized' });
    }
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ ok: false, msg: 'Invalid request id' });
    }
    // Determine the effective seller thread id (seller or manager's assigned seller)
    let effectiveSellerId: mongoose.Types.ObjectId | null = null;
    if (req.user?.role === 'Seller') {
      effectiveSellerId = userId;
    } else if (req.user?.role === 'StoreManager' && req.user?.sellerId) {
      effectiveSellerId = new mongoose.Types.ObjectId(req.user.sellerId);
    } else {
      const sellerIdParam = (req.query.sellerId as string) || (req.body as any)?.sellerId;
      if (!sellerIdParam || !mongoose.Types.ObjectId.isValid(String(sellerIdParam))) {
        return res.status(400).json({ ok: false, msg: 'sellerId is required' });
      }
      effectiveSellerId = new mongoose.Types.ObjectId(String(sellerIdParam));
    }

    const sellerFilter = { seller: effectiveSellerId };

    if (req.user?.role === 'Seller' || req.user?.role === 'StoreManager') {
      // Collect group ids: seller + all managers assigned to this seller
      const managers = await User.find({ role: 'StoreManager', assignedSeller: effectiveSellerId })
        .select('_id')
        .lean();

      const groupIds = [effectiveSellerId, ...managers.map(m => m._id as mongoose.Types.ObjectId)];

      // Mark messages as read by the whole seller group
      await ChatMessage.updateMany(
        { requestId, ...sellerFilter },
        { $addToSet: { readBy: { $each: groupIds } } }
      ).exec();
    } else {
      // Buyer read: mark only the buyer
      await ChatMessage.updateMany(
        { requestId, ...sellerFilter },
        { $addToSet: { readBy: userId } }
      ).exec();
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('markChatRead error', err);
    return res.status(500).json({ ok: false, msg: 'Server error' });
  }
}

export async function listChatThreads(req: AuthRequest, res: Response) {
  try {
    const userIdStr = req.user?.userId;
    const role = req.user?.role;
    const sellerId = req.user?.sellerId;
    
    if (!userIdStr) {
      return res.status(401).json({ ok: false, msg: 'Unauthorized' });
    }

    const userId = new mongoose.Types.ObjectId(userIdStr);
    let filter: any = {};
   
    if (role === 'Seller') {
      // Seller: get all threads where they are the seller
      filter = { seller: userId };
    } else if (role === 'StoreManager' && sellerId) {
      // StoreManager: get all threads where their assigned seller is the seller
      filter = { seller: new mongoose.Types.ObjectId(sellerId) };
    } else if (role === 'SuperAdmin') {
      const requestIdParam = (req.query.requestId as string) || (req.body as any)?.requestId;
      if (!requestIdParam || !mongoose.Types.ObjectId.isValid(String(requestIdParam))) {
        return res.status(400).json({ ok: false, msg: 'requestId is required' });
      }
      filter = { requestId: new mongoose.Types.ObjectId(requestIdParam) };
    } else {
      // Buyer: get all threads where they are the sender
      filter = { sender: userId };
    }

    // Aggregate to get unique threads with latest message and unread count
    const threads = await ChatMessage.aggregate([
      { $match: filter },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: { requestId: '$requestId', seller: '$seller' },
          lastMessage: { $first: '$text' },
          lastImageUrl: { $first: '$imageUrl' },
          lastMessageTime: { $first: '$createdAt' },
          lastSender: { $first: '$sender' },
          messages: { $push: '$$ROOT' }
        }
      },
      {
        $lookup: {
          from: 'partsrequests',
          localField: '_id.requestId',
          foreignField: '_id',
          as: 'request'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id.seller',
          foreignField: '_id',
          as: 'sellerInfo'
        }
      },
      {
        $lookup: {
          from: 'stores',
          localField: '_id.seller',
          foreignField: 'user',
          as: 'storeInfo'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'request.user',
          foreignField: '_id',
          as: 'buyerInfo'
        }
      },
      {
        $addFields: {
          unreadCount: {
            $size: {
              $filter: {
                input: '$messages',
                as: 'msg',
                cond: {
                  $and: [
                    { $ne: ['$$msg.sender', userId] },
                    { $not: { $in: [userId, { $ifNull: ['$$msg.readBy', []] }] } }
                  ]
                }
              }
            }
          }
        }
      },
      {
        $project: {
          requestId: '$_id.requestId',
          sellerId: '$_id.seller',
          lastMessage: 1,
          lastImageUrl: 1,
          lastMessageTime: 1,
          lastSender: 1,
          unreadCount: 1,
          requestName: { $arrayElemAt: ['$request.partName', 0] },
          requestNumber: { $arrayElemAt: ['$request.requestNumber', 0] },
          carName: { $arrayElemAt: ['$request.carName', 0] },
          companyName: { $arrayElemAt: ['$request.companyName', 0] },
          requestStatus: { $arrayElemAt: ['$request.status', 0] },
          requestImages: { $arrayElemAt: ['$request.images', 0] },
          sellerName: { $arrayElemAt: ['$sellerInfo.name', 0] },
          storeName: {
            $ifNull: [
              { $arrayElemAt: ['$storeInfo.storeName', 0] },
              { $arrayElemAt: ['$sellerInfo.storeName', 0] },
              { $arrayElemAt: ['$sellerInfo.businessName', 0] },
            ]
          },
          storeImage: {
            $ifNull: [
              { $arrayElemAt: ['$storeInfo.storeProfileImage', 0] },
              { $arrayElemAt: ['$sellerInfo.storeProfileImage', 0] },
              { $arrayElemAt: ['$sellerInfo.profileImage', 0] },
            ]
          },
          buyerName: { $arrayElemAt: ['$buyerInfo.name', 0] }
        }
      },
      {
        $sort: { lastMessageTime: -1 }
      }
    ]);

    const normalizedThreads = threads.map(thread => ({
      ...thread,
      requestId: thread.requestId?.toString ? thread.requestId.toString() : thread.requestId,
      sellerId: thread.sellerId?.toString ? thread.sellerId.toString() : thread.sellerId,
    }));

    return res.json({ ok: true, threads: normalizedThreads });
  } catch (err) {
    console.error('listChatThreads error', err);
    return res.status(500).json({ ok: false, msg: 'Server error' });
  }
}
