import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode, useRef } from 'react'
import { Image as RNImage } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { AuthUser } from '@/utils/api/auth'
import { API_BASE_URL } from '@/utils/api/client'
import { resetMyPushTokens } from '@/utils/api/notifications'

type AuthContextType = {
  user: AuthUser | null
  token: string | null
  isLoggedIn: boolean
  isHydrating: boolean
  setAuth: (payload: { user: AuthUser; token: string; remember?: boolean }) => Promise<void>
  updateUserProfile: (user: AuthUser) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'

type AuthProviderProps = {
  children: ReactNode
}

async function saveSecure(key: string, value: string) {
  try {
    await SecureStore.setItemAsync(key, value)
  } catch (err) {
    console.warn('SecureStore setItem failed', err)
  }
}

async function deleteSecure(key: string) {
  try {
    await SecureStore.deleteItemAsync(key)
  } catch (err) {
    console.warn('SecureStore deleteItem failed', err)
  }
}

const apiBase = API_BASE_URL.replace(/\/api$/, '')
const normalizeUser = (u: AuthUser): AuthUser => {
  if (!u?.profileImage) return u
  const img = u.profileImage
  const isAbsolute = img.startsWith('http') || img.startsWith('data:') || img.startsWith('file:')
  return { ...u, profileImage: isAbsolute ? img : `${apiBase}${img}` }
}

const prefetchImage = (uri?: string) => {
  if (uri && uri.startsWith('http')) {
    RNImage.prefetch(uri).catch(() => {
      // ignore cache errors
    })
  }
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isHydrating, setIsHydrating] = useState(true)
  const refreshedProfileRef = useRef<string | null>(null)

  useEffect(() => {
    const hydrate = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY)
        const storedUser = await SecureStore.getItemAsync(USER_KEY)
        if (storedToken && storedUser) {
          setToken(storedToken)
          const normalized = normalizeUser(JSON.parse(storedUser))
          prefetchImage(normalized.profileImage)
          setUser(normalized)
        }
      } catch (err) {
        console.warn('Failed to hydrate auth state', err)
      } finally {
        setIsHydrating(false)
      }
    }
    hydrate()
  }, [])

  const setAuth = useCallback(
    async ({ user: nextUser, token: nextToken }: { user: AuthUser; token: string; remember?: boolean }) => {
      const normalized = normalizeUser(nextUser)
      prefetchImage(normalized.profileImage)
      setUser(normalized)
      setToken(nextToken)
      refreshedProfileRef.current = null
      // Persist session by default so users stay signed in across reloads
      await Promise.all([saveSecure(TOKEN_KEY, nextToken), saveSecure(USER_KEY, JSON.stringify(normalized))])
    },
    []
  )

  const updateUserProfile = useCallback(
    async (nextUser: AuthUser) => {
      const normalized = normalizeUser(nextUser)
      prefetchImage(normalized.profileImage)
      setUser(normalized)
      const storedToken = await SecureStore.getItemAsync(TOKEN_KEY)
      if (storedToken) {
        await saveSecure(USER_KEY, JSON.stringify(normalized))
      }
    },
    []
  )

  const logout = useCallback(async () => {
    const currentToken = token
    setUser(null)
    setToken(null)
    refreshedProfileRef.current = null
    if (currentToken) {
      try {
        await resetMyPushTokens(currentToken)
      } catch {
        // ignore cleanup failures
      }
    }
    await Promise.all([deleteSecure(TOKEN_KEY), deleteSecure(USER_KEY)])
  }, [token])

  useEffect(() => {
    const refreshProfile = async () => {
      if (!token || !user?.id) return
      const key = `${user.id}-${token}`
      if (refreshedProfileRef.current === key) return
      try {
        const res = await fetch(`${API_BASE_URL}/user/${user.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        const u = (data as any)?.user || data
        if (u) {
          const isStoreManager = (user.role || '').toLowerCase() === 'storemanager'
          const fetchedId = String(u.id || u._id || user.id)
          const sellerId =
            (u as any)?.sellerId ||
            (u as any)?.assignedSeller ||
            (data as any)?.assignedSellerId ||
            (user as any)?.sellerId

          const normalized = normalizeUser({
            ...user,
            ...u,
            id: isStoreManager ? user.id : fetchedId,
            role: isStoreManager ? user.role : u.role || user.role,
            name: u.name || user.name,
            lastName: u.lastName ?? user?.lastName,
            email: u.email || user.email,
            isEmailVerified: u.isEmailVerified ?? user.isEmailVerified,
            phoneNumber: u.phoneNumber ?? user.phoneNumber,
            profileImage: u.profileImage ?? user.profileImage,
            nickname: u.nickname ?? user.nickname,
            occupation: u.occupation ?? user.occupation,
            dateOfBirth: u.dateOfBirth ?? user.dateOfBirth,
            sellerId,
            sellerMakes: Array.isArray(u.sellerMakes) ? u.sellerMakes : user.sellerMakes,
            sellerCategories: Array.isArray(u.sellerCategories) ? u.sellerCategories : user.sellerCategories,
            interests: Array.isArray((u as any)?.interests) ? (u as any).interests : user.interests,
          })
          setUser(normalized)
          prefetchImage(normalized.profileImage)
          await saveSecure(USER_KEY, JSON.stringify(normalized))
        }
      } catch {
        // ignore refresh errors
      } finally {
        refreshedProfileRef.current = key
      }
    }
    refreshProfile()
  }, [token, user?.id])

  const value = useMemo(
    () => ({
      user,
      token,
      isLoggedIn: !!token,
      isHydrating,
      setAuth,
      updateUserProfile,
      logout
    }),
    [user, token, isHydrating, setAuth, updateUserProfile, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
