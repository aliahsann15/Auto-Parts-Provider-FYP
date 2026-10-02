import express, { Request, Response, NextFunction, RequestHandler } from 'express'
import mongoose from 'mongoose'
import Wishlist from '../models/Wishlist'
import authenticateToken from '../middleware/auth'
import * as wishlistController from '../controllers/wishlistController'

const router = express.Router()

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next)
  }

// --- Public routes (accessible without auth) ---
router.get(
  '/public/:userId',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({ ok: false, msg: 'Invalid userId' })
      return
    }

    const uid = new mongoose.Types.ObjectId(userId)
    const wishlist = await Wishlist.findOne({ userId: uid }).populate('items').lean().exec()
    res.json({ ok: true, items: wishlist?.items ?? [] })
  })
)

// Apply authentication for all routes below
router.use(authenticateToken as RequestHandler)

// --- Authenticated routes ---
// Route to get current user's wishlist
router.get('/', asyncHandler(wishlistController.getWishlist))
// Route to add a product to wishlist
router.post('/', asyncHandler(wishlistController.addToWishlist))
// Route to toggle a product in wishlist
router.post('/toggle', asyncHandler(wishlistController.toggleWishlist))
// Route to remove a product from wishlist
router.delete('/:id', asyncHandler(wishlistController.removeFromWishlist))

export default router