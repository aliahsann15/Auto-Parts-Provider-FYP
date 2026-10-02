import express from 'express'
import asyncHandler from 'express-async-handler'
import authenticateToken from '../middleware/auth'
import { listAddresses, addAddress, updateAddress, deleteAddress } from '../controllers/addressController'

const router = express.Router()

router.use(authenticateToken as express.RequestHandler)

router.get('/', asyncHandler(listAddresses))
router.post('/', asyncHandler(addAddress))
router.put('/:index', asyncHandler(updateAddress))
router.delete('/:index', asyncHandler(deleteAddress))
router.post('/:index/default', asyncHandler(async (req, res, next) => {
  (req as any).body = { setDefault: true };
  return updateAddress(req, res, next);
}))

export default router
