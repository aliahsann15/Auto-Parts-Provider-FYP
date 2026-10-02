"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useSession, signOut } from "next-auth/react"
import { Session } from "next-auth"
import { toast } from "sonner"

type Product = {
  _id?: string
  id?: string
  [key: string]: unknown
}

type WishlistValue = {
  items: Set<string>
  itemsList: Product[]                // <-- added: full item objects returned by backend
  loading: boolean
  isWishlisted: (id: string) => boolean
  toggle: (id: string) => Promise<boolean>
  refresh: () => Promise<void>
}

const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "http://localhost:4001").replace(/\/$/, "")
const WishlistContext = createContext<WishlistValue | null>(null)

export const WishlistProvider: React.FC<React.PropsWithChildren<object>> = ({ children }) => {
  const [items, setItems] = useState<Set<string>>(new Set())
  const [itemsList, setItemsList] = useState<Product[]>([])    // <-- added state
  // const [itemsList, setItemsList] = useState<any[]>([])    // <-- added state
  const [loading, setLoading] = useState<boolean>(true)

  const { data: session, status } = useSession()

  const extractToken = (sess: Session | null): string | null => {
    if (!sess) return null
    // use backendToken if present, otherwise accessToken
    const token = (sess as Session & { backendToken?: string })?.backendToken || sess?.accessToken
    return token ?? null
  }

  // helper: try to fetch products in bulk, fall back to individual fetches
  const fetchProductsByIds = useCallback(
    async (ids: string[], token: string | null) => {
      if (!ids || ids.length === 0) return []
      const tryUrls = [
        // common batch endpoint pattern
        `${API_BASE}/api/products?ids=${ids.map(encodeURIComponent).join(",")}`,
        // alternative name
        `${API_BASE}/api/product/batch?ids=${ids.map(encodeURIComponent).join(",")}`,
      ]

      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (token) headers.Authorization = `Bearer ${token}`

      for (const url of tryUrls) {
        try {
          const res = await fetch(url, { method: "GET", headers })
          if (!res.ok) continue
          const data = await res.json().catch(() => null)
          // expect array in data.products or data.items or data
          const arr = data?.products ?? data?.items ?? data?.data ?? data
          if (Array.isArray(arr)) return arr
        } catch {
          // try next
        }
      }

      // fallback: fetch each product individually
      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            const r = await fetch(`${API_BASE}/api/products/${encodeURIComponent(id)}`, { method: "GET", headers })
            if (!r.ok) return null
            const d = await r.json().catch(() => null)
            return d?.product ?? d
          } catch {
            return null
          }
        })
      )
      return results.filter(Boolean)
    },
    []
  )

  const load = useCallback(
    async (token: string | null) => {
      setLoading(true)
      try {
        if (!token) {
          setItems(new Set())
          setItemsList([])           // clear list when no token
          setLoading(false)
          return
        }

        const res = await fetch(`${API_BASE}/api/wishlist`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (!res.ok) {
          let json: any
          try { json = await res.json() } catch {}
          if (res.status === 401 || json?.msg === "Token expired") {
            toast.error("Session expired — please sign in")
            signOut()
            setItems(new Set())
            setItemsList([])         // clear on error
            setLoading(false)
            return
          }
          setItems(new Set())
          setItemsList([])         // clear on error
          setLoading(false)
          return
        }

        const data = await res.json().catch(() => null)
        // data.items may be array of product objects or ids
        const rawItems = Array.isArray(data?.items) ? data.items : Array.isArray(data?.wishlist) ? data.wishlist : []
        const ids: string[] = rawItems.map((i: { _id?: string; id?: string } | string) => (typeof i === "object" && i !== null ? String(i._id ?? i.id ?? i) : String(i))).filter(Boolean)

        setItems(new Set(ids))

        // if rawItems already contains objects (populated), use them
        const containsObjects = rawItems.length > 0 && rawItems.some((i: { _id?: string; id?: string } | string) => typeof i === "object")
        if (containsObjects) {
          setItemsList(rawItems)
        } else if (ids.length > 0) {
          // fetch product details for ids
          const prods = await fetchProductsByIds(ids, token)
          setItemsList(Array.isArray(prods) ? prods : [])
        } else {
          setItemsList([])
        }
      } catch (err) {
        console.error("Wishlist load failed", err)
        setItems(new Set())
        setItemsList([])
      } finally {
        setLoading(false)
      }
    },
    [fetchProductsByIds]
  )

  useEffect(() => {
    if (status === "authenticated") {
      const token = extractToken(session)
      load(token)
    } else if (status === "unauthenticated") {
      setItems(new Set())
      setItemsList([])
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session])

  const isWishlisted = useCallback((id: string) => items.has(id), [items])

  const toggle = useCallback(
    async (productId: string) => {
      const prev = new Set(items)
      const willAdd = !prev.has(productId)
      const next = new Set(prev)
      if (willAdd) next.add(productId)
      else next.delete(productId)
      // optimistic update
      setItems(next)

      try {
        const token = extractToken(session)
        if (!token) {
          setItems(prev)
          toast.error("Please sign in to manage wishlist")
          throw new Error("No token")
        }

        const res = await fetch(`${API_BASE}/api/wishlist/toggle`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ productId }),
        })

        if (!res.ok) {
          let json: any
          try { json = await res.json() } catch {}
          if (res.status === 401 || json?.msg === "Token expired") {
            toast.error("Session expired — signing out")
            signOut()
            setItems(new Set())
            setItemsList([])         // clear on error
            throw new Error("Token expired")
          }
          // revert optimistic update
          setItems(prev)
          const errMsg = json?.error ?? json?.msg ?? `Wishlist update failed (${res.status})`
          toast.error(errMsg)
          throw new Error(errMsg)
        }

        const data = await res.json().catch(() => null)
        const rawItems = Array.isArray(data?.items) ? data.items : Array.isArray(data?.wishlist) ? data.wishlist : []
        const ids: string[] = rawItems.map((i: { _id?: string; id?: string } | string) => (typeof i === "object" && i !== null ? String(i._id ?? i.id ?? i) : String(i))).filter(Boolean)
        setItems(new Set(ids))

        // sync itemsList: if backend returned populated objects use them,
        // otherwise fetch product details for returned ids
        const containsObjects = rawItems.length > 0 && rawItems.some((i: { _id?: string; id?: string } | string) => typeof i === "object")
        if (containsObjects) {
          setItemsList(rawItems)
        } else if (ids.length > 0) {
          const prods = await fetchProductsByIds(ids, token)
          setItemsList(Array.isArray(prods) ? prods : [])
        } else {
          setItemsList([])
        }

        toast.success(willAdd ? "Added to wishlist" : "Removed from wishlist")
        return willAdd
      } catch (err) {
        setItems(prev)
        throw err
      }
    },
    [items, session, fetchProductsByIds]
  )

  const refresh = useCallback(async () => {
    const token = extractToken(session)
    await load(token)
  }, [load, session])

  const value = useMemo(
    () => ({ items, itemsList, loading, isWishlisted, toggle, refresh }), // include itemsList
    [items, itemsList, loading, isWishlisted, toggle, refresh]
  )

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export const useWishlist = (): WishlistValue => {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error("useWishlist must be used inside WishlistProvider")
  return ctx
}

export default WishlistContext