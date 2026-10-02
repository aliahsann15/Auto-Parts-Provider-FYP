import { apiRequest, API_BASE_URL } from './client';
import { AuthUser } from './auth';

export type UpdateUserPayload = Partial<{
  name: string;
  nickname: string;
  email: string;
  phoneNumber: string;
  occupation: string;
  dateOfBirth: string | null;
  profileImage: string | null;
  interests: string[];
  sellerMakes: string[];
  sellerCategories: string[];
}>;

type UserResponse = {
  success?: boolean;
  user?: any;
};

export type StorePayload = Partial<{
  storeName: string;
  storeProfileImage: string | null;
  storeCoverImage: string | null;
  storeBio: string;
  storeBanners: string[];
  storeSalesBanners: string[];
  featuredProductIds: string[];
  saleProductIds: string[];
  sectionsOrder: string[];
  sectionsVisibility: Record<string, boolean>;
}>;

const normalizeUser = (raw: any): AuthUser => {
  if (!raw) {
    throw new Error('User not found');
  }
  const id = String(raw.id || raw._id || '');
  return {
    id,
    name: raw.name || '',
    lastName: raw.lastName || '',
    email: raw.email || '',
    role: raw.role || 'Buyer',
    isEmailVerified: !!raw.isEmailVerified,
    phoneNumber: raw.phoneNumber,
    profileImage: raw.profileImage,
    nickname: raw.nickname,
    occupation: raw.occupation,
    dateOfBirth: raw.dateOfBirth,
    sellerId: raw.sellerId || raw.assignedSeller || raw.assignedSellerId,
    sellerMakes: Array.isArray(raw.sellerMakes) ? raw.sellerMakes : [],
    sellerCategories: Array.isArray(raw.sellerCategories) ? raw.sellerCategories : [],
  };
};

export async function fetchUserProfile(id: string, token: string) {
  const res = await apiRequest<UserResponse>(`/user/${id}`, { token });
  const u = (res as any).user || res;
  return normalizeUser(u);
}

export async function fetchUserRaw(id: string, token: string) {
  const res = await apiRequest<UserResponse>(`/user/${id}`, { token });
  return (res as any).user || res;
}

export async function updateUserProfile(id: string, payload: UpdateUserPayload, token: string) {
  const res = await apiRequest<UserResponse>(`/user/${id}`, { method: 'PUT', body: payload, token });
  const u = (res as any).user || res;
  return normalizeUser(u);
}

export async function updateStoreProfile(id: string, payload: StorePayload, token: string) {
  const res = await apiRequest<UserResponse>(`/user/${id}`, { method: 'PUT', body: payload, token });
  return (res as any).user || res;
}

export async function uploadProfileImage(uri: string, token: string, folderName?: string): Promise<string> {
  const filename = uri.split('/').pop() || 'upload.jpg';
  const extMatch = /\.(\w+)$/.exec(filename);
  const type = extMatch ? `image/${extMatch[1].toLowerCase()}` : 'image/jpeg';

  const form = new FormData();
  form.append('image', {
    uri,
    name: filename,
    type,
  } as any);
  if (folderName) {
    form.append('folderName', folderName);
  }

  const res = await fetch(`${API_BASE_URL}/upload/image`, {
    method: 'POST',
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
    },
    body: form,
  });
  const data = await res.json();
  if (!res.ok || !data?.url) {
    const msg = data?.message || data?.msg || 'Upload failed';
    throw new Error(msg);
  }
  const rawUrl = data.url as string;
  if (!rawUrl) {
    throw new Error('Upload did not return a valid url');
  }
  return rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
}

export type BankAccount = {
  _id: string;
  id?: string;
  bankName: string;
  accountTitle?: string;
  bankCode?: string;
  branchCode?: string;
  last4?: string;
  isIban?: boolean;
  isDefault?: boolean;
};

export async function fetchBankAccounts(userId: string, token: string) {
  const res = await apiRequest<{ accounts: BankAccount[] }>(`/user/${userId}/bank-accounts`, { token });
  return res.accounts || [];
}

export async function addBankAccount(
  userId: string,
  payload: { bankName: string; bankCode?: string; accountNumber: string; branchCode?: string; isDefault: boolean; accountTitle?: string },
  token: string
) {
  const res = await apiRequest<{ account: BankAccount; accounts: BankAccount[] }>(`/user/${userId}/bank-accounts`, {
    method: 'POST',
    token,
    body: payload,
  });
  return res;
}

export async function deleteBankAccount(userId: string, accountId: string, token: string) {
  const res = await apiRequest<{ accounts: BankAccount[] }>(`/user/${userId}/bank-accounts/${accountId}`, {
    method: 'DELETE',
    token,
  });
  return res.accounts || [];
}
