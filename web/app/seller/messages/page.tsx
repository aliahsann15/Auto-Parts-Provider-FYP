'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useRef, useState } from 'react'
import Image from '@/app/components/AppImage'
import ChatList, { SellerChatItem } from '@/app/components/chat/chat-list'
import { motion, AnimatePresence } from 'framer-motion'
import SellerDashboardAsideChat from '@/app/components/seller/seller-dasboard-aside-chat'
import { FiArrowLeft, FiSend, FiImage, FiX } from 'react-icons/fi'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { io, Socket } from 'socket.io-client'

const MessagesPage = () => {
    const { data: session, status } = useSession();
    const [messageInput, setMessageInput] = useState('')
    const [selectedImage, setSelectedImage] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [uploading, setUploading] = useState(false)
    const [chatThreads, setChatThreads] = useState<SellerChatItem[]>([])
    const [selectedChat, setSelectedChat] = useState<SellerChatItem | null>(null)
    const [messages, setMessages] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [sending, setSending] = useState(false)
    const [offer, setOffer] = useState<{ _id: string; price: number; offerNumber?: string; warranty?: string; returnDays?: number } | null>(null)
    const [updatingOffer, setUpdatingOffer] = useState(false)
    const [showOfferModal, setShowOfferModal] = useState(false)
    const [offerPriceInput, setOfferPriceInput] = useState('')
    const [warrantyInput, setWarrantyInput] = useState('')
    const [returnDaysInput, setReturnDaysInput] = useState('')
    const messageEndRef = useRef<HTMLDivElement>(null)
    const socketRef = useRef<Socket | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:4001').replace(/\/$/, '');
    const token = (session as any)?.backendToken || (session as any)?.accessToken;
    // For StoreManagers, use their assigned sellerId; for Sellers, use their own ID
    const sellerId = (session?.user as any)?.sellerId || (session?.user as any)?._id || (session?.user as any)?.id;

    useEffect(() => {
        if (status === 'authenticated' && token) {
            fetchChatThreads();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, token]);

    const fetchChatThreads = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/chats/threads`, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                console.error('Failed to fetch chat threads:', res.status, errData);
                throw new Error('Failed to fetch chat threads');
            }
            const data = await res.json();
            console.log('Chat threads received:', data?.threads);
            const threads = data?.threads || [];

            const formattedThreads: SellerChatItem[] = threads.map((thread: any) => {
                const displayName = thread.requestName
                    || (thread.requestNumber ? `Request #${thread.requestNumber}` : '')
                    || thread.carName
                    || 'Unknown Request';

                return {
                    id: thread.requestId,
                    name: displayName,
                    avatar: '',
                    message: thread.lastMessage || (thread.lastImageUrl ? 'Sent an image' : 'No messages yet'),
                    time: thread.lastMessageTime ? new Date(thread.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
                    unreadCount: thread.unreadCount || 0,
                    isOnline: false,
                    buyerName: thread.buyerName,
                    requestName: thread.requestName || displayName,
                    requestNumber: thread.requestNumber,
                    carName: thread.carName,
                    companyName: thread.companyName,
                    lastImageUrl: thread.lastImageUrl,
                    lastMessage: thread.lastMessage,
                };
            });

            // Enrich any items that still have Unknown Request by fetching request meta
            const needEnrichment = formattedThreads.filter(t => !t.requestName || t.requestName === 'Unknown Request' || t.requestName === '');
            if (needEnrichment.length > 0) {
                const enriched = await Promise.all(formattedThreads.map(async (t) => {
                    if (t.requestName && t.requestName !== 'Unknown Request' && t.requestName !== '') return t;
                    const meta = await fetchRequestMeta(String(t.id));
                    if (!meta) return t;
                    const enrichedName = meta.partName || meta.carName || t.name || 'Request';
                    return { ...t, requestName: enrichedName, name: enrichedName, requestNumber: meta.requestNumber, carName: meta.carName, companyName: meta.companyName };
                }));
                setChatThreads(enriched);
            } else {
                setChatThreads(formattedThreads);
            }
        } catch (err) {
            console.error('Error fetching chat threads:', err);
            toast.error('Failed to load chats');
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (requestId: string) => {
        try {
            console.log('Fetching messages for requestId:', requestId);
            const res = await fetch(`${API_BASE}/api/chats/${requestId}`, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                console.error('Failed to fetch messages:', res.status, errData);
                throw new Error('Failed to fetch messages');
            }
            const data = await res.json();
            console.log('Messages received:', data?.items);
            setMessages(data?.items || []);
        } catch (err) {
            console.error('Error fetching messages:', err);
            toast.error('Failed to load messages');
        }
    };

    const fetchRequestMeta = async (requestId: string) => {
        try {
            const res = await fetch(`${API_BASE}/api/parts-requests/${requestId}`, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                console.error('Failed to fetch request meta:', res.status, errData);
                return null;
            }
            const data = await res.json();
            return data?.item || null;
        } catch (err) {
            console.error('Error fetching request meta:', err);
            return null;
        }
    };

    const markAsRead = async (requestId: string) => {
        try {
            // Managers must pass sellerId; sellers can omit
            const isManager = String((session?.user as any)?.role).toLowerCase() === 'storemanager'
            const url = isManager
                ? `${API_BASE}/api/chats/${requestId}/read?sellerId=${sellerId}`
                : `${API_BASE}/api/chats/${requestId}/read`
            await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });
        } catch (err) {
            console.error('Error marking as read:', err);
        }
    };

    useEffect(() => {
        if (messageEndRef.current) {
            messageEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages]);

    useEffect(() => {
        if (!selectedChat?.id) return;

        // Setup WebSocket
        const socket = io(API_BASE.replace('/api', ''), {
            transports: ['websocket', 'polling'],
            auth: { token },
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Socket connected');
            socket.emit('join-request', selectedChat.id);
        });

        socket.on('chat:new', (newMsg: any) => {
            if (newMsg.requestId === selectedChat.id) {
                setMessages(prev => {
                    const exists = prev.find(m => m._id === newMsg._id);
                    if (exists) return prev;
                    return [...prev, newMsg];
                });
                // Mark as read if seller is viewing
                if (newMsg.sender !== sellerId) {
                    markAsRead(String(selectedChat.id));
                }
            }
        });

        socket.on('offer:accepted', (data: any) => {
            // When buyer accepts an offer, check if it's this seller's accepted offer
            if (data.sellerId && String(data.sellerId) === String(sellerId) && data.requestId === selectedChat.id) {
                toast.success('Buyer has Accepted your offer and will place order soon. The Request is closed.', {
                    duration: 5000,
                })
                // Remove this chat thread from list
                setChatThreads((prev) => prev.filter(t => String(t.id) !== String(data.requestId)))
                // Clear selected chat and messages
                setSelectedChat(null)
                setMessages([])
            }
        });

        return () => {
            socket.emit('leave-request', selectedChat.id);
            socket.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedChat?.id, sellerId, token, API_BASE]);

    const handleSelectChat = async (item: SellerChatItem) => {
        setSelectedChat(item)
        await fetchMessages(String(item.id));
        await markAsRead(String(item.id));
        // Fetch offer for this request and seller
        try {
            const res = await fetch(`${API_BASE}/api/offers/request/${item.id}`, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            })
            if (res.ok) {
                const data = await res.json()
                const offers = data?.offers || []
                const mine = offers.find((o: any) => String(o?.seller?._id || o?.seller) === String(sellerId))
                if (mine) {
                    setOffer({ _id: mine._id, price: mine.price, offerNumber: mine.offerNumber })
                } else {
                    setOffer(null)
                }
            }
        } catch (err) {
            console.error('Error fetching offer:', err)
        }

        // If request details are missing, fetch the request to enrich header
        if (!item.requestName || item.requestName === 'Unknown Request' || item.requestName === '') {
            const meta = await fetchRequestMeta(String(item.id));
            if (meta) {
                const enrichedName = meta.partName || meta.carName || item.name || 'Request';
                const enrichedRequestNumber = meta.requestNumber;
                const enrichedCarName = meta.companyName + " " + meta.carName;
                setSelectedChat((prev) => prev ? {
                    ...prev,
                    requestName: enrichedName,
                    name: enrichedName,
                    requestNumber: enrichedRequestNumber,
                    carName: enrichedCarName,
                } : prev);
            }
        }

        // Update unread count locally
        setChatThreads((prev) =>
            prev.map(chat =>
                chat.id === item.id ? { ...chat, unreadCount: 0 } : chat
            )
        );
    }

    const handleUpdateOffer = async () => {
        if (!selectedChat) return;
        setOfferPriceInput(offer?.price ? String(offer.price) : '')
        setWarrantyInput(offer?.warranty || '')
        setReturnDaysInput(offer?.returnDays !== undefined ? String(offer.returnDays) : '')
        setShowOfferModal(true)
    }

    const handleSubmitOffer = async () => {
        if (!selectedChat) return;
        const priceNum = Number(offerPriceInput)
        if (Number.isNaN(priceNum) || priceNum <= 0) {
            toast.error('Please enter a valid price')
            return
        }

        setUpdatingOffer(true)
        try {
            if (offer) {
                const returnDaysNum = returnDaysInput.trim() ? Number(returnDaysInput) : undefined;
                if (returnDaysNum !== undefined && (Number.isNaN(returnDaysNum) || returnDaysNum < 0)) {
                    toast.error('Return days must be a non-negative number');
                    return;
                }
                const res = await fetch(`${API_BASE}/api/offers/${offer._id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        price: priceNum,
                        warranty: warrantyInput.trim() || undefined,
                        returnDays: returnDaysNum
                    }),
                })
                if (!res.ok) {
                    const err = await res.json().catch(() => null)
                    toast.error(err?.msg || 'Failed to update offer')
                    return
                }
                const data = await res.json()
                setOffer({
                    _id: data?.offer?._id || offer._id,
                    price: data?.offer?.price ?? priceNum,
                    offerNumber: data?.offer?.offerNumber,
                    warranty: data?.offer?.warranty,
                    returnDays: data?.offer?.returnDays
                })
                toast.success('Offer updated')
            } else {
                const returnDaysNum = returnDaysInput.trim() ? Number(returnDaysInput) : undefined;
                if (returnDaysNum !== undefined && (Number.isNaN(returnDaysNum) || returnDaysNum < 0)) {
                    toast.error('Return days must be a non-negative number');
                    return;
                }
                const res = await fetch(`${API_BASE}/api/offers`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        price: priceNum,
                        requestId: selectedChat.id,
                        warranty: warrantyInput.trim() || undefined,
                        returnDays: returnDaysNum
                    }),
                })
                if (!res.ok) {
                    const err = await res.json().catch(() => null)
                    toast.error(err?.msg || 'Failed to create offer')
                    return
                }
                const data = await res.json()
                const created = data?.offer
                if (created) {
                    setOffer({
                        _id: created._id,
                        price: created.price,
                        offerNumber: created.offerNumber,
                        warranty: created.warranty,
                        returnDays: created.returnDays
                    })
                }
                toast.success('Offer created')
            }
            setShowOfferModal(false)
            setOfferPriceInput('')
            setWarrantyInput('')
            setReturnDaysInput('')
        } catch (err) {
            console.error('Update offer error:', err)
            toast.error('Failed to update offer')
        } finally {
            setUpdatingOffer(false)
        }
    }

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file')
            return
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast.error('Image size should be less than 5MB')
            return
        }

        setSelectedImage(file)
        const reader = new FileReader()
        reader.onload = () => setImagePreview(reader.result as string)
        reader.readAsDataURL(file)
    }

    const handleRemoveImage = () => {
        setSelectedImage(null)
        setImagePreview(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleSend = async () => {
        if ((!messageInput.trim() && !selectedImage) || !selectedChat) return;

        setSending(true);
        setUploading(!!selectedImage);
        try {
            let imageUrl: string | undefined

            // Upload image if selected
            if (selectedImage) {
                const formData = new FormData()
                formData.append('image', selectedImage)
                formData.append('folderName', 'chat')

                const uploadRes = await fetch(`${API_BASE}/api/upload/image`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                    body: formData,
                })

                if (!uploadRes.ok) {
                    throw new Error('Failed to upload image')
                }

                const uploadData = await uploadRes.json()
                imageUrl = uploadData?.url || uploadData?.imageUrl
            }

            // Send message with optional image
            const payload: any = {}
            if (messageInput.trim()) payload.text = messageInput.trim()
            if (imageUrl) payload.imageUrl = imageUrl

            const res = await fetch(`${API_BASE}/api/chats/${selectedChat.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ msg: 'Failed to send message' }));
                toast.error(err?.msg || 'Message contains personal information. Please revise and resend.');
                setSending(false);
                setUploading(false);
                return;
            }

            const data = await res.json();
            const newMsg = data?.item;
            if (newMsg) {
                setMessages(prev => {
                    const exists = prev.find(m => m._id === newMsg._id);
                    if (exists) return prev;
                    return [...prev, newMsg];
                });
            }
            setMessageInput('');
            handleRemoveImage();
            setSending(false);
            setUploading(false);
        } catch (err) {
            console.error('Error sending message:', err);
            toast.error('Failed to send message');
            setSending(false);
            setUploading(false);
        }
    };

    const handleBack = () => {
        setSelectedChat(null);
        setMessages([]);
    }

    if (status !== 'authenticated') {
        return <div className="flex h-[90vh] items-center justify-center">Loading...</div>;
    }

    return (
        <div className="flex h-[90vh] bg-white rounded-xl shadow-md overflow-hidden">
            <SellerDashboardAsideChat />

            {/* 📬 Left: Chat List Section */}
            <div className="w-[30%] border-r border-gray-200 p-4 flex flex-col">
                <h1 className="text-2xl font-bold text-black mb-4">
                    Messages
                </h1>
                {loading ? (
                    <div className="flex justify-center items-center h-full">
                        <p>Loading chats...</p>
                    </div>
                ) : (
                    <ChatList
                        items={chatThreads}
                        onSelect={handleSelectChat}
                        activeChatId={selectedChat?.id || null}
                        maxHeight="max-h-[calc(90vh-120px)]"
                        showRequestDetails={true}
                    />
                )}
            </div>

            {/* 💬 Right: Chat Box Section */}
            <AnimatePresence mode="wait">
                {selectedChat ? (
                    <motion.div
                        key={selectedChat.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="w-[70%] flex flex-col justify-between p-4 bg-gray-50"
                    >
                        {/* 👤 Chat Header */}
                        <div className="flex items-center justify-between border-b border-gray-300 pb-4 pr-2">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleBack}
                                    className="lg:hidden mr-2 p-1 hover:bg-gray-200 rounded-lg"
                                >
                                    <FiArrowLeft size={20} />
                                </button>
                                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                                    <span className="text-lg font-semibold text-gray-700">
                                        {selectedChat.requestName?.charAt(0) || 'R'}
                                    </span>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900">
                                        {selectedChat.requestName || selectedChat.name}
                                        {selectedChat.carName && selectedChat.companyName && ` - ${selectedChat.companyName} ${selectedChat.carName}`}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {selectedChat.requestNumber ? `Request #${selectedChat.requestNumber}` : ''}
                                        {selectedChat.buyerName && selectedChat.requestNumber ? ' • ' : ''}
                                        {selectedChat.buyerName ? `Buyer: ${selectedChat.buyerName}` : ''}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                {offer ? (
                                    <div className="text-sm font-semibold text-gray-800">
                                        Offer: <span className="text-black">PKR {offer.price.toLocaleString()}</span>
                                    </div>
                                ) : (
                                    <div className="text-sm text-gray-500">No offer yet</div>
                                )}
                                <button
                                    onClick={handleUpdateOffer}
                                    disabled={updatingOffer}
                                    className="bg-[#171717] text-white px-3 py-2 rounded text-sm font-semibold hover:bg-zinc-700 disabled:opacity-50"
                                >
                                    {updatingOffer ? 'Updating...' : 'Update Price'}
                                </button>
                            </div>
                        </div>

                        {/* 💬 Chat Messages Area */}
                        <div className="flex-1 overflow-y-auto py-4 space-y-3">
                            {messages.map((msg) => {
                                const isSeller = msg.sender === sellerId;
                                return (
                                    <div
                                        key={msg._id}
                                        className={`flex items-end gap-2 ${isSeller ? 'justify-end' : 'justify-start'}`}
                                    >
                                        {!isSeller && (
                                            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                                                <span className="text-xs font-semibold text-gray-700">
                                                    {selectedChat.buyerName?.charAt(0) || 'B'}
                                                </span>
                                            </div>
                                        )}

                                        <div
                                            className={`px-4 py-2 max-w-[70%] rounded-xl text-sm ${isSeller
                                                ? 'bg-[#ffa500] text-white rounded-br-none'
                                                : 'bg-gray-200 text-black rounded-bl-none'
                                                }`}
                                        >
                                            {msg.imageUrl && (
                                                <Image
                                                    src={msg.imageUrl}
                                                    alt="attachment"
                                                    width={300}
                                                    height={200}
                                                    className="rounded mb-2 max-w-full"
                                                />
                                            )}
                                            {msg.text && msg.text}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messageEndRef} />
                        </div>

                        {/* 📨 Message Input Box */}
                        <div className="mt-4 border-t border-gray-300 pt-6 pb-4">
                            {/* Image Preview */}
                            {imagePreview && (
                                <div className="mb-3 relative inline-block">
                                    <Image
                                        src={imagePreview}
                                        alt="Preview"
                                        width={150}
                                        height={150}
                                        className="rounded-lg border border-gray-300"
                                    />
                                    <button
                                        onClick={handleRemoveImage}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                    >
                                        <FiX size={16} />
                                    </button>
                                </div>
                            )}
                            <div className="flex items-center gap-3">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleImageSelect}
                                    accept="image/*"
                                    className="hidden"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={sending || uploading}
                                    className="bg-gray-200 text-gray-700 p-4 rounded-full hover:bg-gray-300 transition disabled:opacity-50"
                                    title="Attach image"
                                >
                                    <FiImage size={20} />
                                </button>
                                <input
                                    type="text"
                                    placeholder="Type a message..."
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !sending && !uploading && handleSend()}
                                    disabled={sending || uploading}
                                    className="flex-1 rounded-full border border-gray-300 px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#ffa500] disabled:bg-gray-100"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={(!messageInput.trim() && !selectedImage) || sending || uploading}
                                    className="bg-[#ffa500] text-white p-4 rounded-full text-sm font-semibold hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {uploading ? (
                                        <div className="animate-spin">⏳</div>
                                    ) : (
                                        <FiSend size={20} />
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    // Empty state when no chat is selected
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="w-[70%] flex flex-col items-center justify-center bg-gray-50 text-gray-500"
                    >
                        <svg
                            width="80"
                            height="80"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            className="mb-4 text-gray-300"
                        >
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <h3 className="text-xl font-semibold mb-2">Select a chat to start messaging</h3>
                        <p className="text-center max-w-md">
                            Choose a conversation from the list to view and reply to messages
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Update Offer Modal */}
            {showOfferModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg p-6 w-96">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">
                            {offer ? 'Update Offer Price' : 'Create New Offer'}
                        </h2>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Price (PKR)
                            </label>
                            <input
                                type="number"
                                value={offerPriceInput}
                                onChange={(e) => setOfferPriceInput(e.target.value)}
                                placeholder="Enter price in PKR"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffa500]"
                                autoFocus
                                disabled={updatingOffer}
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Warranty (optional)
                            </label>
                            <input
                                type="text"
                                value={warrantyInput}
                                onChange={(e) => setWarrantyInput(e.target.value)}
                                placeholder="e.g., 1 year warranty"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffa500]"
                                disabled={updatingOffer}
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Return Days (optional)
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={returnDaysInput}
                                onChange={(e) => setReturnDaysInput(e.target.value)}
                                placeholder="Number of days for returns"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffa500]"
                                disabled={updatingOffer}
                            />
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    setShowOfferModal(false)
                                    setOfferPriceInput('')
                                    setWarrantyInput('')
                                    setReturnDaysInput('')
                                }}
                                disabled={updatingOffer}
                                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitOffer}
                                disabled={updatingOffer || !offerPriceInput.trim()}
                                className="px-4 py-2 text-white bg-[#ffa500] rounded-lg hover:bg-orange-500 disabled:opacity-50"
                            >
                                {updatingOffer ? 'Updating...' : (offer ? 'Update' : 'Create')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default MessagesPage
