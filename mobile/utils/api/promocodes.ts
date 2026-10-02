import { apiRequest, API_BASE_URL } from './client';

export type PromoScope = 'all' | 'product' | 'category';
export type PromoType = 'percentage' | 'amount';

export type PromoCode = {
  _id: string;
  code: string;
  scope: PromoScope;
  type: PromoType;
  value: number;
  products?: string[];
  categories?: string[];
  active?: boolean;
  createdAt: string;
};

export async function fetchPromoCodes(token: string) {
  return apiRequest<{ promos: PromoCode[] }>('/promocodes', { token });
}

export async function createPromoCode(payload: Partial<PromoCode>, token: string) {
  return apiRequest<{ promo: PromoCode }>('/promocodes', { method: 'POST', body: payload, token });
}

export async function updatePromoCode(id: string, payload: Partial<PromoCode>, token: string) {
  return apiRequest<{ promo: PromoCode }>(`/promocodes/${id}`, { method: 'PUT', body: payload, token });
}

export async function deletePromoCode(id: string, token: string) {
  return apiRequest<{ msg: string }>(`/promocodes/${id}`, { method: 'DELETE', token });
}

export async function applyPromoCode(code: string, items: { productId: string; quantity?: number }[]) {
  const res = await fetch(`${API_BASE_URL}/promocodes/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, items }),
  });
  const data = await res.json();
 
  if (!res.ok) throw new Error(data?.msg || 'Failed to apply promo code');
  return data as { valid: boolean; discount: number; promo: PromoCode & { seller: string }; applicableTotal: number };
}
