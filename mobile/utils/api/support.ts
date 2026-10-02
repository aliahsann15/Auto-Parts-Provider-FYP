import { apiRequest } from './client'

export type SupportThread = {
  userId: string
  userName: string
  userEmail?: string
  userImage?: string
  lastMessage: string
  lastMessageAt: string
  unreadCount?: number
}

export type SupportMessage = {
  _id: string
  text: string
  senderRole: 'Buyer' | 'Seller' | 'SuperAdmin'
  createdAt: string
}

export async function fetchSupportThreads(token: string, role: 'Buyer' | 'Seller') {
  const res = await apiRequest<{ ok: boolean; threads: SupportThread[] }>(`/support/threads?role=${role}`, {
    token,
  })
  return res.threads || []
}

export async function fetchSupportMessages(token: string, userId?: string) {
  const query = userId ? `?userId=${encodeURIComponent(userId)}` : ''
  const res = await apiRequest<{ ok: boolean; items: SupportMessage[] }>(`/support/messages${query}`, {
    token,
  })
  return res.items || []
}

export async function postSupportMessage(token: string, text: string, targetUserId?: string) {
  return apiRequest<{ ok: boolean; item: SupportMessage }>('/support/messages', {
    method: 'POST',
    token,
    body: { text, ...(targetUserId ? { userId: targetUserId } : {}) },
  })
}
