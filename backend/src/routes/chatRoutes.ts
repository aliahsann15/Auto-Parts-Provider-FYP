import { Router } from 'express';
import authenticateToken from '../middleware/auth';
import { listChatMessages, postChatMessage, markChatRead, listChatThreads } from '../controllers/chatController';

const router = Router();

router.use(authenticateToken as any);
router.get('/threads', listChatThreads as any);
router.get('/:requestId', listChatMessages as any);
router.post('/:requestId', postChatMessage as any);
router.post('/:requestId/read', markChatRead as any);

export default router;
