import { apiRequest, API_BASE_URL } from './client';

export type ChatMessage = {
  _id: string;
  requestId: string;
  sender: string;
  text?: string;
  imageUrl?: string;
  createdAt?: string;
};

export type ChatThread = {
  requestId: string;
  sellerId: string;
  sellerName?: string;
  requesterName?: string;
  requestNumber?: string;
  requestName?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  carName?: string;
  companyName?: string;
  storeName?: string;
  storeImage?: string;
};

export function fetchChatMessages(requestId: string, token: string, sellerId?: string) {
  const qs = sellerId ? `?sellerId=${encodeURIComponent(sellerId)}` : '';
  return apiRequest<{ ok: boolean; items: ChatMessage[] }>(`/chats/${requestId}${qs}`, {
    token,
  });
}

export async function sendChatMessage(
  requestId: string,
  payload: { text?: string; imageUrl?: string; sellerId?: string },
  token: string
) {
  // Custom fetch to surface moderation "reason" to the UI
  const res = await fetch(`${API_BASE_URL}/chats/${requestId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { msg: text };
  }

  if (!res.ok) {
    const err: any = new Error(data?.msg || data?.message || 'Failed to send message');
    if (data?.reason) err.reason = data.reason;
    throw err;
  }

  return data as { ok: boolean; item: ChatMessage };
}

export function markChatRead(requestId: string, token: string, sellerId?: string) {
  const qs = sellerId ? `?sellerId=${encodeURIComponent(sellerId)}` : '';
  return apiRequest<{ ok: boolean }>(`/chats/${requestId}/read${qs}`, {
    method: 'POST',
    token,
    body: sellerId ? { sellerId } : undefined,
  });
}

export function fetchChatThreads(token: string, requestId?: string) {
  const qs = requestId ? `?requestId=${encodeURIComponent(requestId)}` : '';
  return apiRequest<{ ok: boolean; threads: ChatThread[] }>(`/chats/threads${qs}`, {
    token,
  });
}
