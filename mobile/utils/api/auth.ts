import { apiRequest } from './client'

export type AuthUser = {
  id: string
  name: string
  lastName?: string
  email: string
  role: string
  isEmailVerified: boolean
  phoneNumber?: string
  profileImage?: string
  nickname?: string
  occupation?: string
  dateOfBirth?: string
  sellerId?: string
  sellerMakes?: string[]
  sellerCategories?: string[]
  interests?: string[]
}

export type AuthResponse = {
  token: string
  expiresIn: string
  user: AuthUser
  newUser?: boolean
}

export function login(payload: { email: string; password: string; rememberMe?: boolean }) {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: {
      ...payload,
      identifier: payload.email
    }
  })
}

export function register(payload: {
  name?: string
  email: string
  password: string
  role?: string
  cnic?: string
  businessName?: string
  businessType?: string
  licenseNumber?: string
  cnicImages?: any
  businessStreet?: string
  businessProvince?: string
  businessCity?: string
  businessPostalCode?: string
  businessCountry?: string
  phoneNumber?: string
  sellerMakes?: string[]
  sellerCategories?: string[]
  rememberMe?: boolean
}) {
  return apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: payload
  })
}

export function googleAuth(payload: { idToken: string; rememberMe?: boolean }) {
  return apiRequest<AuthResponse>('/auth/google', {
    method: 'POST',
    body: payload
  })
}

export function facebookAuth(payload: { accessToken: string; rememberMe?: boolean }) {
  return apiRequest<AuthResponse>('/auth/facebook', {
    method: 'POST',
    body: payload
  })
}

export function checkEmail(payload: { email: string }) {
  const query = encodeURIComponent(payload.email)
  return apiRequest<{ exists: boolean }>(`/auth/check-email?email=${query}`, {
    method: 'GET'
  })
}

export function verifyEmail(payload: { email: string; code: string }) {
  return apiRequest<{ token: string }>('/auth/verify-email', {
    method: 'POST',
    body: payload
  })
}

export function appleAuth(payload: { identityToken: string; email?: string; name?: string; rememberMe?: boolean }) {
  return apiRequest<AuthResponse>('/auth/apple', {
    method: 'POST',
    body: payload
  })
}

export function requestPasswordReset(payload: { email?: string; phoneNumber?: string }) {
  return apiRequest<{
    msg: string
    expiresAt: string
    emailPreviewUrl?: string
  }>('/auth/password/forgot', {
    method: 'POST',
    body: payload
  })
}

export function verifyResetCode(payload: { email?: string; phoneNumber?: string; code: string }) {
  return apiRequest<{ ok: boolean; resetToken: string; expiresAt: string }>('/auth/password/verify', {
    method: 'POST',
    body: payload
  })
}

export function resetPassword(payload: { token?: string; code?: string; password: string }) {
  return apiRequest<{ msg: string }>('/auth/password/reset', {
    method: 'POST',
    body: payload
  })
}
