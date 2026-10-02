"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import Image from '@/app/components/AppImage'
import Link from 'next/link'
import { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'

export interface Product {
  _id: string
  images: string[]
  name: string
  brand?: string
  carModel?: string
  make?: string
  variant?: string
  year?: number | string
  sku?: string
  status?: string
  price: number
  salePrice?: number
  stock: number
  categories: string[]
  sellerName?: string
  itemsSold?: number
}

export default function ProductsClient({ products }: { products: Product[] }) {
  const searchParams = useSearchParams()

  const filters = useMemo(() => {
    const make = searchParams.get('make')?.toLowerCase() || ''
    const model = searchParams.get('model')?.toLowerCase() || ''
    const year = searchParams.get('year')?.toLowerCase() || ''
    return { make, model, year }
  }, [searchParams])

  const filtered = useMemo(() => {
    if (!products) return []
    // Only show products that match ALL specified filters
    return products.filter((p: any) => {
      // If filters are specified, ALL must match; if no filters, show nothing
      if (!filters.make && !filters.model && !filters.year) return false
      const matchesMake = filters.make ? (p.make || '').toLowerCase() === filters.make : true
      const matchesModel = filters.model ? (p.carModel || '').toLowerCase() === filters.model : true
      return matchesMake && matchesModel 
    })
  }, [products, filters])

  return (
    <main className="bg-white min-h-screen">
      <div className="px-20 py-12 max-w-full">
        <div className="mb-8">
          <h1 className="text-[32px] font-bold text-black mb-2">Filtered Products</h1>
          <p className="text-gray-600">
            {filtered.length ? `Found ${filtered.length} product${filtered.length !== 1 ? 's' : ''} matching your vehicle` : 'No products found matching your vehicle'}
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No products found matching your selected vehicle.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filtered.map((product) => (
              <div key={product._id} className="border border-[#DEE2E6] rounded-lg p-4 relative w-full">
                <Link href={`/product/${product._id}`}>
                  <div className="flex justify-center mb-3">
                    <Image
                      src={product.images?.[0] || '/images/placeholder.png'}
                      alt={product.name}
                      width={120}
                      height={120}
                      className="w-[120px] h-[120px] object-contain"
                    />
                  </div>
                </Link>
                <h3 className="text-[14px] font-semibold leading-tight min-h-[35px] text-black">{product.name}</h3>
                <p className="text-xs text-gray-500 mb-2">{product.sellerName || 'Seller'}</p>
                <div className="mb-2">
                  {typeof product.salePrice === 'number' && product.salePrice < product.price ? (
                    <>
                      <p className="text-xs text-gray-400 line-through">PKR {product.price.toLocaleString()}</p>
                      <p className="text-md text-[#d90429] font-bold">PKR {product.salePrice.toLocaleString()}</p>
                    </>
                  ) : (
                    <p className="text-md text-black font-semibold">PKR {product.price.toLocaleString()}</p>
                  )}
                </div>
                <div className="text-xs text-green-600 mt-4">
                  In Stock ({product.stock ?? 0})
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
