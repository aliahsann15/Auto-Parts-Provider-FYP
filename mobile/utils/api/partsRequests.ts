import { apiRequest } from './client';

export type PartsRequest = {
  _id: string;
  userId?: any;
  sellerIds?: string[];
  assignedSeller?: string;
  requestNumber?: string;
  companyName: string;
  carName: string;
  partName: string;
  variant?: string;
  year?: string;
  description?: string;
  quantity?: number;
  images?: { path?: string }[];
  status?: string;
  createdAt?: string;
  offerCount?: number;
  interestedCount?: number;
  acceptedOfferPrice?: number;
  acceptedSellerName?: string;
  chatThreadCount?: number;
  chatUnreadCount?: number;
};

export async function fetchPartsRequests(token?: string) {
  return apiRequest<{ ok: boolean; items: PartsRequest[] }>('/parts-requests', {
    method: 'GET',
    ...(token ? { token } : {}),
  });
}

export async function fetchMyPartsRequests(token: string) {
  return apiRequest<{ ok: boolean; items: PartsRequest[] }>('/parts-requests/my', {
    method: 'GET',
    token,
  });
}

export async function fetchSellerPartsRequests(token: string) {
  return apiRequest<{ ok: boolean; items: PartsRequest[] }>('/parts-requests/seller', {
    method: 'GET',
    token,
  });
}

export async function fetchRequestById(id: string, token?: string) {
  return apiRequest<{ ok: boolean; item: PartsRequest }>(`/parts-requests/${id}`, {
    method: 'GET',
    ...(token ? { token } : {}),
  });
}

export async function engagePartsRequest(id: string, token: string) {
  return apiRequest<{ ok: boolean; item: PartsRequest }>(`/parts-requests/${id}/engage`, {
    method: 'POST',
    token,
  });
}

export async function disengagePartsRequest(id: string, token: string) {
  return apiRequest<{ ok: boolean; item: PartsRequest }>(`/parts-requests/${id}/unengage`, {
    method: 'POST',
    token,
  });
}

export async function submitPartRequest(payload: {
  companyName: string;
  carName: string;
  partName: string;
  category?: string;
  variant?: string;
  year?: string;
  description?: string;
  quantity?: number;
  images?: { uri: string; name?: string; type?: string }[];
}, token: string) {
  const form = new FormData();
  form.append('companyName', payload.companyName);
  form.append('carName', payload.carName);
  form.append('partName', payload.partName);
  if (payload.variant) form.append('variant', payload.variant);
  if (payload.year) form.append('year', payload.year);
  if (payload.description) form.append('description', payload.description);
  if (payload.quantity) form.append('quantity', String(payload.quantity));
  if (payload.images && payload.images.length) {
    payload.images.forEach((img, idx) => {
      form.append('images', {
        uri: img.uri,
        name: img.name || `photo-${idx}.jpg`,
        type: img.type || 'image/jpeg',
      } as any);
    });
  }

  return apiRequest<{ ok: boolean; id: string }>('/parts-requests', {
    method: 'POST',
    token,
    body: form as any,
  });
}
