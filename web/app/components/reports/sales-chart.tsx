'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { format, subDays, subMonths } from 'date-fns'

// -------------------
// 🔖 Data & Props Types
// -------------------
export interface SalesData {
  date: string      // ISO date string, e.g. '2025-04-25'
  sales: number     // Sales amount for that date
}

interface SalesChartFilterProps {
  data?: SalesData[] // Optional pre-fetched sales data points
}

const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:4001').replace(/\/$/, '')

// -------------------
// 🌟 SalesChartFilter Component
// -------------------
const SalesChartFilter: React.FC<SalesChartFilterProps> = ({ data }) => {
  const { data: session, status } = useSession()
  // State for selected filter
  const [filter, setFilter] = useState<'7days' | '30days' | '12months' | 'custom'>('7days')
  // State for custom date range
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  // State for chart data loaded from backend
  const [chartData, setChartData] = useState<SalesData[]>(data || [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Aggregate seller orders into daily sales
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aggregateOrdersToSales = (orders: any[]): SalesData[] => {
    const byDate: Record<string, number> = {}
    orders.forEach((order) => {
      const dateKey = order?.createdAt
        ? new Date(order.createdAt).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10)
      const total = Number(order?.totalAmount || 0)
      byDate[dateKey] = (byDate[dateKey] ?? 0) + total
    })
    return Object.entries(byDate).map(([date, sales]) => ({ date, sales }))
  }

  // Fetch seller orders when no data is provided
  useEffect(() => {
    if (data && data.length) {
      setChartData(data)
      return
    }
    if (status !== 'authenticated') return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const token = (session as any)?.backendToken || (session as any)?.accessToken
    if (!token) {
      setError('Authentication required')
      return
    }

    setLoading(true)
    fetch(`${API_BASE}/api/orders/seller-orders`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch sales data')
        return res.json()
      })
      .then((resData) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const aggregated = aggregateOrdersToSales((resData as any)?.orders || [])
        setChartData(aggregated)
        setError(null)
      })
      .catch((err) => {
        console.error('Error loading sales data:', err)
        setError('Failed to load sales data')
      })
      .finally(() => setLoading(false))
  }, [data, status, session])

  // Memoized filtered data based on selected filter
  const filteredData = useMemo(() => {
    const now = new Date()
    let result: SalesData[] = []

    if (filter === '7days') {
      const start = subDays(now, 7)
      result = chartData.filter(item => new Date(item.date) >= start)
    } else if (filter === '30days') {
        const start = subDays(now, 30)
        result = chartData.filter(item => new Date(item.date) >= start)
      } 
    else if (filter === '12months') {
      const start = subMonths(now, 12)
      result = chartData.filter(item => new Date(item.date) >= start)
    } else {
      // Custom date range
      if (customStart && customEnd) {
        const start = new Date(customStart)
        const end = new Date(customEnd)
        result = chartData.filter(item => {
          const date = new Date(item.date)
          return date >= start && date <= end
        })
      } else {
        result = chartData
      }
    }

    // Sort by date ascending
    return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [chartData, filter, customStart, customEnd])

  // Compute total sales for the filtered range
  const totalSales = useMemo(
    () => filteredData.reduce((sum, item) => sum + item.sales, 0),
    [filteredData]
  )

  // Filter buttons configuration
  const buttons = [
    { key: '7days', label: 'Last 7 Days' },
    { key: '30days', label: 'Last 30 Days' },
    { key: '12months', label: 'Last 12 Months' },
    { key: 'custom', label: 'Custom Range' },
  ]

  return (
 <>
  {loading && (
    <div className="text-xs text-gray-500 mb-2">Loading sales data...</div>
  )}
  {error && (
    <div className="text-xs text-red-500 mb-2">{error}</div>
  )}
 <div className="flex justify-between mb-5 items-center">
 <h3 className="text-lg font-semibold text-black ">Sales By Duration</h3>
 {/* Total Sales Placeholder */}
 <div className="text-xs mt-1 font-semibold text-black">
        TOTAL SALES: PKR {totalSales.toLocaleString()}
      </div></div>
      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {buttons.map(item => (
          <button
            key={item.key}
            className={`px-4 py-1 rounded-md text-xs transition ${
              filter === item.key
                ? 'bg-[#FFA500] text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
            onClick={() => setFilter(item.key as '7days' | '30days' | '12months' | 'custom')}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Custom Range Inputs */}
      {filter === 'custom' && (
        <div className="flex items-center gap-2 mb-4">
          <input
            type="date"
            value={customStart}
            onChange={e => setCustomStart(e.target.value)}
            className="text-[#ffa500] border border-[#ffa500] text-xs rounded-md p-1 outline-none"
          />
          <span className="text-[#ffa500] text-xs p-1 outline-none">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={e => setCustomEnd(e.target.value)}
             className="text-[#ffa500] border border-[#ffa500] text-xs rounded-md p-1 outline-none"
          />
          <style jsx global>{`
  input[type="date"]::-webkit-calendar-picker-indicator {
    filter: invert(44%) sepia(79%) saturate(4178%) hue-rotate(1deg) brightness(94%) contrast(88%);
  }
  input[type="date"]::-moz-calendar-picker-indicator {
    color: #FFA500;
  }
`}</style>
        </div>
      )}

      

    
        {/* Chart Container */}
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={date => format(new Date(date), 'MMM d')}
                tick={{ fontSize: 12 }} // Adjust X-axis label font size
              />
              <YAxis tick={{ fontSize: 12 }} /> {/* Adjust Y-axis label font size */}
              <Tooltip
                labelFormatter={date => format(new Date(date), 'PPP')}
                contentStyle={{ fontSize: 12 }} // Tooltip content font size
                itemStyle={{ fontSize: 12 }}
                labelStyle={{ fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="sales"
                stroke="#FFA500"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
   </>
  )
}

export default SalesChartFilter
