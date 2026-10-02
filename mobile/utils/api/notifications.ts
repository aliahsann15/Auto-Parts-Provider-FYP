import { apiRequest } from './client'

export type NotificationItem = {
  _id?: string
  id?: string
  title: string
  description: string
  createdAt?: string
  iconType?: 'message' | 'order' | 'promo' | 'default'
}

export async function fetchNotifications(token: string) {
  // If the backend doesn't have notifications yet, this will 404; caller should handle errors.
  return apiRequest<{ ok?: boolean; items?: NotificationItem[]; data?: NotificationItem[] }>('/notifications', {
    method: 'GET',
    token,
  })
}

export async function markAllNotificationsRead(token: string) {
  return apiRequest<{ ok: boolean }>('/notifications/mark-all-read', {
    method: 'POST',
    token,
  })
}

export type PushTokenPayload = {
  token: string
  provider: 'expo' | 'fcm'
  platform?: 'ios' | 'android' | 'web' | 'unknown'
  deviceId?: string | null
}

export type UserPushToken = {
  _id?: string
  token: string
  provider: 'expo' | 'fcm'
  platform?: 'ios' | 'android' | 'web' | 'unknown'
  deviceId?: string | null
  createdAt?: string
  updatedAt?: string
  lastUsedAt?: string | null
}

export async function registerPushToken(payload: PushTokenPayload, token: string) {
  return apiRequest<{ ok: boolean; token: any }>('/notifications/register-token', {
    method: 'POST',
    body: payload,
    token
  })
}

export async function listMyPushTokens(token: string) {
  return apiRequest<{ ok: boolean; tokens: UserPushToken[] }>('/notifications/tokens', {
    method: 'GET',
    token
  })
}

export async function sendTestNotification(
  token: string,
  payload?: { title?: string; body?: string }
) {
  return apiRequest<{ ok: boolean; sent: any[]; skipped: string[] }>('/notifications/test-push', {
    method: 'POST',
    body: payload || {},
    token
  })
}

export async function resetMyPushTokens(token: string) {
  return apiRequest<{ ok: boolean; deletedCount: number }>('/notifications/tokens', {
    method: 'DELETE',
    token
  })
}

export async function fetchNotificationCount(token: string) {
  return apiRequest<{ ok: boolean; unreadCount: number; totalCount: number }>('/notifications/count', {
    method: 'GET',
    token
  })
}
