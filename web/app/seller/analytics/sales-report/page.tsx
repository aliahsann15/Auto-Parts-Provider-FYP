'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useMemo, useEffect } from 'react'
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
import { useSession } from 'next-auth/react'
import SellerDashboardAside from '@/app/components/seller/seller-dasboard-aside'

const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:4001').replace(/\/$/, '')

// Define the SalesData type
type SalesData = {
    date: string
    sales: number
}

const SalesReportByDuration: React.FC = () => {
    const { data: session, status } = useSession()
    const [chartData, setChartData] = useState<SalesData[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // State for selected filter
    const [filter, setFilter] = useState<'7days' | '30days' | '12months' | 'custom'>('7days')
    // State for custom date range
    const [customStart, setCustomStart] = useState('')
    const [customEnd, setCustomEnd] = useState('')

    // Aggregate seller orders into daily sales
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

    // Fetch seller orders when component mounts
    useEffect(() => {
        if (status !== 'authenticated') return

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
                const aggregated = aggregateOrdersToSales((resData as any)?.orders || [])
                setChartData(aggregated)
                setError(null)
            })
            .catch((err) => {
                console.error('Error loading sales data:', err)
                setError('Failed to load sales data')
            })
            .finally(() => setLoading(false))
    }, [status, session])

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
        // ✅ Main Container: Flex to create two-column layout
        <div className="flex ">

            {/* 👉 Left Sidebar - 20% width */}
            <SellerDashboardAside />

            {/* 👉 Right Content - 80% width */}
            <div className="w-[82.2%] p-6 bg-[#F3F4F6]">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <h1 className="text-2xl font-bold text-black">
                        Sales By Duration
                    </h1>

                    <div className="p-2 rounded-lg bg-white shadow flex gap-4 items-center w-full md:w-auto text-m mt-1 font-semibold text-black">
                        TOTAL SALES: PKR {totalSales.toLocaleString()}
                    </div>
                </div>


                <main className=" bg-white rounded-xl shadow-md overflow-x-auto p-6">

                    {loading && (
                        <div className="text-sm text-gray-500 py-4">Loading sales data...</div>
                    )}

                    {error && (
                        <div className="text-sm text-red-500 py-4">{error}</div>
                    )}

                    {!loading && !error && (
                        <>
                            {/* Filter Buttons */}
                            <div className="flex flex-wrap items-center gap-4 mb-6">
                                {buttons.map(item => (
                                    <button
                                        key={item.key}
                                        className={`px-4 py-1 rounded-md text-sm transition ${filter === item.key
                                            ? 'bg-[#FFA500] text-white'
                                            : 'bg-gray-100 text-gray-700'
                                            }`}
                                        onClick={() => setFilter(item.key as '7days' | '30days' | '12months' | 'custom')}
                                    >
                                        {item.label}
                                    </button>
                                ))}


                                {/* Custom Range Inputs */}
                                {filter === 'custom' && (
                                    <div className="flex items-center gap-2 ">
                                        <input
                                            type="date"
                                            value={customStart}
                                            onChange={e => setCustomStart(e.target.value)}
                                            className="text-[#ffa500] border border-[#ffa500] text-sm rounded-md p-1 outline-none"
                                        />
                                        <span className="text-[#ffa500] text-xs p-1 outline-none">to</span>
                                        <input
                                            type="date"
                                            value={customEnd}
                                            onChange={e => setCustomEnd(e.target.value)}
                                            className="text-[#ffa500] border border-[#ffa500] text-sm rounded-md p-1 outline-none"
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
                                )}</div>




                            {/* Chart Container */}
                            <div className="w-full h-120">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={filteredData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="date"
                                            tickFormatter={date => format(new Date(date), 'MMM d')}
                                            tick={{ fontSize: 14 }} // Adjust X-axis label font size
                                        />
                                        <YAxis tick={{ fontSize: 14 }} /> {/* Adjust Y-axis label font size */}
                                        <Tooltip
                                            labelFormatter={date => format(new Date(date), 'PPP')}
                                            contentStyle={{ fontSize: 14 }} // Tooltip content font size
                                            itemStyle={{ fontSize: 14 }}
                                            labelStyle={{ fontSize: 14 }}
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
                    )}

                </main>
            </div>
        </div>
    )
}

export default SalesReportByDuration
