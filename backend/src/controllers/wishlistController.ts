import { Response } from 'express'
import mongoose from 'mongoose'
import Wishlist from '../models/Wishlist'
import Product from '../models/Product'
import { AuthRequest } from '../middleware/authMiddleware'

/**
 * Get current user's wishlist (populated)
 */
export async function getWishlist(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId
    if (!userId) return res.status(401).json({ ok: false, msg: 'Authentication required' })

    const uid = new mongoose.Types.ObjectId(String(userId))
    const wishlist = await Wishlist.findOne({ userId: uid }).populate('items').lean().exec()

    return res.json({ ok: true, items: wishlist?.items ?? [] })
  } catch (err) {
    console.error('getWishlist error:', err)
    return res.status(500).json({ ok: false, error: 'Server error' })
  }
}

/**
 * Add a product to wishlist
 * Body: { productId: string }
 */
export async function addToWishlist(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId
    if (!userId) return res.status(401).json({ ok: false, msg: 'Authentication required' })

    const { productId } = req.body
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ ok: false, error: 'Invalid productId' })
    }

    const prod = await Product.findById(productId).select('_id').lean().exec()
    if (!prod) return res.status(404).json({ ok: false, error: 'Product not found' })

    const uid = new mongoose.Types.ObjectId(String(userId))
    // addToSet prevents duplicates; upsert ensures a wishlist is created for the user
    const updated = await Wishlist.findOneAndUpdate(
      { userId: uid },
      { $addToSet: { items: new mongoose.Types.ObjectId(productId) } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
      .populate('items')
      .exec()

    return res.status(201).json({ ok: true, items: (updated?.items ?? []) })
  } catch (err) {
    console.error('addToWishlist error:', err)
    return res.status(500).json({ ok: false, error: 'Server error' })
  }
}

/**
 * Remove a product from wishlist
 * URL param: /wishlist/:id  or body.productId
 */
export async function removeFromWishlist(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId
    if (!userId) return res.status(401).json({ ok: false, msg: 'Authentication required' })

    const productId = req.params.id ?? req.body.productId
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ ok: false, error: 'Invalid productId' })
    }

    const uid = new mongoose.Types.ObjectId(String(userId))
    const updated = await Wishlist.findOneAndUpdate(
      { userId: uid },
      { $pull: { items: new mongoose.Types.ObjectId(productId) } },
      { new: true }
    )
      .populate('items')
      .exec()

    return res.json({ ok: true, items: updated?.items ?? [] })
  } catch (err) {
    console.error('removeFromWishlist error:', err)
    return res.status(500).json({ ok: false, error: 'Server error' })
  }
}

/**
 * Toggle wishlist membership for a product
 * Body: { productId: string }
 * Returns { added: boolean, items: [...] }
 */
export async function toggleWishlist(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId
    if (!userId) return res.status(401).json({ ok: false, msg: 'Authentication required' })

    const { productId } = req.body
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ ok: false, error: 'Invalid productId' })
    }

    const uid = new mongoose.Types.ObjectId(String(userId))
    let wishlist = await Wishlist.findOne({ userId: uid }).exec()

    if (!wishlist) {
      const created = await Wishlist.create({
        userId: uid,
        items: [new mongoose.Types.ObjectId(productId)]
      })
      const populated = await created.populate('items')
      return res.json({ ok: true, added: true, items: (populated as any).items ?? created.items })
    }

    const exists = wishlist.items.some((it: any) => String(it) === String(productId))
    if (exists) {
      const updated = await Wishlist.findOneAndUpdate(
        { userId: uid },
        { $pull: { items: new mongoose.Types.ObjectId(productId) } },
        { new: true }
      )
        .populate('items')
        .exec()
      return res.json({ ok: true, added: false, items: updated?.items ?? [] })
    } else {
      const updated = await Wishlist.findOneAndUpdate(
        { userId: uid },
        { $addToSet: { items: new mongoose.Types.ObjectId(productId) } },
        { new: true }
      )
        .populate('items')
        .exec()
      return res.json({ ok: true, added: true, items: updated?.items ?? [] })
    }
  } catch (err) {
    console.error('toggleWishlist error:', err)
    return res.status(500).json({ ok: false, error: 'Server error' })
  }
}

export default {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  toggleWishlist
}