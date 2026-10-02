import { apiRequest } from './client';

export type Review = {
  _id: string;
  product: string;
  user?: {
    _id?: string;
    name?: string;
    email?: string;
    profileImage?: string;
  } | string;
  rating: number;
  comment?: string;
  createdAt?: string;
  replies?: Array<{
    _id?: string;
    comment: string;
    createdAt?: string;
    user?: { _id?: string; name?: string; profileImage?: string };
    seller?: { _id?: string; name?: string; profileImage?: string };
  }>;
};

export function fetchReviews(productId: string) {
  const qs = productId ? `?product=${productId}` : '';
  return apiRequest<{ reviews: Review[] }>(`/reviews${qs}`);
}

export function createReview(payload: { product: string; rating: number; comment?: string }, token: string) {
  return apiRequest<{ success?: boolean; review: Review; ratings?: { averageRating: number; totalReviews: number } }>('/reviews', {
    method: 'POST',
    body: payload,
    token,
  });
}

export function fetchSellerReviews(token: string) {
  return apiRequest<{ reviews: Review[] }>('/reviews/seller', { token });
}

export function deleteReview(id: string, token: string) {
  return apiRequest<{ msg: string }>(`/reviews/${id}`, { method: 'DELETE', token });
}

export function addReply(reviewId: string, comment: string, token: string) {
  return apiRequest<{ review: Review }>(`/reviews/${reviewId}/replies`, {
    method: 'POST',
    body: { comment },
    token,
  });
}

export function updateReply(reviewId: string, replyId: string, comment: string, token: string) {
  return apiRequest<{ review: Review }>(`/reviews/${reviewId}/replies/${replyId}`, {
    method: 'PUT',
    body: { comment },
    token,
  });
}

export function deleteReply(reviewId: string, replyId: string, token: string) {
  return apiRequest<{ review: Review }>(`/reviews/${reviewId}/replies/${replyId}`, {
    method: 'DELETE',
    token,
  });
}
