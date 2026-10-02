import { Router } from 'express'
import { getAllCategories, createCategory, getCategoriesByIds } from '../controllers/categoryController'

const router = Router()

// Public route to fetch categories
router.get('/', getAllCategories as any)
router.get("/by-ids", getCategoriesByIds as any);
router.post('/', createCategory as any)

export default router