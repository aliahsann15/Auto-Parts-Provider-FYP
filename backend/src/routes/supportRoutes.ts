import { Router } from 'express'
import { listSupportThreads, listSupportMessages, postSupportMessage } from '../controllers/supportController'
import { verifyToken } from '../middleware/authMiddleware'

const router = Router()

router.get('/threads', verifyToken, listSupportThreads)
router.get('/messages', verifyToken, listSupportMessages)
router.post('/messages', verifyToken, postSupportMessage)

export default router
