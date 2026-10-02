import express, { Request, Response, NextFunction, RequestHandler } from 'express'
import mongoose from 'mongoose'
import ReturnModel from '../models/Return'
import authenticateToken from '../middleware/auth'
import * as returnController from '../controllers/returnController'

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
    const docs = await ReturnModel.find({ buyer: uid })
      .populate('order', 'orderNumber totalAmount')
      .populate('items.product', 'name images price')
      .sort({ requestedAt: -1 })
      .lean()
      .exec()

    res.json({ ok: true, items: docs ?? [] })
  })
)

// Apply authentication for all routes below
router.use(authenticateToken as RequestHandler)

// --- Authenticated routes ---
router.get('/', asyncHandler(returnController.listReturns))
router.get('/my', asyncHandler(returnController.listBuyerReturns))
router.get('/seller', asyncHandler(returnController.listSellerReturns))
router.get('/order/:orderId', asyncHandler(returnController.listReturnsByOrder))
router.post('/', asyncHandler(returnController.createReturn))
router.get('/:id', asyncHandler(returnController.getReturnById))
router.patch('/:id/status', asyncHandler(returnController.updateReturnStatus))
router.patch('/:id/bank-details', asyncHandler(returnController.updateReturnBankDetails))
router.delete('/:id', asyncHandler(returnController.deleteReturn))

export default router
