import { Router } from 'express';
import { verifyToken } from '../middleware/authMiddleware';
import { listWithdrawals, requestWithdrawal, getWithdrawalSummary, downloadWithdrawalReceipt } from '../controllers/withdrawalController';

const router = Router();

router.get('/', verifyToken as any, listWithdrawals as any);
router.get('/summary', verifyToken as any, getWithdrawalSummary as any);
router.get('/:id/receipt', verifyToken as any, downloadWithdrawalReceipt as any);
router.post('/', verifyToken as any, requestWithdrawal as any);

export default router;
