'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import { FC, useState } from 'react'
import { FiX } from 'react-icons/fi'
import type { Order } from '@/types'
import { FiPrinter } from 'react-icons/fi'
import { handlePrintReceipt } from '@/lib/seller'

interface OrderDetailsModalProps {
  order: Order
  onClose: () => void
  onSave: (id: string, newStatus: Order['status']) => void
  isUpdating?: boolean
}

/**
 * A styled popup for viewing and editing an order, designed to match the Edit Product modal style.
 */
const OrderDetailsModal: FC<OrderDetailsModalProps> = ({ order, onClose, onSave, isUpdating = false }) => {
  const [status, setStatus] = useState<Order['status']>(order.status)

  // Format address object into a readable single line
  const shippingAddressDisplay = (() => {
    const addr = order.shippingAddress as any;
    if (!addr) return 'N/A';
    if (typeof addr === 'string') return addr;
    const parts = [addr.street, addr.city, addr.state, addr.country, addr.zipCode]
      .filter(Boolean)
      .join(', ');
    return parts || 'N/A';
  })();

  const handleSave = () => {
    onSave(order._id, status)
    onClose()
  }


  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-4xl p-6 md:p-8 overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center mt-2 mb-10">
          <h2 className="text-2xl font-bold text-gray-800">Order Details</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX size={24} />
          </button>
        </div>

        {/* Basic Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Order ID */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">Order ID</label>
            <div className="bg-gray-100 rounded-lg p-2 text-black">{order._id}</div>
          </div>
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">Date</label>
            <div className="bg-gray-100 rounded-lg p-2 text-black">{new Date(order.createdAt).toLocaleDateString()}</div>
          </div>
          {/* Shipping Status - Full Width */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-black mb-2">Shipping Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as Order['status'])}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
            >
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Items Table Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-black mb-4">Items Ordered</h3>
          <div className="overflow-x-auto">
            <table className="w-full rounded-lg divide-y divide-gray-200 overflow-hidden">
              {/* Table Head */}
              <thead className="bg-[#ffa500]">
                <tr className="">
                  {['Product ID', 'Product Name', 'Qty', 'Price', 'Subtotal'].map(col => (
                    <th key={col} className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, idx) => (
                  <tr
                    key={idx}
                    className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  >
                    <td className="text-center text-xs px-4 py-3 text-gray-800">{(item as any).product?._id || (item as any).productId || 'N/A'}</td>
                    <td className="text-center text-xs px-4 py-3 text-gray-800">{(item as any).product?.name || (item as any).productName || 'N/A'}</td>
                    <td className="text-center text-xs px-4 py-3 text-gray-800">{item.quantity}</td>
                    <td className="text-center text-xs px-4 py-3 text-gray-800">
                      {(item.salePrice ?? item.price).toLocaleString()}
                    </td>
                    <td className="text-center text-xs px-4 py-3 text-gray-800">
                      {((item.salePrice ?? item.price) * item.quantity).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Customer & Shipping Details */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-black mb-4">Customer & Shipping</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-black mb-1">First Name</label>
              <div className="bg-gray-100 text-m rounded-lg p-2 text-black">{(order as any).customer?.firstName || order.user?.name?.split(' ')[0] || 'N/A'}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Last Name</label>
              <div className="bg-gray-100 rounded-lg p-2 text-black">{(order as any).customer?.lastName || order.user?.name?.split(' ').slice(1).join(' ') || 'N/A'}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Email</label>
              <div className="bg-gray-100 rounded-lg p-2 text-black">{(order as any).customer?.email || order.user?.email || 'N/A'}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Contact</label>
              <div className="bg-gray-100 rounded-lg p-2 text-black">{(order as any).customer?.phoneNumber || (order.user as any)?.phoneNumber || 'N/A'}</div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-black mb-1">Shipping Address</label>
              <div className="bg-gray-100 rounded-lg p-2 text-black">{shippingAddressDisplay}</div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-black mb-1">Total Amount</label>
              <div className="bg-gray-100 rounded-lg p-2 text-black font-semibold">{order.totalAmount}</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            disabled={isUpdating}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isUpdating}
            className="px-6 py-2 bg-[#ffa500] text-white rounded-lg hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isUpdating ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Updating...
              </>
            ) : (
              'Save'
            )}
          </button>
          <button
            onClick={() => handlePrintReceipt(order)}
            disabled={isUpdating}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-300 transition flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiPrinter className="mr-2" /> Print Receipt
          </button>

        </div>
      </div>
    </div>
  )
}

export default OrderDetailsModal
