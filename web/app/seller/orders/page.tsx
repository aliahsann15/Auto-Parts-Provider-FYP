'use client'
import { useEffect, useState } from 'react'
import {
  FiSearch,
} from 'react-icons/fi'
import SellerDashboardAside from '@/app/components/seller/seller-dasboard-aside'
import OrderList from '@/app/components/seller/seller-dasboard-order-list'
import { Order } from '@/types';
import { getSellerOrders } from '@/actions/order';
import { toast } from 'sonner';

const SellerOrderPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      try {
        const result = await getSellerOrders();

        if (result.success && result.orders) {
          setOrders(result.orders);
          setFilteredOrders(result.orders);
        } else {
          toast.error(result.message || 'Failed to fetch orders');
        }
      } catch (error) {
        console.error('Error fetching orders:', error);
        toast.error('An error occurred while fetching orders');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // Handle search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredOrders(orders);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = orders.filter(order => {
      const orderId = order._id?.toLowerCase() || '';
      const userName = order.user?.userName?.toLowerCase() || '';
      const userEmail = order.user?.email?.toLowerCase() || '';
      const status = order.status?.toLowerCase() || '';
      const trackingNumber = order.trackingNumber?.toLowerCase() || '';

      return orderId.includes(query) ||
        userName.includes(query) ||
        userEmail.includes(query) ||
        status.includes(query) ||
        trackingNumber.includes(query);
    });

    setFilteredOrders(filtered);
  }, [searchQuery, orders]);

  return (
    <div className="w-full flex flex-col md:flex-row gap-4 bg-gray-100" >
      {/* Sidebar */}
      <SellerDashboardAside />
      <div className="w-full p-6">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold text-black">
            Manage Orders
          </h1>

          {/* Search Input */}
          <div className="relative flex-grow md:flex-none">
            <FiSearch className="absolute top-1/2 left-3 transform -translate-y-1/2 text-[#FFA500] text-xl" />
            <input
              type="text"
              placeholder="Search orders"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-[#FFA500] focus:outline-none"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FFA500]"></div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-gray-500 text-lg">
              {searchQuery ? 'No orders found matching your search' : 'No orders yet'}
            </p>
          </div>
        ) : (
          <OrderList orders={filteredOrders} setOrders={setOrders} wrapperClass="w-5/5" />
        )}
      </div>
    </div>
  )
}

export default SellerOrderPage
