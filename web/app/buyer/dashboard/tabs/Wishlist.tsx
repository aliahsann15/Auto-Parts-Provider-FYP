"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useState } from "react"
import Image from "@/app/components/AppImage"
import { toast } from "sonner"
import AddToCart from "@/app/components/product/add-to-cart"
import { useWishlist } from "@/app/context/wishlist-context"

type NormalizedItem = {
  id: string
  images: string[]
  title: string
  oldPrice: number
  newPrice: number
  inStock: boolean
  quantity: number
  raw?: Record<string, unknown>
}

export default function Wishlist() {
  const { itemsList: wishlistFromCtx, loading: wishlistLoading, toggle, refresh } = useWishlist()
  const [wishlistItems, setWishlistItems] = useState<NormalizedItem[]>([])

  // normalize context items into local state (adds quantity etc.)
  useEffect(() => {
    if (wishlistLoading) return

    if (Array.isArray(wishlistFromCtx) && wishlistFromCtx.length > 0) {
      const normalized = wishlistFromCtx.map((prod: any) => {
        const id = String(prod._id ?? prod.id ?? prod._doc?._id ?? "")
        const images =
          Array.isArray(prod.images) && prod.images.length
            ? prod.images
            : prod.image
              ? [prod.image]
              : ["/images/placeholder-product.png"]
        const title = prod.title ?? prod.name ?? prod.productName ?? "Untitled product"
        const oldPrice =
          typeof prod.price === "number"
            ? prod.price
            : typeof prod.oldPrice === "number"
              ? prod.oldPrice
              : 0
        const newPrice =
          typeof prod.salePrice === "number"
            ? prod.salePrice
            : typeof prod.newPrice === "number"
              ? prod.newPrice
              : oldPrice
        const inStock =
          typeof prod.stock === "number"
            ? prod.stock > 0
            : prod.inStock !== undefined
              ? !!prod.inStock
              : true

        return {
          id,
          images,
          title,
          oldPrice,
          newPrice,
          inStock,
          quantity: 1,
          raw: prod,
        } as NormalizedItem
      })
      setWishlistItems(normalized)
    } else {
      setWishlistItems([])
    }
  }, [wishlistFromCtx, wishlistLoading])

  // remove item via wishlist context toggle (backend & context will update)
  const handleRemove = async (id: string) => {
    try {
      await toggle(id) // toggle will sync context, our effect will update local state
      // optionally refresh to ensure context is up-to-date
      await refresh()
    } catch (err) {
      console.error("Failed to remove wishlist item:", err)
      toast.error("Failed to remove item")
    }
  }

  const updateQuantity = (index: number, delta: number) => {
    setWishlistItems((prev) => {
      const next = [...prev]
      const cur = next[index]
      if (!cur) return prev
      const newQty = Math.max(1, (cur.quantity ?? 1) + delta)
      next[index] = { ...cur, quantity: newQty }
      return next
    })
  }

  return (
    <main className="w-[82.8%] p-6 bg-gray-100">
      <h1 className="text-2xl font-bold text-black mb-6">My Wishlist</h1>

      {wishlistItems.length === 0 ? (
        <p className="text-gray-600 text-center mt-[calc(50vh-100px)] -translate-y-1/2">No items in wishlist.</p>
      ) : (
        <div className="space-y-6">
          {wishlistItems.map((item, index) => {
            const idKey = item.id ?? index
            const qty = Number(item.quantity ?? 1)
            const oldTotal = (Number(item.oldPrice ?? 0) * qty) || 0
            const newTotal = (Number(item.newPrice ?? 0) * qty) || 0

            return (
              <div
                key={idKey}
                className="w-full flex items-center justify-between bg-white p-6 rounded-lg shadow-md"
              >
                {/* Image + Info */}
                <div className="w-[55%] flex items-center gap-4">
                  <div className="relative w-[100px] h-[100px]">
                    <Image
                      src={item.images?.[0] ?? "/images/placeholder-product.png"}
                      alt={item.title ?? "Product"}
                      width={100}
                      height={100}
                      className="rounded-md border object-contain"
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{item.title}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Image src="/images/icons/stock.svg" alt="stock" width={15} height={15} />
                      <span className={`text-sm ${item.inStock ? "text-green-600" : "text-red-500"}`}>
                        {item.inStock ? "In Stock" : "Out of Stock"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div className="text-right">
                  <p className="text-sm text-gray-400 line-through">Rs. {oldTotal.toFixed(2)}</p>
                  <p className="text-lg font-[600] text-red-500">Rs. {newTotal.toFixed(2)}</p>
                </div>

                {/* Quantity */}
                <div className="flex items-center gap-2">
                  <button
                    className="text-xl bg-gray-200 w-8 h-8 rounded"
                    onClick={() => updateQuantity(index, -1)}
                  >
                    -
                  </button>
                  <span className="text-center w-6">{qty}</span>
                  <button
                    className="text-xl bg-gray-200 w-8 h-8 rounded"
                    onClick={() => updateQuantity(index, +1)}
                  >
                    +
                  </button>
                </div>

                {/* AddToCart */}
                <div className="w-1/6 px-4">
                  <AddToCart
                    productName={item.title}
                    productId={item.id}
                    stock={item.inStock ? 1 : 0}
                    quantity={qty}
                  />
                </div>

                {/* Delete */}
                <button
                  className="ml-[-20px] text-sm bg-red-600 hover:bg-orange-600 text-white px-4 py-[10px] rounded shadow"
                  onClick={() => handleRemove(item.id)}
                >
                  Delete
                </button>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
