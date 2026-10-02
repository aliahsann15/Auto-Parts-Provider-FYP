'use client'

import { useState } from 'react'
import { FiEye } from 'react-icons/fi'
import type { Order } from '@/types'
import OrderDetailsModal from './seller-dasboard-view-order'
import { updateOrderStatus } from '@/actions/order'
import { toast } from 'sonner'

type Props = {
  orders: Order[],
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>,
  wrapperClass: string
}
const RecentOrders = ({ orders, setOrders, wrapperClass }: Props) => {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isModalOpen, setModalOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const openModal = (order: Order) => {
    setSelectedOrder(order)
    setModalOpen(true)
  }

  // const closeModal = () => {
  //   setSelectedOrder(null)
  //   setModalOpen(false)
  // }
  
  const handleStatusSave = async (id: string, newStatus: Order['status']) => {
    setIsUpdating(true)
    try {
      const result = await updateOrderStatus(id, newStatus)
      
      if (result.success) {
        // Update local state
        setOrders(prev =>
          prev.map(o => (o._id === id ? { ...o, status: newStatus } : o))
        )
        toast.success('Order status updated successfully')
      } else {
        toast.error(result.message || 'Failed to update order status')
      }
    } catch (error) {
      console.error('Error updating order status:', error)
      toast.error('An error occurred while updating order status')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    // Section: Order List Starts Here
    <div className={`overflow-x-auto ${wrapperClass}`}>
      <table className="w-full rounded-lg divide-y divide-gray-200 overflow-hidden">
        {/* Table Head */}
        <thead className="bg-[#ffa500]">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Order</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Date</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Amount</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Action</th>
          </tr>
        </thead>
        {/* Table Body */}
        <tbody className="bg-white divide-y divide-gray-200">
          {orders.length > 0 ? orders.map((order) => {
            const date = new Date(order.createdAt)
            const orderDate = date.getDate() + "-" + date.getMonth() + "-" + date.getFullYear();
            return (
              <tr key={order._id}>
              <td className="px-6 py-4 whitespace-nowrap text-xs text-black">{order._id}</td>
              <td className="px-6 py-4 whitespace-nowrap text-xs text-black">{orderDate.toString()}</td>
              <td className="px-6 py-4 whitespace-nowrap text-xs text-black">{order.totalAmount}</td>

              {/* Status Badge */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        order.status === 'processing' ? 'bg-yellow-300' :
                          'bg-red-100 text-red-800'
                    }`}
                >
                  {order.status}
                </div>
              </td>

              {/* Action Button */}
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={() => openModal(order)}
                  className="inline-flex items-center text-[#FFA500] hover:underline">
                  <FiEye className="mr-1 text-xl" />

                </button>
              </td>
            </tr>
            
          )}): <tr><td><div className='text-sm text-center mt-2'>No recent orders</div></td></tr>}
      </tbody>
      </table>
      <div className={`overflow-x-auto ${wrapperClass}`}>
        {/* …your table rows… */}
        {selectedOrder && isModalOpen && (
          <OrderDetailsModal
            order={selectedOrder}
            onClose={() => {setSelectedOrder(null); setModalOpen(false)}}
            onSave={handleStatusSave}
            isUpdating={isUpdating}
          />
        )}
      </div>
    </div>
  )
}

export default RecentOrders;
