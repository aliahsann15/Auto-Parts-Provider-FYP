import { useEffect, useState } from 'react'
import { fetchStoreBySellerId } from '@/utils/api/store'
import { fetchUserRaw } from '@/utils/api/user'
import { buildSellerContactInfo, SellerContactInfo } from '@/utils/seller'

export const useSellerContact = (sellerId?: string, token?: string) => {
  const [sellerContact, setSellerContact] = useState<SellerContactInfo | null>(null)

  useEffect(() => {
    if (!sellerId) {
      setSellerContact(null)
      return
    }

    let active = true

    const loadContact = async () => {
      try {
        const [store, user] = await Promise.all([
          fetchStoreBySellerId(sellerId, token)
            .then(result => result?.store)
            .catch(() => null),
          token
            ? fetchUserRaw(sellerId, token).catch(() => null)
            : Promise.resolve(null),
        ])

        if (!active) return
        setSellerContact(buildSellerContactInfo(store || null, user || null))
      } catch (err) {
        if (!active) return
        setSellerContact(buildSellerContactInfo(null, null))
      }
    }

    loadContact()

    return () => {
      active = false
    }
  }, [sellerId, token])

  return sellerContact
}
