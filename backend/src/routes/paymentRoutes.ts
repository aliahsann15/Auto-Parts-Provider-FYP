import express, { RequestHandler } from 'express'
import {
  createEphemeralKey,
  createPaymentIntent,
  createSetupIntent,
  listPaymentMethods
} from '../controllers/paymentController'
import { authenticateToken } from '../middleware/auth'

const router = express.Router()

router.use(authenticateToken as RequestHandler)

router.post('/setup-intent', (createSetupIntent as unknown) as RequestHandler)
router.post('/ephemeral-key', (createEphemeralKey as unknown) as RequestHandler)
router.get('/methods', (listPaymentMethods as unknown) as RequestHandler)
router.post('/intent', (createPaymentIntent as unknown) as RequestHandler)

export default router
