import express, { RequestHandler } from 'express'
import { 
  createOrder, 
  getUserOrders, 
  getSellerOrders,
  getSellerStats,
  getSellerProfitInsights,
  getSellerOrderInsights,
  getOrder, 
  updateOrderStatus, 
  updatePaymentStatus, 
  cancelOrder,
  listAllOrders 
} from '../controllers/orderController'
import { authenticateToken } from '../middleware/auth'
import { checkRole } from '../middleware/roleCheck'

const router = express.Router()
const adminOnly = checkRole(['SuperAdmin']) as RequestHandler

// All routes require authentication
router.use(authenticateToken as RequestHandler)

// Create order from cart
router.post('/', createOrder as RequestHandler)

// Get seller's orders (must be before /:id route)
router.get('/seller-orders', getSellerOrders as RequestHandler)

router.get('/admin', adminOnly, listAllOrders as RequestHandler)

// Get seller stats
router.get('/seller-stats', getSellerStats as RequestHandler)

// Seller profit insights
router.get('/seller-profit', getSellerProfitInsights as RequestHandler)

// Seller order insights (counts)
router.get('/seller-order-insights', getSellerOrderInsights as RequestHandler)

// Get user's orders
router.get('/my-orders', getUserOrders as RequestHandler)

// Get single order
router.get('/:id', getOrder as RequestHandler)

// Update order status (SuperAdmin, SubAdmin, or Seller)
router.patch('/:id/status', updateOrderStatus as RequestHandler)

// Update payment status
router.patch('/:id/payment', updatePaymentStatus as RequestHandler)

// Cancel order
router.post('/:id/cancel', cancelOrder as RequestHandler)

export default router 
