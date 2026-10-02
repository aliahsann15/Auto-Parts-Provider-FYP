import { getProductsWithCategories } from '@/actions/product'
import ProductsClient from './products-client'

export default async function ProductsPage() {
  const { products } = await getProductsWithCategories()
  return <ProductsClient products={products || []} />
}
