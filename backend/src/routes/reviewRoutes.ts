import express, { RequestHandler } from 'express';
import {
  createReview,
  getReviews,
  getReview,
  updateReview,
  deleteReview,
  getSellerReviews,
  addSellerReply,
  updateSellerReply,
  deleteSellerReply,
} from '../controllers/reviewController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// ─── Public Endpoints ───────────────────────────────────────────────────────────
// List all reviews, optionally filter by ?product=<id>
router.get('/', getReviews as RequestHandler);

// ─── Protected Endpoints ─────────────────────────────────────────────────────────
// All routes below require a valid JWT
router.use(authenticateToken as RequestHandler);

// Seller: list reviews for their products
router.get('/seller', getSellerReviews as RequestHandler);

// Get a single review by ID (authenticated may see replies)
router.get('/:id', getReview as RequestHandler);

// Create a new review (any logged-in user)
router.post('/', createReview as RequestHandler);

// Update a review (owner or admin—ownership checked in controller)
router.put('/:id', updateReview as RequestHandler);

// Seller replies
router.post('/:id/replies', addSellerReply as RequestHandler);
router.put('/:id/replies/:replyId', updateSellerReply as RequestHandler);
router.delete('/:id/replies/:replyId', deleteSellerReply as RequestHandler);

// Delete a review (owner or admin)
router.delete('/:id', deleteReview as RequestHandler);

export default router;
