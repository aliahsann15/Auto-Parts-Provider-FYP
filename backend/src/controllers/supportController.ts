import { Response } from 'express'
import mongoose from 'mongoose'
import SupportMessage, { SupportSender, SupportRole } from '../models/SupportMessage'
import User from '../models/User'
import { AuthRequest } from '../middleware/authMiddleware'
import { createNotification } from '../utils/notificationService'
import { sendPushToUserTokens } from '../utils/pushService'

const ensureSuperAdmin = (req: AuthRequest, res: Response) => {
  const role = (req.user?.role || '').toLowerCase()
  if (role !== 'superadmin') {
    res.status(403).json({ msg: 'Forbidden' })
    return false
  }
  return true
}

export const listSupportThreads = async (req: AuthRequest, res: Response) => {
  if (!ensureSuperAdmin(req, res)) return
  const roleParam = (req.query.role as string | undefined) || 'buyer'
  const matchRole: SupportRole = roleParam.toLowerCase() === 'seller' ? 'Seller' : 'Buyer'
  const threads = await SupportMessage.aggregate([
    { $match: { role: matchRole } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$userId',
        lastMessage: { $first: '$text' },
        lastMessageAt: { $first: '$createdAt' },
        lastRole: { $first: '$role' },
        unreadCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $in: ['$senderRole', ['Buyer', 'Seller']] },
                  { $eq: [{ $ifNull: ['$seenByAdmin', false] }, false] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $addFields: {
        user: { $arrayElemAt: ['$user', 0] },
      },
    },
    {
      $lookup: {
        from: 'stores',
        localField: '_id',
        foreignField: 'user',
        as: 'store',
      },
    },
    {
      $addFields: {
        storeInfo: { $arrayElemAt: ['$store', 0] },
      },
    },
    {
      $project: {
        userId: '$_id',
        lastMessage: 1,
        lastMessageAt: 1,
        userName: {
          $ifNull: ['$user.businessName', '$user.storeName', '$user.name', '$user.email', 'Unknown User'],
        },
        userImage: {
          $switch: {
            branches: [
              {
                case: { $eq: ['$lastRole', 'Seller'] },
                then: {
                  $ifNull: [
                    '$storeInfo.storeProfileImage',
                    '$storeInfo.storeCoverImage',
                    '$user.profileImage',
                    '$user.storeProfileImage',
                    '$user.storeCoverImage',
                  ],
                },
              },
            ],
            default: {
              $ifNull: [
                '$user.profileImage',
                '$user.storeProfileImage',
                '$user.storeCoverImage',
              ],
            },
          },
        },
        userEmail: '$user.email',
        role: '$lastRole',
        unreadCount: 1,
      },
    },
    { $sort: { lastMessageAt: -1 } },
  ])
  res.json({ ok: true, threads })
}

export const listSupportMessages = async (req: AuthRequest, res: Response) => {
  const userIdParam = (req.query.userId as string | undefined) || req.user?.userId
  if (!userIdParam || !mongoose.Types.ObjectId.isValid(userIdParam)) {
    res.status(400).json({ ok: false, msg: 'Invalid userId' })
    return
  }
  const userId = new mongoose.Types.ObjectId(userIdParam)
  const messages = await SupportMessage.find({ userId }).sort({ createdAt: 1 }).lean()
  const isSuperAdmin = (req.user?.role || '').toLowerCase() === 'superadmin'
  if (isSuperAdmin) {
    await SupportMessage.updateMany(
      {
        userId,
        senderRole: { $in: ['Buyer', 'Seller'] },
        seenByAdmin: { $ne: true },
      },
      { $set: { seenByAdmin: true } }
    )
  }
  res.json({ ok: true, items: messages })
  return
}

export const postSupportMessage = async (req: AuthRequest, res: Response) => {
  const { text, userId: targetUserId } = req.body as { text?: string; userId?: string }
  const trimmedText = text?.trim() || ''
  if (!trimmedText) {
    res.status(400).json({ ok: false, msg: 'Text is required' })
    return
  }
  let userId: string | undefined = targetUserId
  let role: SupportRole = 'Buyer'
  let senderRole: SupportSender = 'Buyer'

  const currentRole = (req.user?.role || '').toLowerCase()
  if (currentRole === 'superadmin') {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({ ok: false, msg: 'userId is required for admin messages' })
      return
    }
    senderRole = 'SuperAdmin'
    const targetUser = await User.findById(userId).select('role')
    if (targetUser && targetUser.role?.toLowerCase() === 'seller') {
      role = 'Seller'
    }
  } else {
    if (!req.user?.userId || !mongoose.Types.ObjectId.isValid(req.user.userId)) {
      res.status(401).json({ ok: false, msg: 'Unauthorized' })
      return
    }
    userId = req.user.userId
    senderRole = currentRole === 'seller' ? 'Seller' : 'Buyer'
    role = senderRole === 'Seller' ? 'Seller' : 'Buyer'
  }

  const created = await SupportMessage.create({
    userId: new mongoose.Types.ObjectId(userId),
    role,
    senderRole,
    text: trimmedText,
    seenByAdmin: senderRole === 'SuperAdmin',
  })

  const threadUserId = String(userId)
  const route = `/supportchat?userId=${encodeURIComponent(threadUserId)}&role=${encodeURIComponent(role)}`
  const metadataBase = {
    route,
    role,
    senderRole,
    threadUserId,
  }

  const notifyUser = async (
    recipientId: mongoose.Types.ObjectId | string,
    title: string,
    body: string,
    metadata: Record<string, any>
  ) => {
    const finalMetadata = { ...metadataBase, ...metadata }
    await createNotification(recipientId, title, body, 'message', finalMetadata)
    await sendPushToUserTokens(String(recipientId), {
      title,
      body,
      data: finalMetadata,
    })
  }

  try {
    if (senderRole === 'SuperAdmin') {
      const recipientUser = await User.findById(userId).select('name storeName businessName email role').lean()
      const recipientName =
        recipientUser?.businessName || recipientUser?.storeName || recipientUser?.name || recipientUser?.email || 'Customer'
      const title = 'Message from Support'
      const body = trimmedText
      await notifyUser(userId, title, body, {
        recipientName,
        recipientRole: recipientUser?.role,
        source: 'support',
      })
    } else {
      const superAdmins = await User.find({ role: 'SuperAdmin' }).select('_id name email').lean()
      if (superAdmins.length) {
        const senderUser = await User.findById(req.user?.userId).select('name storeName businessName').lean()
        const senderName =
          senderUser?.businessName || senderUser?.storeName || senderUser?.name || 'A user'
        const title = `${senderName} sent a support message`
        const body = `${senderRole}: ${trimmedText}`
        await Promise.all(
          superAdmins.map(admin =>
            notifyUser(admin._id, title, body, {
              senderName,
              senderRole,
              senderUserId: threadUserId,
              source: 'support',
            })
          )
        )
      }
    }
  } catch (notifyErr) {
    console.error('support notification error', notifyErr)
  }
  res.status(201).json({ ok: true, item: created })
  return
}
