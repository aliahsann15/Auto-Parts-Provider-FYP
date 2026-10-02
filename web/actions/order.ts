'use server';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getServerSession } from 'next-auth';

const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:4001').replace(/\/$/, '')

export async function getSellerOrders() {
    try {
        const session = await getServerSession(authOptions);
        const token = session?.backendToken || session?.accessToken;

        if (!session || !token) {
            return {
                success: false,
                message: 'Not logged in',
                orders: [],
            };
        }

        const res = await fetch(`${API_BASE}/api/orders/seller-orders`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            cache: 'no-store',
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            console.error('Failed to fetch seller orders:', err);
            return {
                success: false,
                message: err.msg || 'Failed to fetch orders',
                orders: [],
            };
        }

        const data = await res.json();
      
        return {
            success: true,
            message: 'Orders fetched successfully',
            orders: data.orders || [],
        };
    } catch (error: any) {
        console.error('Error fetching seller orders:', error);
        return {
            success: false,
            message: error.message || 'An error occurred while fetching orders',
            orders: [],
        };
    }
}

export async function getUserOrders() {
    try {
        const session = await getServerSession(authOptions);
        const token = session?.backendToken || session?.accessToken;

        if (!session || !token) {
            return {
                success: false,
                message: 'Not logged in',
                orders: [],
            };
        }

        const res = await fetch(`${API_BASE}/api/orders/my-orders`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            cache: 'no-store',
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            console.error('Failed to fetch user orders:', err);
            return {
                success: false,
                message: err.msg || 'Failed to fetch orders',
                orders: [],
            };
        }

        const data = await res.json();

        return {
            success: true,
            message: 'Orders fetched successfully',
            orders: data.orders || [],
        };
    } catch (error: any) {
        console.error('Error fetching user orders:', error);
        return {
            success: false,
            message: error.message || 'An error occurred while fetching orders',
            orders: [],
        };
    }
}

export async function updateOrderStatus(orderId: string, status: string) {
    try {
        const session = await getServerSession(authOptions);
        const token = session?.backendToken || session?.accessToken;

        if (!session || !token) {
            return {
                success: false,
                message: 'Not logged in',
            };
        }

        const res = await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            console.error('Failed to update order status:', err);
            return {
                success: false,
                message: err.msg || 'Failed to update order status',
            };
        }

        const data = await res.json();

        return {
            success: true,
            message: 'Order status updated successfully',
            order: data,
        };
    } catch (error: any) {
        console.error('Error updating order status:', error);
        return {
            success: false,
            message: error.message || 'An error occurred while updating order status',
        };
    }
}
