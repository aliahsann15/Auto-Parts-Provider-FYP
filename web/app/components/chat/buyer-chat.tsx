'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { FiArrowLeft, FiSend, FiImage, FiX } from 'react-icons/fi'
import { toast } from 'sonner'
import { io, Socket } from 'socket.io-client'
import Image from '@/app/components/AppImage'
import { useCart } from '@/app/context/cart-context'

interface ChatMessage {
    _id: string
    requestId: string
    seller: string
    sender: string
    text?: string
    imageUrl?: string
    createdAt: string
    readBy?: string[]
}

interface Props {
    requestId: string
    sellerId: string
    sellerName: string
    token: string
    buyerId: string
    onBack: () => void
    apiBase: string
    onAcceptSuccess?: () => void // Callback after successful acceptance
}

export default function BuyerChat({ requestId, sellerId, sellerName, token, buyerId, onBack, apiBase, onAcceptSuccess }: Props) {
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [messageText, setMessageText] = useState('')
    const [selectedImage, setSelectedImage] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [uploading, setUploading] = useState(false)
    const [offer, setOffer] = useState<{ _id: string; price: number; offerNumber?: string } | null>(null)
    const [accepting, setAccepting] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const socketRef = useRef<Socket | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const { refreshCart, setIsCartOpen } = useCart()

    // const scrollToBottom = () => {
    //     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    // }

    const fetchMessages = useCallback(async () => {
        try {
            setLoading(true)
            const res = await fetch(`${apiBase}/api/chats/${requestId}?sellerId=${sellerId}`, {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
            })
            if (!res.ok) {
                const err = await res.json().catch(() => null)
                throw new Error(err?.msg || 'Failed to fetch messages')
            }
            const data = await res.json()
            setMessages(data?.items || [])
        } catch (err: any) {
            console.error('Error fetching messages:', err)
            toast.error(err?.message || 'Failed to load messages')
        } finally {
            setLoading(false)
        }
    }, [requestId, sellerId, token, apiBase])

    const fetchOffer = useCallback(async () => {
        try {
            const res = await fetch(`${apiBase}/api/offers/request/${requestId}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            })
            if (!res.ok) return
            const data = await res.json()
            const offers = data?.offers || []
            const sellerOffer = offers.find((o: any) => String(o?.seller?._id || o?.seller) === sellerId)
            if (sellerOffer) {
                setOffer({ _id: sellerOffer._id, price: sellerOffer.price, offerNumber: sellerOffer.offerNumber })
            }
        } catch (err) {
            console.error('Error fetching offer:', err)
        }
    }, [apiBase, requestId, sellerId, token])

    const markAsRead = useCallback(async () => {
        try {
            await fetch(`${apiBase}/api/chats/${requestId}/read?sellerId=${sellerId}`, {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
            })
        } catch (err) {
            console.error('Error marking as read:', err)
        }
    }, [requestId, sellerId, token, apiBase])

    useEffect(() => {
        fetchMessages()
        markAsRead()
        fetchOffer()
    }, [fetchMessages, markAsRead, fetchOffer])

    // useEffect(() => {
    //     scrollToBottom()
    // }, [messages])

    useEffect(() => {
        // Setup WebSocket
        const socket = io(apiBase.replace('/api', ''), {
            transports: ['websocket', 'polling'],
            auth: { token },
        })

        socketRef.current = socket

        socket.on('connect', () => {
            console.log('Socket connected')
            socket.emit('join-request', requestId)
        })

        socket.on('chat:new', (newMsg: ChatMessage) => {
            if (newMsg.requestId === requestId && newMsg.seller === sellerId) {
                setMessages((prev) => {
                    const exists = prev.find(m => m._id === newMsg._id)
                    if (exists) return prev
                    return [...prev, newMsg]
                })
                if (newMsg.sender !== buyerId) {
                    markAsRead()
                }
            }
        })

        socket.on('offer:updated', (data: any) => {
            if (data.sellerId === sellerId) {
                setOffer(prev => prev ? { ...prev, price: data.price, message: data.message } : null)
                toast.success('Offer price updated')
            }
        })

        socket.on('disconnect', () => {
            console.log('Socket disconnected')
        })

        return () => {
            socket.emit('leave-request', requestId)
            socket.disconnect()
        }
    }, [requestId, sellerId, token, apiBase, buyerId, markAsRead])

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

    const handleSendMessage = async () => {
        const text = messageText.trim()
        if (!text && !selectedImage) return

        setSending(true)
        setUploading(!!selectedImage)
        try {
            let imageUrl: string | undefined
            
            // Upload image if selected
            if (selectedImage) {
                const formData = new FormData()
                formData.append('image', selectedImage)
                formData.append('folderName', 'chat')
                
                const uploadRes = await fetch(`${apiBase}/api/upload/image`, {
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
            const payload: any = { sellerId }
            if (text) payload.text = text
            if (imageUrl) payload.imageUrl = imageUrl

            console.log('Sending message to:', `${apiBase}/api/chats/${requestId}`, payload);
            const res = await fetch(`${apiBase}/api/chats/${requestId}`, {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            })

            if (!res.ok) {
                const err = await res.json().catch(() => ({ msg: 'Failed to send message' }))
                toast.error(err?.msg || 'Message contains personal information. Please revise and resend.')
                setSending(false)
                setUploading(false)
                return
            }

            const data = await res.json()
            console.log('Message sent successfully:', data?.item);
            const newMsg = data?.item
            if (newMsg) {
                setMessages(prev => {
                    const exists = prev.find(m => m._id === newMsg._id)
                    if (exists) return prev
                    return [...prev, newMsg]
                })
            }
            setMessageText('')
            handleRemoveImage()
            setSending(false)
            setUploading(false)
        } catch (err: any) {
            console.error('Error sending message:', err)
            toast.error(err?.message || 'Failed to send message')
            setSending(false)
            setUploading(false)
        }
    }

    const handleAcceptOffer = async () => {
        if (!offer || accepting) return
        setAccepting(true)
        try {
            const res = await fetch(`${apiBase}/api/offers/${offer._id}/accept`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            })
            if (!res.ok) {
                const err = await res.json().catch(() => null)
                toast.error(err?.msg || 'Failed to accept offer')
                return
            }
            await res.json().catch(() => null)
            toast.success('Offer accepted. Added to cart.')

            // Clear messages locally since backend deletes chat on acceptance
            setMessages([])

            // Refresh cart and open side panel if available
            try {
                await refreshCart()
                setIsCartOpen(true)
            } catch { /* ignore */ }

            // Mark offer consumed
            setOffer(null)

            // Call success callback to navigate back to requests list
            if (onAcceptSuccess) {
                onAcceptSuccess()
            } else {
                onBack()
            }
        } catch (err) {
            console.error('Error accepting offer:', err)
            toast.error('Failed to accept offer')
        } finally {
            setAccepting(false)
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSendMessage()
        }
    }

    return (
        <div className="flex flex-col h-fit bg-white rounded-lg shadow">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b">
                <button
                    onClick={onBack}
                    className="flex items-center text-[#FFA500] hover:underline"
                >
                    <FiArrowLeft className="mr-2" /> Back
                </button>
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-black">Chat with {sellerName}</h3>
                    <p className="text-sm text-gray-600">Request #{requestId.slice(-6)}</p>
                </div>
                <div className="flex items-center gap-3">
                    {offer ? (
                        <>
                            <div className="text-sm text-gray-800 font-semibold">
                                Offer: <span className="text-black">PKR {offer.price.toLocaleString()}</span>
                            </div>
                            <button
                                onClick={handleAcceptOffer}
                                disabled={accepting}
                                className="bg-[#171717] text-white px-3 py-2 rounded text-sm font-semibold hover:bg-zinc-700 disabled:opacity-50"
                            >
                                {accepting ? 'Accepting...' : 'Accept Offer'}
                            </button>
                        </>
                    ) : (
                        <div className="text-sm text-gray-500">No offer available</div>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 min-h-[60vh] max-h-[60vh] overflow-y-auto p-4 space-y-3" style={{ maxHeight: '500px' }}>
                {loading ? (
                    <p className="text-center text-gray-600">Loading messages...</p>
                ) : messages.length === 0 ? (
                    <p className="text-center text-gray-600">No messages yet. Start the conversation!</p>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.sender === buyerId
                        return (
                            <div
                                key={msg._id}
                                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[70%] rounded-lg px-4 py-2 ${isMe
                                        ? 'bg-[#FFA500] text-white'
                                        : 'bg-gray-200 text-black'
                                        }`}
                                >
                                    {msg.imageUrl && (
                                        <Image
                                            src={msg.imageUrl}
                                            alt="attachment"
                                            width={300}
                                            height={200}
                                            className="rounded mb-2 max-w-full"
                                        />)}
                                    {msg.text && <p className="text-sm break-words">{msg.text}</p>}
                                    <p className={`text-xs mt-1 ${isMe ? 'text-orange-100' : 'text-gray-500'}`}>
                                        {new Date(msg.createdAt).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </p>
                                </div>
                            </div>
                        )
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t">
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
                <div className="flex gap-2">
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
                        <FiImage className="text-xl" />
                    </button>
                    <input
                        type="text"
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type a message..."
                        className="flex-1 rounded-full border border-gray-300 px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#ffa500] disabled:bg-gray-100"
                        disabled={sending || uploading}
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={(!messageText.trim() && !selectedImage) || sending || uploading}
                        className="bg-[#ffa500] text-white p-4 rounded-full text-sm font-semibold hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {uploading ? '...' : <FiSend className="text-xl" />}
                    </button>
                </div>
            </div>
        </div>
    )
}
