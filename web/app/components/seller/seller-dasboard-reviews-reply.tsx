// ✅ seller-review-modal.tsx - Reusable Reply/Edit Modal Component
'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect } from 'react'
import { FiStar, FiX } from 'react-icons/fi'
import Image from '@/app/components/AppImage'
import { useSession } from 'next-auth/react'
import { ReviewItem } from '@/types'
import { toast } from 'sonner'

interface SellerReplyModalProps {
  isOpen: boolean
  onClose: () => void
  review: ReviewItem | null
  onSuccess: (replyText: string, replyId: string) => void
  initialReply: string
  replyId: string
}

const SellerReplyModal: React.FC<SellerReplyModalProps> = ({
  isOpen,
  onClose,
  review,
  onSuccess,
  initialReply,
  replyId,
}) => {
  const { data: session } = useSession()
  const [reply, setReply] = useState(initialReply || '')
  const [submitting, setSubmitting] = useState(false)
  const API_BASE = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:4001'

  useEffect(() => {
    if (isOpen) {
      setReply(initialReply || '')
    }
  }, [isOpen, initialReply])

  if (!isOpen || !review) return null
  const handleReplySubmit = async () => {
    if (!reply.trim()) {
      toast.error('Reply cannot be empty')
      return
    }

    if (!session) {
      toast.error('Not authenticated')
      return
    }

    setSubmitting(true)
    try {
      const token = (session as any)?.backendToken || (session as any)?.accessToken

      if (!token) {
        toast.error('Authentication required')
        setSubmitting(false)
        return
      }

      // Determine if we're updating or creating
      const isUpdate = !!replyId
      const url = isUpdate 
        ? `${API_BASE}/api/reviews/${review.id}/replies/${replyId}`
        : `${API_BASE}/api/reviews/${review.id}/replies`
      const method = isUpdate ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comment: reply.trim() }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.msg || errorData.message || 'Failed to save reply')
      }

      const data = await response.json()
      const savedReplyId = data.review?.replies?.[data.review.replies.length - 1]?._id || replyId

      onSuccess(reply, savedReplyId)
      onClose()
    } catch (error) {
      console.error('Error submitting reply:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save reply')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-lg w-[90%] max-w-2xl p-6 relative animate-fade-in z-50">
        {/* ✖️ Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-black"
          disabled={submitting}
        >
          <FiX size={20} />
        </button>

        {/* 🧾 Modal Content */}
        <h2 className="text-2xl font-semibold mb-6 text-[#ffa500]">
          {initialReply ? 'Edit Reply' : 'Reply to Review'}
        </h2>

        <div className="space-y-4">
          <div className="text-sm text-black">
            <strong>Reviewer:</strong> {review.reviewerName}
          </div>
          <div className="text-sm text-black">
            <strong>Date:</strong> {review.date}
          </div>

          <div className="text-sm text-black">
            <strong>Product Name:</strong>
          </div>
          <div className="flex items-center space-x-4 mt-[-15px]">
            <Image
              src={review.productImage}
              alt="Product Image"
              width={60}
              height={60}
              className="rounded-md border"
            />
            <div>
              <p className="text-sm font-semibold">{review.productName}</p>
              <p className="text-xs text-gray-500">SKU: P-{review.id}</p>
            </div>
          </div>
          <div className='text-sm text-black flex items-center space-x-1 mt-2'>
            <strong>Ratings:</strong>
            {Array.from({ length: review.rating }).map((_, idx) => (
              <FiStar key={idx} className="text-[#ffa500] text-sm" />
            ))}
          </div>
          <div className="text-sm text-black">
            <strong>Review:</strong> &quot; {review.comment} &quot;
          </div>

          <textarea
            placeholder="Write your reply here..."
            className="w-full mt-4 border border-gray-300 rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#ffa500] disabled:opacity-50"
            rows={4}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            disabled={submitting}
          />

          <button
            onClick={handleReplySubmit}
            disabled={submitting || !reply.trim()}
            className="bg-[#ffa500] text-white px-6 py-2 rounded-md hover:bg-orange-600 transition-all disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Save Reply'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SellerReplyModal
