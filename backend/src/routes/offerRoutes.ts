import express, { Request, Response, NextFunction, RequestHandler } from 'express'
import authenticateToken from '../middleware/auth'
import * as offerController from '../controllers/offerController'

const router = express.Router()

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next)
  }

// --- Public routes (no auth required) ---
// Get all offers for a specific request (by requestId)
router.get('/request/:requestId', asyncHandler(offerController.getOffersByRequestId))

// --- Protected routes (authentication required) ---
router.use(authenticateToken as RequestHandler)

// Get offers for the authenticated buyer (their requests)
router.get('/buyer/my-quotes', asyncHandler(offerController.getOffersForBuyer))

// Get all offers created by the authenticated seller
router.get('/seller/my-offers', asyncHandler(offerController.getOffersBySellerId))

// Create a new offer (seller creates offer for a request)
router.post('/', asyncHandler(offerController.createOffer))

// Get single offer by id (protected)
router.get('/:id', asyncHandler(offerController.getOfferById))

// Update offer (change price, message, status)
router.put('/:id', asyncHandler(offerController.updateOffer))

// Accept an offer (change status to 'accepted')
router.post('/:id/accept', asyncHandler(offerController.acceptOffer))

// Reject an offer (change status to 'rejected')
router.post('/:id/reject', asyncHandler(offerController.rejectOffer))

// Delete offer
router.delete('/:id', asyncHandler(offerController.deleteOffer))

export default router
