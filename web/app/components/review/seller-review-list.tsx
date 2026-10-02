// ✅ seller-review-list.tsx - Fetches and displays seller's product reviews from database
'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { FiStar, FiTrash2 } from 'react-icons/fi'
import SellerReplyModal from '../seller/seller-dasboard-reviews-reply'
import { ReviewItem } from '@/types'
import { toast } from 'sonner'
import Spinner from '../global/spinner'

interface Props {
  tabView?: boolean
}

const SellerReviewlist = (props: Props) => {
  const { data: session } = useSession()
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedReview, setSelectedReview] = useState<ReviewItem | null>(null)
  const [replies, setReplies] = useState<{ [key: string]: { comment: string; replyId: string } }>({})
  const TabView = props.tabView || false
  const API_BASE = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:4001'

  useEffect(() => {
    const fetchSellerReviews = async () => {
      if (!session) return

      setIsLoading(true)
      try {
        const token = (session as any)?.backendToken || (session as any)?.accessToken

        if (!token) {
          toast.error('Authentication required')
          setIsLoading(false)
          return
        }

        const response = await fetch(`${API_BASE}/api/reviews/seller`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error('Failed to fetch reviews')
        }

        const data = await response.json()
        
        // Transform backend reviews to ReviewItem format
        const transformedReviews: ReviewItem[] = data.reviews.map((review: any) => ({
          id: review._id,
          reviewerName: review.user?.name || 'Anonymous',
          date: new Date(review.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }),
          productName: review.product?.name || 'Unknown Product',
          productImage: review.product?.images?.[0] || '',
          rating: review.rating,
          comment: review.comment || '',
        }))

        if (TabView) {
          setReviews(transformedReviews)
        }
        else {
          setReviews(transformedReviews.slice(0, 5))
        }

        
        // Load existing replies if any, track comment + replyId
        const existingReplies: { [key: string]: { comment: string; replyId: string } } = {}
        data.reviews.forEach((review: any) => {
          if (review.replies?.[0]?.comment) {
            existingReplies[review._id] = {
              comment: review.replies[0].comment,
              replyId: review.replies[0]._id || ''
            }
          }
        })
        setReplies(existingReplies)
        
      } catch (error) {
        console.error('Error fetching seller reviews:', error)
        toast.error('Failed to load reviews')
      } finally {
        setIsLoading(false)
      }
    }

    fetchSellerReviews()
  }, [session, API_BASE, TabView])

  const handleReplyClick = (review: ReviewItem) => {
    setSelectedReview(review)
    setIsModalOpen(true)
  }

  const handleReplySuccess = (replyText: string, replyId: string) => {
    if (selectedReview) {
      setReplies((prev) => ({ 
        ...prev, 
        [selectedReview.id]: { comment: replyText, replyId } 
      }))
      toast.success('Reply saved successfully')
    }
    setIsModalOpen(false)
    setSelectedReview(null)
  }

  const handleDeleteReply = async (reviewId: string, replyId: string) => {
    if (!session) {
      toast.error('Not authenticated')
      return
    }

    const token = (session as any)?.backendToken || (session as any)?.accessToken
    if (!token) {
      toast.error('Authentication required')
      return
    }

    try {
      const response = await fetch(`${API_BASE}/api/reviews/${reviewId}/replies/${replyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete reply')
      }

      setReplies((prev) => {
        const updated = { ...prev }
        delete updated[reviewId]
        return updated
      })
      toast.success('Reply deleted successfully')
    } catch (error) {
      console.error('Error deleting reply:', error)
      toast.error('Failed to delete reply')
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Spinner />
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No reviews yet</p>
      </div>
    )
  }

  return (
    <>
      <div className={`relative ${TabView ? 'w-full overflow-x-auto' : 'overflow-y-auto max-h-[400px]'}`}>
        <table className={`${TabView ? 'w-full table-fixed' : 'min-w-full'} rounded-lg divide-y divide-gray-200 overflow-hidden`}>
          <thead className="bg-[#ffa500]">
            <tr>
              <th className={`${TabView ? 'w-[16%]' : 'w-auto'} px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider first:rounded-tl-lg`}>Reviewer</th>
              <th className={`${TabView ? 'w-[11%]' : 'w-auto'} px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider`}>Date</th>
              <th className={`${TabView ? 'w-[27%]' : 'w-auto'} px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider`}>Product</th>
              <th className={`${TabView ? 'w-[10%]' : 'w-auto'} px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider`}>Rating</th>
              <th className={`${TabView ? 'w-[25%]' : 'w-auto'} px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider`}>Comment</th>
              <th className={`${TabView ? 'w-[10%]' : 'w-auto'} px-4 py-3 text-right text-xs font-medium text-white uppercase tracking-wider last:rounded-tr-lg`}>Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reviews.map((review) => (
              <tr key={review.id}>
                <td className={`px-4 py-4 text-xs text-black ${TabView ? 'text-wrap' : 'whitespace-nowrap'}`}>{review.reviewerName}</td>
                <td className={`px-4 py-4 text-xs text-black ${TabView ? 'truncate' : 'whitespace-nowrap'}`}>{review.date}</td>
                <td className={`px-4 py-4 text-xs text-black ${TabView ? 'text-wrap' : 'whitespace-nowrap'}`}>{review.productName}</td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center justify-center space-x-1">
                    {Array.from({ length: review.rating }).map((_, idx) => (
                      <FiStar key={idx} className="text-[#ffa500] text-sm fill-current" />
                    ))}
                  </div>
                </td>
                <td className={`px-4 py-4 text-xs text-black ${TabView ? '' : 'max-w-xl'}`}>
                  <p className="line-clamp-2">{review.comment}</p>
                  {replies[review.id] && (
                    <div className="mt-2 bg-gray-50 p-2 rounded flex justify-between items-start">
                      <div>
                        <strong className="text-[#ffa500]">Your reply:</strong> {replies[review.id].comment}
                      </div>
                      <button
                        onClick={() => handleDeleteReply(review.id, replies[review.id].replyId)}
                        className="text-red-600 hover:text-red-800 ml-2"
                        title="Delete reply"
                      >
                      <FiTrash2 size={16} />
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-xs font-medium">
                  <button
                    onClick={() => handleReplyClick(review)}
                    className="text-[#FFA500] hover:underline"
                  >
                    {replies[review.id] ? 'Edit' : 'Reply'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SellerReplyModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedReview(null)
        }}
        review={selectedReview}
        onSuccess={handleReplySuccess}
        initialReply={selectedReview ? replies[selectedReview.id]?.comment || '' : ''}
        replyId={selectedReview ? replies[selectedReview.id]?.replyId || '' : ''}
      />
    </>
  )
}

export default SellerReviewlist