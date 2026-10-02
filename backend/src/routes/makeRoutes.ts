import { Router } from 'express'
import { getAllMakes, createMake, getMakesByIds } from '../controllers/makeController'

const router = Router()

// Public route to fetch Makes
router.get('/', getAllMakes as any)
router.get("/by-ids", getMakesByIds as any);
router.post('/', createMake as any)

export default router