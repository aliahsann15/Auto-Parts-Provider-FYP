'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from '@/app/components/AppImage';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:4001';

interface User {
    id: string;
    name: string;
    email: string;
    image: string;
    password: string;
    role: string;
    storeId?: string;
    sellerId?: string;
}


const ManageUsers = () => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const { data: session } = useSession();
    const [users, setUsers] = useState<User[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [managerToDelete, setManagerToDelete] = useState<User | null>(null);
    const [editUser, setEditUser] = useState<User | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [storeId, setStoreId] = useState<string>('');
    
    const getToken = () => (session as any)?.backendToken || (session as any)?.accessToken;
    const sellerId = (session as any)?.user?.id || (session as any)?.user?._id;

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'Store Manager',
    });

    // Fetch store ID and managers on mount
    useEffect(() => {
        const fetchStoreAndManagers = async () => {
            if (!sellerId) return;
            const token = getToken();
            if (!token) return;
            
            setIsLoading(true);
            try {
                // Fetch store to get storeId
                const storeRes = await fetch(`${API_BASE}/api/store/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                if (storeRes.ok) {
                    const storeData = await storeRes.json();
                    setStoreId(storeData.store._id);
                }
                
                // Fetch managers list
                const mgrRes = await fetch(`${API_BASE}/api/store/me/managers`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (mgrRes.ok) {
                    const mgrData = await mgrRes.json();
                    const list = (mgrData.managers || []).map((m: any) => ({
                        id: m.id,
                        name: m.name,
                        email: m.email,
                        image: m.profileImage || '/images/placeholder-user.png',
                        password: '',
                        role: m.role || 'Store Manager',
                        storeId,
                        sellerId,
                    }));
                    setUsers(list);
                }
            } catch (error) {
                console.error('Failed to load data:', error);
                toast.error('Failed to load store data');
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchStoreAndManagers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sellerId]);

    const handleEdit = (user: User) => {
        setEditUser(user);
        setPreviewImage(user.image);
        setFormData({
            name: user.name,
            email: user.email,
            password: user.password,
            role: user.role || 'Store Manager',
        });
        setShowPassword(false);
        setShowModal(true);
    };

    const handleAdd = async () => {
        // Open modal to fill manager details, submit on Save
        setEditUser(null);
        setPreviewImage(null);
        setImageFile(null);
        setFormData({ name: '', email: '', password: '', role: 'Store Manager' });
        setShowPassword(false);
        setShowModal(true);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Only image files are allowed.');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            alert('Image must be smaller than 2MB.');
            return;
        }

        setImageFile(file);
        const reader = new FileReader();
        reader.onload = () => setPreviewImage(reader.result as string);
        reader.readAsDataURL(file);
    };

    const uploadImage = async (file: File): Promise<string> => {
        const token = getToken();
        if (!token) throw new Error('Not authenticated');
        const formData = new FormData();
        formData.append('image', file);
        formData.append('folderName', 'manager-profiles');
        const res = await fetch(`${API_BASE}/api/upload/image`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData
        });
        if (!res.ok) throw new Error('Image upload failed');
        const data = await res.json();
        return data.url;
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.name || !formData.email || !formData.password) {
            toast.error('Please fill in all required fields');
            return;
        }
        
        if (!sellerId || !storeId) {
            toast.error('Store information not available');
            return;
        }

        const token = getToken();
        if (!token) {
            toast.error('Not authenticated');
            return;
        }

        setIsSaving(true);
        
        try {
            let uploadedImageUrl = previewImage;
            if (imageFile) {
                uploadedImageUrl = await uploadImage(imageFile);
            }

            if (editUser) {
                // Update existing manager via backend
                const updatePayload: any = {
                    name: formData.name,
                    email: formData.email,
                };
                if (formData.password) updatePayload.password = formData.password;
                if (uploadedImageUrl && uploadedImageUrl !== editUser.image) updatePayload.profileImage = uploadedImageUrl;

                const updateRes = await fetch(`${API_BASE}/api/store/me/managers/${editUser.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(updatePayload)
                });

                const updateData = await updateRes.json();
                if (!updateRes.ok) {
                    throw new Error(updateData.msg || 'Failed to update manager');
                }

                const updatedUser: User = {
                    id: updateData.manager.id,
                    name: updateData.manager.name,
                    email: updateData.manager.email,
                    password: '',
                    image: updateData.manager.profileImage,
                    role: 'Store Manager',
                    storeId,
                    sellerId,
                };
                setUsers((prev) => prev.map((u) => (u.id === editUser.id ? updatedUser : u)));
                toast.success('Manager updated successfully');
            } else {
                // Create new store manager
                const payload = {
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                    profileImage: uploadedImageUrl || ''
                };

                const res = await fetch(`${API_BASE}/api/store/me/managers`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });

                const data = await res.json();
                
                if (!res.ok) {
                    throw new Error(data.msg || 'Failed to create manager');
                }

                const newUser: User = {
                    id: data.manager.id,
                    name: data.manager.name,
                    email: data.manager.email,
                    password: formData.password,
                    image: data.manager.profileImage || '/images/profile-placeholder.png',
                    role: 'Store Manager',
                    storeId,
                    sellerId,
                };
                
                setUsers((prev) => [...prev, newUser]);
                toast.success('Manager added successfully');
            }

            setShowModal(false);
            setFormData({ name: '', email: '', password: '', role: 'Store Manager' });
            setPreviewImage(null);
            setImageFile(null);
        } catch (error) {
            console.error('Save manager error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to save manager');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (user: User) => {
        setManagerToDelete(user);
        setShowDeleteConfirmModal(true);
    };

    const confirmDelete = async () => {
        if (!managerToDelete) return;
        const token = getToken();
        if (!token) { toast.error('Not authenticated'); return; }
        try {
            const res = await fetch(`${API_BASE}/api/store/me/managers/${managerToDelete.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.msg || 'Failed to remove manager');
            }
            setUsers((prev) => prev.filter((user) => user.id !== managerToDelete.id));
            toast.success('Manager removed');
            setShowDeleteConfirmModal(false);
            setManagerToDelete(null);
        } catch (err) {
            console.error(err);
            toast.error(err instanceof Error ? err.message : 'Failed to remove manager');
        }
    };

    const cancelDelete = () => {
        setShowDeleteConfirmModal(false);
        setManagerToDelete(null);
    };



    const isFormChanged = () => {
        if (!editUser) return true; // For new user, always allow Save

        return (
            formData.name !== editUser.name ||
            formData.email !== editUser.email ||
            formData.password !== editUser.password ||
            previewImage !== editUser.image
        );
    };



    return (
        <section className="w-full p-10">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-black">Manage Store Managers</h1>
                <button
                    onClick={handleAdd}
                    className="bg-[#FFA500] text-white px-6 py-2 rounded-lg font-semibold hover:bg-orange-600 transition"
                >
                    + Add Manager
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                {isLoading ? (
                    <div className="text-center py-8 text-gray-600">Loading managers...</div>
                ) : (
                <table className="min-w-full divide-y divide-gray-50 rounded-lg overflow-hidden">
                    <thead className="bg-[#FFA500]">
                        <tr className="text-white">
                            <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">Profile Picture</th>
                            <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50">
                                <td className="py-4 px-6 flex justify-center">
                                    <Image
                                        src={user.image ?? '/images/profile-placeholder.png'}
                                        alt={user.name}
                                        width={80}
                                        height={80}
                                        className="w-12 h-12 object-cover rounded"
                                        unoptimized
                                    />
                                </td>
                                <td className="py-4 px-6 text-center text-black text-xs">{user.name}</td>
                                <td className="py-4 px-6 text-center text-black text-xs">{user.email}</td>
                                <td className="py-4 px-6 text-center text-black text-xs">{user.role || 'Store Manager'}</td>
                                <td className="p-4 text-center space-x-4">
                                    <button
                                        onClick={() => handleEdit(user)}
                                        className="text-[#FFA500] hover:text-orange-700"
                                        title="Edit"
                                    >
                                        <FiEdit2 className="inline-block text-lg" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(user)}
                                        className="text-red-500 hover:text-red-700"
                                        title="Delete"
                                    >
                                        <FiTrash2 className="inline-block text-lg" />
                                    </button>

                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                )}
            </div>

            {/* ✅ Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">
                                {editUser ? 'Edit Manager' : 'Add New Manager'}
                            </h3>
                            <button
                                className="text-[#ffa500] hover:text-black text-4xl"
                                onClick={() => setShowModal(false)}
                            >
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">

                            {/* 🔁 Replace this 👇 section */}
                            <div className="col-span-2 flex flex-col items-center gap-2">
                                <div
                                    className="relative w-28 h-28 rounded-full border-4 border-[#FFA500] overflow-hidden cursor-pointer group bg-black"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {previewImage ? (
                                        <>
                                            <Image
                                                src={previewImage}
                                                alt="Preview"
                                                fill
                                                className="object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black bg-opacity-80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-sm">
                                                <span className="hover:underline">Change</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex items-center justify-center w-full h-full text-white text-sm font-medium">
                                            Upload
                                        </div>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    ref={fileInputRef}
                                    onChange={handleImageChange}
                                    className="hidden"
                                />

                                {/* 👇 Add this to show text only when adding new user */}
                                {!editUser && previewImage === null && (
                                    <p className="text-sm text-black font-medium mt-2 mb-4">Add Profile Picture</p>
                                )}
                            </div>


                            {/* Full Name */}
                            <div className="col-span-1">
                                <label className="block text-sm font-medium mb-1 text-black">Full Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Full Name"
                                    className="w-full text-sm px-4 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-[2px] font-mono tracking-wider"
                                />
                            </div>

                            {/* Email */}
                            <div className="col-span-1">
                                <label className="block text-sm font-medium mb-1 text-black">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="Email Address"
                                    className="w-full text-sm px-4 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-[2px] font-mono tracking-wider"
                                />
                            </div>

                            {/* Password */}
                            <div className="col-span-2 relative">
                                <label className="block text-sm font-medium mb-1 text-black">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="Enter password"
                                        className="text-sm w-full px-4 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-[2px] font-mono tracking-wider"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? (
                                            // 👁️ Eye Open
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                strokeWidth={1.5}
                                                stroke="#000000"
                                                className="w-5 h-5"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7s-8.268-2.943-9.542-7z"
                                                />
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                                />
                                            </svg>
                                        ) : (
                                            // 🙈 Eye Closed
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                strokeWidth={1.5}
                                                stroke="#000000"
                                                className="w-5 h-5"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M3.98 8.223A10.477 10.477 0 002.458 12c1.274 4.057 5.065 7 9.542 7a9.973 9.973 0 004.51-1.07M6.221 6.221A9.969 9.969 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.47 10.47 0 01-4.21 5.128M6.221 6.221l11.558 11.558M6.221 6.221L4.5 4.5m15 15L19.5 19.5"
                                                />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="col-span-2 flex justify-end gap-4 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-5 py-2 border border-gray-300 rounded"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="bg-[#FFA500] hover:bg-orange-600 text-white px-6 py-2 rounded shadow disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={!isFormChanged() || isSaving}
                                >
                                    {isSaving ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirmModal && managerToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Delete Manager</h3>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to delete <span className="font-semibold">{managerToDelete.name}</span>? This action cannot be undone.
                        </p>
                        
                        <div className="flex justify-end gap-4">
                            <button
                                onClick={cancelDelete}
                                className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50 text-gray-700 font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded font-medium"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default ManageUsers;
