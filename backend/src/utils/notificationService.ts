import Notification from '../models/Notification'
import mongoose from 'mongoose'

/**
 * Create a notification for a user
 * @param userId - The user ID to send notification to
 * @param title - Notification title
 * @param description - Notification description (optional)
 * @param type - Type of notification: 'message' | 'order' | 'promo' | 'system'
 * @param metadata - Additional metadata (optional)
 */
export async function createNotification(
  userId: string | mongoose.Types.ObjectId,
  title: string,
  description?: string,
  type: 'message' | 'order' | 'promo' | 'system' | 'request' = 'system',
  metadata?: Record<string, any>
): Promise<any> {
  try {
    if (!mongoose.Types.ObjectId.isValid(String(userId))) {
      console.error('Invalid userId for notification:', userId)
      return null
    }

    const notification = await Notification.create({
      user: new mongoose.Types.ObjectId(String(userId)),
      title,
      description,
      type,
      metadata,
      isRead: false
    })


    return notification
  } catch (err) {
    console.error('Error creating notification:', err)
    return null
  }
}
