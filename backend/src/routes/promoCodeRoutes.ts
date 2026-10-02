import { Router, RequestHandler } from 'express';
import { verifyToken } from '../middleware/authMiddleware';
import {
  applyPromoCode,
  createPromoCode,
  deletePromoCode,
  getPromoCodes,
  updatePromoCode,
} from '../controllers/promoCodeController';

const router = Router();

const auth = verifyToken as unknown as RequestHandler;
const createH = createPromoCode as unknown as RequestHandler;
const listH = getPromoCodes as unknown as RequestHandler;
const updateH = updatePromoCode as unknown as RequestHandler;
const deleteH = deletePromoCode as unknown as RequestHandler;
const applyH = applyPromoCode as unknown as RequestHandler;

router.post('/', auth, createH);
router.get('/', auth, listH);
router.put('/:id', auth, updateH);
router.delete('/:id', auth, deleteH);
router.post('/apply', applyH);

export default router;
