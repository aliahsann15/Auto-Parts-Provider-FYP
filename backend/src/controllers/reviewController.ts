// controllers/reviewController.ts

import { Request, RequestHandler, Response } from 'express';
import { Types } from 'mongoose';
import Review, { IReview } from '../models/Review';
import { createNotification } from '../utils/notificationService';
import Product from '../models/Product';
import User from '../models/User';
import { AuthRequest } from '../middleware/authMiddleware';
import ProductModel from '../models/Product';
import { getEffectiveSellerId } from '../utils/sellerHelper';

// helper to validate a string as a Mongo ObjectId
const isValidObjectId = (id?: string): id is string =>
  typeof id === 'string' && Types.ObjectId.isValid(id);

async function recalcProductRatings(productId: string) {
  const stats = await Review.aggregate([
    { $match: { product: new Types.ObjectId(productId) } },
    { $group: { _id: '$product', avg: { $avg: '$rating' }, total: { $sum: 1 } } }
  ]);
  const avg = stats[0]?.avg || 0;
  const total = stats[0]?.total || 0;
  await Product.findByIdAndUpdate(productId, { averageRating: avg, totalReviews: total });
  return { averageRating: avg, totalReviews: total };
}

/**
 * @desc    Create a new review
 * @route   POST /api/reviews
 * @access  Private
 */
export const createReview: RequestHandler = async (req: AuthRequest, res: Response, next) => {
  try {
    const { product, rating, comment } = req.body;
    if (!product || !isValidObjectId(product) || !rating) {
      res.status(400).json({ message: "Missing or invalid product or rating" });
      return;
    }
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const newReview = await Review.create({
      product,
      user: userId,
      rating: Number(rating),
      comment: comment?.trim() || '',
    } as any);

    const populated = await Review.findById(newReview._id)
      .populate('user', 'name email profileImage')
      .populate('replies.user', 'name profileImage')
      .populate('replies.seller', 'name profileImage')
      .lean();

    const ratings = await recalcProductRatings(product);

    res.status(201).json({ success: true, review: populated, ratings });
  } catch (err: any) {
    next(err);
  }
};

/**
 * @desc    Get all reviews (optionally by product)
 * @route   GET /api/reviews
 * @access  Public
 */
export const getReviews = async (req: Request, res: Response) => {
  try {
    const filter: any = {};
    if (req.query.product && isValidObjectId(String(req.query.product))) {
      filter.product = String(req.query.product);
    }

    const reviews = await Review.find(filter)
      .populate('user', 'name email profileImage')
      .populate('replies.user', 'name profileImage')
      .populate('replies.seller', 'name profileImage')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ reviews });
  } catch (err) {
    console.error('Error in getReviews:', err);
    res.status(500).json({ msg: 'Server error', error: err });
  }
};

/**
 * @desc    Get reviews for products owned by the seller
 * @route   GET /api/reviews/seller
 * @access  Private (Seller)
 */
export const getSellerReviews = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sellerId = getEffectiveSellerId(req);
    if (!sellerId) {
      res.status(401).json({ msg: 'Not authenticated' });
      return;
    }

    // Find all product IDs belonging to this seller
    const sellerProducts = await ProductModel.find({ seller: sellerId }).select('_id').lean();
    const productIds = sellerProducts.map(p => p._id);
    if (!productIds.length) {
      res.json({ reviews: [] });
      return;
    }

    const reviews = await Review.find({ product: { $in: productIds } })
      .populate('user', 'name email profileImage')
      .populate('product')
      .populate('replies.user', 'name profileImage')
      .populate('replies.seller', 'name profileImage')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ reviews });
  } catch (err) {
    console.error('Error in getSellerReviews:', err);
    res.status(500).json({ msg: 'Server error', error: err });
  }
};

/**
 * @desc    Get a single review
 * @route   GET /api/reviews/:id
 * @access  Public
 */
export const getReview = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ msg: 'Invalid review id' });
    }

    const review = await Review.findById(id).lean();
    if (!review) {
      return res.status(404).json({ msg: 'Review not found' });
    }

    res.json({ review });
  } catch (err) {
    console.error('Error in getReview:', err);
    res.status(500).json({ msg: 'Server error', error: err });
  }
};

/**
 * @desc    Update a review
 * @route   PUT /api/reviews/:id
 * @access  Private (owner or admin)
 */
export const updateReview = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ msg: 'Not authenticated' });
    }

    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ msg: 'Invalid review id' });
    }

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ msg: 'Review not found' });
    }

    // only the owner (or an admin) can update
    if (String(review.user) !== req.user.userId) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    const { rating, comment } = req.body;
    if (rating !== undefined) review.rating = Number(rating);
    if (comment !== undefined) review.comment = comment.trim();

    await review.save();
    await recalcProductRatings(String(review.product));
    res.json({ review });
  } catch (err) {
    console.error('Error in updateReview:', err);
    res.status(500).json({ msg: 'Server error', error: err });
  }
};

/**
 * @desc    Delete a review
 * @route   DELETE /api/reviews/:id
 * @access  Private (owner or admin)
 */
