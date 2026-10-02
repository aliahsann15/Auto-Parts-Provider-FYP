import { Router } from 'express';
import { verifyToken } from '../middleware/authMiddleware';
import {
  listAdminWithdrawals,
  markWithdrawalCredited,
  downloadWithdrawalReceipt,
} from '../controllers/withdrawalController';

const router = Router();

router.use(verifyToken as any);
router.get('/', listAdminWithdrawals as any);
router.post('/:id/credit', markWithdrawalCredited as any);
router.get('/:id/receipt', downloadWithdrawalReceipt as any);

export default router;
