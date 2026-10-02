import express from 'express'
import asyncHandler from 'express-async-handler'
import authenticateToken from '../middleware/auth'
import {
  getNotifications,
  createNotification,
  markNotificationRead,
  markAllRead,
  getNotificationCount,
  registerPushToken,
  sendTestPush,
  listMyPushTokens,
  resetMyPushTokens
} from '../controllers/notificationController'

const router = express.Router()

router.use(authenticateToken as express.RequestHandler)

router.get('/', asyncHandler(getNotifications))
router.post('/', asyncHandler(createNotification))
router.post('/mark-all-read', asyncHandler(markAllRead))
router.post('/register-token', asyncHandler(registerPushToken))
router.post('/test-push', asyncHandler(sendTestPush))
router.get('/tokens', asyncHandler(listMyPushTokens))
router.delete('/tokens', asyncHandler(resetMyPushTokens))
router.patch('/:id/read', asyncHandler(markNotificationRead))
router.get('/count', asyncHandler(getNotificationCount))

export default router
