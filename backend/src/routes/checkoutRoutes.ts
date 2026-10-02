import express, { RequestHandler } from 'express';
import { authenticateToken } from '../middleware/auth';
import { createCheckout } from '../controllers/checkoutController';

const router = express.Router();

// POST /api/checkout
router.use(authenticateToken as RequestHandler)
router.post('/', createCheckout as RequestHandler);

export default router;
