import { apiRequest } from './client';

export type Store = {
  _id?: string;
  storeName?: string;
  storeProfileImage?: string;
  storeCoverImage?: string;
  storeBio?: string;
  storeBanners?: string[];
  storeSalesBanners?: string[];
  featuredProductIds?: string[];
  saleProductIds?: string[];
  sectionsOrder?: string[];
  sectionsVisibility?: Record<string, boolean>;
  itemsSold?: number;
  reviewsCount?: number;
  averageRating?: number;
  addresses?: {
    street?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    country?: string;
  }[];
};

export function fetchMyStore(token: string) {
  return apiRequest<{ store: Store }>('/store/me', { token });
}

export function updateMyStore(payload: Partial<Store>, token: string) {
  return apiRequest<{ store: Store }>('/store/me', { method: 'PUT', body: payload, token });
}

export function fetchStoreById(id: string) {
  return apiRequest<{ store: Store }>(`/store/${id}`);
}

export function fetchStoreBySellerId(sellerId: string, token?: string) {
  return apiRequest<{ store: Store }>(`/store/by-seller/${sellerId}`, token ? { token } : undefined);
}

export type StoreManager = {
  id: string;
  name: string;
  email: string;
  role?: string;
  profileImage?: string;
};

export function listStoreManagers(token: string) {
  return apiRequest<{ managers: StoreManager[] }>('/store/me/managers', { token });
}

export function addStoreManager(payload: { name: string; email: string; password: string; profileImage?: string }, token: string) {
  return apiRequest<{ manager: StoreManager }>('/store/me/managers', { method: 'POST', body: payload, token });
}

export function updateStoreManager(id: string, payload: { name?: string; email?: string; password?: string; profileImage?: string }, token: string) {
  return apiRequest<{ manager: StoreManager }>(`/store/me/managers/${id}`, { method: 'PUT', body: payload, token });
}

export function removeStoreManager(id: string, token: string) {
  return apiRequest<{ msg: string }>(`/store/me/managers/${id}`, { method: 'DELETE', token });
}
