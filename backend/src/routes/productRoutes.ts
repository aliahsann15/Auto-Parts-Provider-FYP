import express, { RequestHandler } from 'express'
import { createProduct, getProducts, getProduct, updateProduct, deleteProduct, restoreProduct } from '../controllers/productController'
import { authenticateToken } from '../middleware/auth'
import { checkRole } from '../middleware/roleCheck'
import multer from 'multer';
import fs from 'fs';
import { UPLOADS_FOLDER } from '../utils/constants';

const router = express.Router();

if (!fs.existsSync(UPLOADS_FOLDER)) {
  fs.mkdirSync(UPLOADS_FOLDER, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_FOLDER)
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`)
  }
})

// Add file size limits and filters
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 9 // max 9 files (1 featured + 8 gallery)
  },
  fileFilter: (_req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Only images are allowed.`));
    }
  }
})

// Middleware to check if user is authorized to manage products
const canManageProducts = checkRole(['SuperAdmin', 'Admin', 'Seller', 'SubAdmin'])

// All routes require authentication
router.use(authenticateToken as RequestHandler)

// Error handler for multer
const multerErrorHandler = (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ msg: 'File is too large. Maximum 10MB per file.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ msg: 'Too many files. Maximum 9 files allowed.' });
    }
    return res.status(400).json({ msg: `Upload error: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ msg: err.message || 'File upload failed' });
  }
  next();
};

// Routes that require product management permissions
router.post('/', canManageProducts as RequestHandler, 
  upload.fields([
    { name: 'featuredImage', maxCount: 1},
    { name: 'galleryImages', maxCount: 8}
  ]), 
  multerErrorHandler as any,
  createProduct as RequestHandler)
router.put(
  '/:id',
  canManageProducts as RequestHandler,
  upload.fields([
    { name: 'featuredImage', maxCount: 1 },
    { name: 'galleryImages', maxCount: 8 },
  ]),
  multerErrorHandler as any,
  updateProduct as RequestHandler
)
router.delete('/:id', canManageProducts as RequestHandler, deleteProduct as RequestHandler)
router.put('/:id/restore', canManageProducts as RequestHandler, restoreProduct as RequestHandler)

// Routes accessible to all authenticated users
router.get('/', getProducts as RequestHandler)
router.get('/:id', getProduct as RequestHandler)

export default router
