import express, { RequestHandler } from 'express';
import {
  getCart,
  addToCart,
  removeFromCart,
  updateCartItem,
  clearCart
} from '../controllers/cartController';
import { authenticateToken } from '../middleware/auth';


const router = express.Router();

// All routes require user to be logged in
router.use(authenticateToken as RequestHandler);

router.get('/', getCart as RequestHandler);
router.post('/add', addToCart as RequestHandler);
router.put('/update', updateCartItem as RequestHandler);
router.delete('/remove/:productId', removeFromCart as RequestHandler);
router.delete('/clear', clearCart as RequestHandler);

export default router;
