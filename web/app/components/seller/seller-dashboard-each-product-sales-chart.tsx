'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

// -------------------
// 🔖 TypeScript definitions for listed products
// -------------------
export interface ListedProduct {
  id: number            // Numeric index for ordering
  name: string          // Product name
  popularity: number    // Popularity percentage (0-100)
  sales: number         // Sales percentage (0-100)
  color: string         // Hex or Tailwind CSS color string for bar and badge
}

interface EachProductSalesChartProps {
  products?: ListedProduct[]  // Optional pre-fetched products
}

const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:4001').replace(/\/$/, '')

// Color palette for different products
const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6', '#F97316']

// -------------------
// 🌟 Listed Products Section Component
// -------------------
const EachProductSalesChart: React.FC<EachProductSalesChartProps> = ({ products }) => {
  const { data: session, status } = useSession()
  const [chartData, setChartData] = useState<ListedProduct[]>(products || [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Calculate sales metrics for products based on orders
  const calculateProductMetrics = (products: any[], orders: any[]): ListedProduct[] => {
    // Count sales for each product
    const productSales: Record<string, { count: number; name: string }> = {}
    
    orders.forEach(order => {
      order.items?.forEach((item: any) => {
        const productId =
          item.product?._id?.toString() ||
          item.product?.toString() ||
          item.productSnapshot?._id?.toString() ||
          item.productSnapshot?.sku ||
          item.productSnapshot?.name ||
          'temp-product'
        const productName = item.product?.name || item.productSnapshot?.name || 'Unknown Product'
        
        if (!productSales[productId]) {
          productSales[productId] = { count: 0, name: productName }
        }
        productSales[productId].count += item.quantity || 0
      })
    })

    // Find max sales for percentage calculation
    const maxSales = Math.max(...Object.values(productSales).map(p => p.count), 1)

    // Transform to ListedProduct format
    const result: ListedProduct[] = Object.entries(productSales)
      .sort((a, b) => b[1].count - a[1].count) // Sort by sales descending
      .slice(0, 5) // Top 5 products
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(([_productId, data], index) => {
        const salesPercentage = Math.round((data.count / maxSales) * 100)
        return {
          id: index + 1,
          name: data.name,
          popularity: salesPercentage,
          sales: salesPercentage,
          color: COLORS[index % COLORS.length]
        }
      })

    return result.length > 0 ? result : []
  }

  // Fetch seller products and orders
  useEffect(() => {
    if (products && products.length) {
      setChartData(products)
      return
    }
    if (status !== 'authenticated') return

    const token = (session as any)?.backendToken || (session as any)?.accessToken
    if (!token) {
      setError('Authentication required')
      return
    }

    setLoading(true)
    
    // Fetch both products and orders in parallel
    Promise.all([
      fetch(`${API_BASE}/api/products`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => res.ok ? res.json() : Promise.reject('Failed to fetch products')),
      
      fetch(`${API_BASE}/api/orders/seller-orders`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => res.ok ? res.json() : Promise.reject('Failed to fetch orders'))
    ])
      .then(([productsData, ordersData]) => {
        const metrics = calculateProductMetrics(
          productsData.products || [],
          ordersData.orders || []
        )
        setChartData(metrics)
        setError(null)
      })
      .catch((err) => {
        console.error('Error loading product sales data:', err)
        setError('Failed to load product sales data')
      })
      .finally(() => setLoading(false))
  }, [products, status, session])

  if (loading) {
    return <div className="text-xs text-gray-500 py-4">Loading product sales...</div>
  }

  if (error) {
    return <div className="text-xs text-red-500 py-4">{error}</div>
  }

  if (chartData.length === 0) {
    return <div className="text-xs text-gray-500 py-4 text-center">No sales data available</div>
  }

  return (
   <>

      {/* Table container for horizontal scrolling */}
      <div className="overflow-y-auto max-h-[300px] ">
    {/* Table container */}
    <table className="min-w-full rounded-lg divide-y divide-gray-200 overflow-hidden">
      {/* Table head */}
      <thead className="bg-[#ffa500] ">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">#</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Popularity</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Sales</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="bg-white divide-y divide-gray-100">
            {chartData.map((item) => (
              <tr key={item.id}>
                {/* Index with leading zero */}
                <td className="px-6 py-4 whitespace-nowrap text-xs text-black">
                  {String(item.id).padStart(2, '0')}
                </td>

                {/* Product Name */}
                <td className="px-6 py-4 whitespace-nowrap text-xs text-black">
                  {item.name}
                </td>

                {/* Popularity Bar */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-1.5 rounded-full"
                      style={{ width: `${item.popularity}%`, backgroundColor: item.color }}
                    />
                  </div>
                </td>

                {/* Sales Badge */}
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800 text-right">
                  <span
                    className="inline-block px-2 py-1 border rounded-full"
                    style={{ borderColor: item.color, color: item.color }}
                  >
                    {item.sales}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
</>
  )
}

export default EachProductSalesChart
