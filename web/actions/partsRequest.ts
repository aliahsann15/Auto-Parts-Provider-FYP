'use server';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:4001').replace(/\/$/, '');

export async function getPartsRequests(limit: number = 20) {
    try {
        const res = await fetch(`${API_BASE}/api/parts-requests?limit=${limit}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            cache: 'no-store',
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            console.error('Failed to fetch parts requests:', err);
            return {
                success: false,
                message: err.msg || 'Failed to fetch parts requests',
                items: [],
            };
        }

        const data = await res.json();
        return {
            success: true,
            message: 'Parts requests fetched successfully',
            items: data.items || [],
        };
    } catch (error: any) {
        console.error('Error fetching parts requests:', error);
        return {
            success: false,
            message: error.message || 'An error occurred while fetching parts requests',
            items: [],
        };
    }
}

export async function getUserPartsRequests() {
    try {
        const session = await getServerSession(authOptions);
        const token = session?.backendToken || session?.accessToken;

        if (!session || !token) {
            return {
                success: false,
                message: 'Not logged in',
                items: [],
            };
        }

        const res = await fetch(`${API_BASE}/api/parts-requests/my`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            cache: 'no-store',
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            console.error('Failed to fetch user parts requests:', err);
            return {
                success: false,
                message: err.msg || 'Failed to fetch your parts requests',
                items: [],
            };
        }

        const data = await res.json();
        return {
            success: true,
            message: 'Your parts requests fetched successfully',
            items: data.items || [],
        };
    } catch (error: any) {
        console.error('Error fetching user parts requests:', error);
        return {
            success: false,
            message: error.message || 'An error occurred while fetching your parts requests',
            items: [],
        };
    }
}
