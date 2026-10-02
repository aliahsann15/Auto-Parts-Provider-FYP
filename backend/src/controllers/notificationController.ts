import { RequestHandler, Response } from 'express'
import mongoose from 'mongoose'
import Notification, { INotification } from '../models/Notification'
import { savePushToken, sendPushToUserTokens } from '../utils/pushService'
import PushToken from '../models/PushToken'

// GET /api/notifications
export const getNotifications: RequestHandler = async (req: any, res: Response): Promise<void> => {
  const userId = req.user?.userId
  if (!userId) {
    res.status(401).json({ ok: false, msg: 'Authentication required' })
    return
  }

  const limit = Math.min(100, Number(req.query.limit) || 50)
  const notifications = await Notification.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()
    .exec()

  res.json({ ok: true, items: notifications })
}

// POST /api/notifications
export const createNotification: RequestHandler = async (req: any, res): Promise<void> => {
  const { userId, title, description, type, metadata } = req.body as Partial<INotification> & { userId?: string }
  const targetUser = userId || req.user?.userId

  if (!targetUser) {
    res.status(400).json({ ok: false, msg: 'userId is required' })
    return
  }
  if (!title) {
    res.status(400).json({ ok: false, msg: 'title is required' })
    return
  }
  if (!mongoose.Types.ObjectId.isValid(String(targetUser))) {
    res.status(400).json({ ok: false, msg: 'Invalid userId' })
    return
  }

  const doc = await Notification.create({
    user: new mongoose.Types.ObjectId(String(targetUser)),
    title,
    description,
    type: (type as any) || 'system',
    metadata
  })

  res.status(201).json({ ok: true, item: doc })
}

// PATCH /api/notifications/:id/read
export const markNotificationRead: RequestHandler = async (req: any, res: Response): Promise<void> => {
  const userId = req.user?.userId
  if (!userId) {
    res.status(401).json({ ok: false, msg: 'Authentication required' })
    return
  }

  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ ok: false, msg: 'Invalid id' })
    return
  }

  const updated = await Notification.findOneAndUpdate(
    { _id: id, user: userId },
    { $set: { isRead: true } },
    { new: true }
  ).lean()

  if (!updated) {
    res.status(404).json({ ok: false, msg: 'Notification not found' })
    return
  }
  res.json({ ok: true, item: updated })
}

// POST /api/notifications/mark-all-read
export const markAllRead: RequestHandler = async (req: any, res: Response): Promise<void> => {
  const userId = req.user?.userId
  if (!userId) {
    res.status(401).json({ ok: false, msg: 'Authentication required' })
    return
  }

  await Notification.updateMany({ user: userId, isRead: false }, { $set: { isRead: true } }).exec()
  res.json({ ok: true })
}

// GET /api/notifications/count
export const getNotificationCount: RequestHandler = async (req: any, res: Response): Promise<void> => {
  const userId = req.user?.userId
  if (!userId) {
    res.status(401).json({ ok: false, msg: 'Authentication required' })
    return
  }

  const unreadCount = await Notification.countDocuments({ user: userId, isRead: false }).exec()
  const totalCount = await Notification.countDocuments({ user: userId }).exec()

  res.json({ ok: true, unreadCount, totalCount })
}

// POST /api/notifications/register-token
export const registerPushToken: RequestHandler = async (req: any, res: Response): Promise<void> => {
  const userId = req.user?.userId
  if (!userId) {
    res.status(401).json({ ok: false, msg: 'Authentication required' })
    return
  }

  const { token, provider = 'expo', platform, deviceId } = req.body as {
    token?: string
    provider?: 'expo' | 'fcm'
    platform?: 'ios' | 'android' | 'web' | 'unknown'
    deviceId?: string
  }

  if (!token) {
    res.status(400).json({ ok: false, msg: 'token is required' })
    return
  }
  if (provider !== 'expo' && provider !== 'fcm') {
    res.status(400).json({ ok: false, msg: 'provider must be expo or fcm' })
    return
  }

  const saved = await savePushToken({
    userId: String(userId),
    token: token.trim(),
    provider,
    platform: platform || 'unknown',
    deviceId
  })

  res.json({ ok: true, token: saved })
}

// POST /api/notifications/test-push
export const sendTestPush: RequestHandler = async (req: any, res: Response): Promise<void> => {
  const userId = req.user?.userId
  if (!userId) {
    res.status(401).json({ ok: false, msg: 'Authentication required' })
    return
  }

  const title = (req.body?.title as string) || 'Test notification'
  const body = (req.body?.body as string) || 'This is a test push from the server.'

  const tokens = await PushToken.find({ user: userId }).lean()
  if (!tokens.length) {
    res.status(400).json({ ok: false, msg: 'No push tokens found for this user. Open the app, allow notifications, and try again.' })
    return
  }

  const { sent, skipped } = await sendPushToUserTokens(String(userId), {
    title,
    body,
    data: { type: 'test' }
  })

  res.json({ ok: true, sent, skipped, tokenCount: tokens.length })
}

// GET /api/notifications/tokens (debug helper)
export const listMyPushTokens: RequestHandler = async (req: any, res: Response): Promise<void> => {
  const userId = req.user?.userId
  if (!userId) {
    res.status(401).json({ ok: false, msg: 'Authentication required' })
    return
  }
  const tokens = await PushToken.find({ user: userId }).lean()
  res.json({ ok: true, tokens })
}

// DELETE /api/notifications/tokens (remove all tokens for the logged-in user)
export const resetMyPushTokens: RequestHandler = async (req: any, res: Response): Promise<void> => {
  const userId = req.user?.userId
  if (!userId) {
    res.status(401).json({ ok: false, msg: 'Authentication required' })
    return
  }
  const result = await PushToken.deleteMany({ user: userId })
  res.json({ ok: true, deletedCount: result.deletedCount || 0 })
}
