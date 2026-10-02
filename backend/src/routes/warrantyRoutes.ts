import express, { Request, Response, NextFunction, RequestHandler } from 'express'
import authenticateToken from '../middleware/auth'
import * as warrantyController from '../controllers/warrantyController'

const router = express.Router()

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next)
  }

router.use(authenticateToken as RequestHandler)

router.post('/', asyncHandler(warrantyController.createWarrantyClaim))
router.get('/my', asyncHandler(warrantyController.listBuyerWarrantyClaims))
router.get('/seller', asyncHandler(warrantyController.listSellerWarrantyClaims))
router.get('/:id', asyncHandler(warrantyController.getWarrantyClaimById))
router.patch('/:id/status', asyncHandler(warrantyController.updateWarrantyClaimStatus))

export default router
