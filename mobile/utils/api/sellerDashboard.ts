import { apiRequest } from './client';

export type SellerStats = {
  totalOrders: number;
  pendingOrders: number;
  earnings: number;
  products: number;
};

export type SellerOrderInsights = {
  summary: { completed: number; pending: number; cancelled: number };
  points: { date: string; completed: number; pending: number; cancelled: number }[];
};

export type SellerProfitInsights = {
  summary: { revenue: number; shipping: number; profit: number };
  points: { date: string; revenue: number; shipping: number; profit: number }[];
};

export function fetchSellerStats(token: string) {
  return apiRequest<SellerStats>('/orders/seller-stats', { token });
}

export function fetchSellerOrderInsights(token: string, days = 30) {
  return apiRequest<SellerOrderInsights>(`/orders/seller-order-insights?days=${days}`, { token });
}

export function fetchSellerProfitInsights(token: string, days = 30) {
  return apiRequest<SellerProfitInsights>(`/orders/seller-profit?days=${days}`, { token });
}
