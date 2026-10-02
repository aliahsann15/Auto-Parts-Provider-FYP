import { API_BASE_URL, apiRequest } from './client';
import { Buffer } from 'buffer';

export type Withdrawal = {
  _id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  processedAt?: string;
  note?: string;
  reference?: string;
};

export type AdminWithdrawal = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  processedAt?: string;
  sellerId?: string;
  sellerName?: string;
  sellerEmail?: string;
  reference?: string;
  note?: string;
};

export type AdminWithdrawalSummary = {
  balance: number;
  totalRevenue: number;
  completedWithdrawals: number;
};

export type AdminWithdrawalResponse = AdminWithdrawalSummary & {
  withdrawals: AdminWithdrawal[];
};

export async function fetchWithdrawalSummary(token: string) {
  return apiRequest<{
    availableBalance: number;
    withdrawableBalance: number;
    threshold: number;
    deductionAmount?: number;
    storeBalance?: number;
    returnDebt?: number;
  }>('/withdrawals/summary', {
    method: 'GET',
    token,
  });
}

export async function fetchWithdrawals(token: string) {
  return apiRequest<{ history: Withdrawal[] }>('/withdrawals', {
    method: 'GET',
    token,
  });
}

export async function requestWithdrawal(token: string, amount: number, currency = 'PKR') {
  return apiRequest('/withdrawals', {
    method: 'POST',
    token,
    body: { amount, currency },
  });
}

export async function fetchAdminWithdrawals(token: string) {
  return apiRequest<AdminWithdrawalResponse>('/admin/withdrawals', {
    method: 'GET',
    token,
  });
}

export async function markWithdrawalCredited(token: string, id: string) {
  return apiRequest<{ withdrawal: Withdrawal; summary: AdminWithdrawalSummary }>(
    `/admin/withdrawals/${encodeURIComponent(id)}/credit`,
    {
      method: 'POST',
      token,
    }
  );
}

export async function downloadWithdrawalReceipt(token: string, id: string, admin = false) {
  const path = admin ? `/admin/withdrawals/${encodeURIComponent(id)}/receipt` : `/withdrawals/${encodeURIComponent(id)}/receipt`;
  const headers: Record<string, string> = {}
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'GET',
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Failed to download receipt');
  }

  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}
