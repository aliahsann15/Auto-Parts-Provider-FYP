import express, { Request, Response, NextFunction, RequestHandler } from 'express'
import multer from 'multer'
import {
  createPartsRequest,
  listPartsRequests,
  getPartsRequestById,
  deletePartsRequest,
  listUserPartsRequests,
  listSellerPartsRequests,
  engagePartsRequest,
  disengagePartsRequest
} from '../controllers/requestController'
import authenticateToken from '../middleware/auth' // default export from auth middleware

const router = express.Router()

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next)
  }

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 8,
    fileSize: 5 * 1024 * 1024 // 5 MB per file
  }
});

// List parts requests (public)
router.get('/', asyncHandler(listPartsRequests))

// --- authenticated: list current user's requests ---
// attach auth middleware only for this route to avoid path conflicts with the public :id route
router.get('/my', authenticateToken as RequestHandler, asyncHandler(listUserPartsRequests))
router.get('/seller', authenticateToken as RequestHandler, asyncHandler(listSellerPartsRequests))

// Get single request (public). Optional ?includeImages=true
router.get('/:id', asyncHandler(getPartsRequestById))

router.use(authenticateToken as RequestHandler);

// Create a parts request — require authentication so userId is set by middleware
router.post('/', upload.array('images', 8) || null, asyncHandler(createPartsRequest))

// Seller engagement
router.post('/:id/engage', asyncHandler(engagePartsRequest))
router.post('/:id/unengage', asyncHandler(disengagePartsRequest))

// Delete a parts request — require authentication (you can enforce ownership in controller)
router.delete('/:id', asyncHandler(deletePartsRequest))

export default router