export const deleteReview = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ msg: 'Not authenticated' });
    }

    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ msg: 'Invalid review id' });
    }

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ msg: 'Review not found' });
    }

    // Allow owner of review OR seller owning the product
    const isOwner = String(review.user) === req.user.userId;
    const product = await ProductModel.findById(review.product).lean();
    const isSeller = product && String(product.seller) === req.user.userId;
    if (!isOwner && !isSeller) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    await review.deleteOne();
    await recalcProductRatings(String(review.product));
    res.json({ msg: 'Review deleted' });
  } catch (err) {
    console.error('Error in deleteReview:', err);
    res.status(500).json({ msg: 'Server error', error: err });
  }
};

/**
 * @desc    Add a seller reply to a review
 * @route   POST /api/reviews/:id/replies
 * @access  Private (Seller on their product)
 */
export const addSellerReply = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sellerId = req.user?.userId;
    if (!sellerId) {
      res.status(401).json({ msg: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    const { comment } = req.body;
    if (!isValidObjectId(id)) {
      res.status(400).json({ msg: 'Invalid review id' });
      return;
    }
    if (!comment || !comment.trim()) {
      res.status(400).json({ msg: 'Reply comment is required' });
      return;
    }

    const review = await Review.findById(id).populate('product');
    if (!review) {
      res.status(404).json({ msg: 'Review not found' });
      return;
    }

    // Ensure seller owns the product
    const product = review.product as any;
    if (String(product?.seller) !== sellerId) {
      res.status(403).json({ msg: 'Not authorized to reply to this review' });
      return;
    }

    review.replies = review.replies || [];
    review.replies.push({
      seller: new Types.ObjectId(sellerId),
      comment: comment.trim(),
      createdAt: new Date(),
    } as any);
    await review.save();

    const populated = await Review.findById(id)
      .populate('user', 'name email profileImage')
      .populate('product')
      .populate('replies.user', 'name profileImage')
      .populate('replies.seller', 'name profileImage')
      .lean();

    res.json({ review: populated });
  } catch (err) {
    console.error('Error in addSellerReply:', err);
    res.status(500).json({ msg: 'Server error', error: err });
  }
};

/**
 * @desc    Update seller reply
 * @route   PUT /api/reviews/:id/replies/:replyId
 * @access  Private (Seller who wrote the reply)
 */
export const updateSellerReply = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sellerId = req.user?.userId;
    if (!sellerId) {
      res.status(401).json({ msg: 'Not authenticated' });
      return;
    }
    const { id, replyId } = req.params;
    const { comment } = req.body;
    if (!isValidObjectId(id) || !isValidObjectId(replyId)) {
      res.status(400).json({ msg: 'Invalid id' });
      return;
    }
    if (!comment || !comment.trim()) {
      res.status(400).json({ msg: 'Reply comment is required' });
      return;
    }

    const review = await Review.findById(id).populate('product');
    if (!review) {
      res.status(404).json({ msg: 'Review not found' });
      return;
    }

    const product = review.product as any;
    if (String(product?.seller) !== sellerId) {
      res.status(403).json({ msg: 'Not authorized' });
      return;
    }

    const replies = review.replies || [];
    const reply = replies.find(r => String((r as any)._id) === replyId);
    if (!reply) {
      res.status(404).json({ msg: 'Reply not found' });
      return;
    }
    if (String((reply as any).seller) !== sellerId) {
      res.status(403).json({ msg: 'Not authorized to edit this reply' });
      return;
    }
    (reply as any).comment = comment.trim();
    await review.save();

    const populated = await Review.findById(id)
      .populate('user', 'name email profileImage')
      .populate('product')
      .populate('replies.user', 'name profileImage')
      .populate('replies.seller', 'name profileImage')
      .lean();

    res.json({ review: populated });
  } catch (err) {
    console.error('Error in updateSellerReply:', err);
    res.status(500).json({ msg: 'Server error', error: err });
  }
};

/**
 * @desc    Delete seller reply
 * @route   DELETE /api/reviews/:id/replies/:replyId
 * @access  Private (Seller who wrote the reply)
 */
export const deleteSellerReply = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sellerId = req.user?.userId;
    if (!sellerId) {
      res.status(401).json({ msg: 'Not authenticated' });
      return;
    }
    const { id, replyId } = req.params;
    if (!isValidObjectId(id) || !isValidObjectId(replyId)) {
      res.status(400).json({ msg: 'Invalid id' });
      return;
    }

    const review = await Review.findById(id).populate('product');
    if (!review) {
      res.status(404).json({ msg: 'Review not found' });
      return;
    }
    const product = review.product as any;
    if (String(product?.seller) !== sellerId) {
      res.status(403).json({ msg: 'Not authorized' });
      return;
    }

    const replies = review.replies || [];
    const targetIdx = replies.findIndex(r => String((r as any)._id) === replyId);
    if (targetIdx === -1) {
      res.status(404).json({ msg: 'Reply not found' });
      return;
    }
    const reply = replies[targetIdx] as any;
    if (String(reply.seller) !== sellerId) {
      res.status(403).json({ msg: 'Not authorized to delete this reply' });
      return;
    }
    replies.splice(targetIdx, 1);
    review.replies = replies;
    await review.save();

    const populated = await Review.findById(id)
      .populate('user', 'name email profileImage')
      .populate('product')
      .populate('replies.user', 'name profileImage')
      .populate('replies.seller', 'name profileImage')
      .lean();

    res.json({ review: populated });
  } catch (err) {
    console.error('Error in deleteSellerReply:', err);
    res.status(500).json({ msg: 'Server error', error: err });
  }
};
