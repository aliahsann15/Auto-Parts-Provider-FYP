import { Router } from 'express'
import { publicGetProduct, publicGetProducts, publicGetRelatedProducts } from '../controllers/publicController'

const router = Router()

router.get('/products', publicGetProducts as any)
router.get('/products/related', publicGetRelatedProducts as any)
router.get('/products/:id', publicGetProduct as any)

export default router;