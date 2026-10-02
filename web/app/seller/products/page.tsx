import { Category, Product } from '@/types'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import SellerProductClient from '@/app/components/seller/seller-product-client'

interface Props {
  searchParams: Promise<{ page?: string; limit?: string }>;
}

const SellerProductPage = async ({ searchParams }: Props) => {
  // 1. get user's token
  const session = await getServerSession(authOptions);
  const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "http://localhost:4001").replace(/\/$/, "")
  const bearer = session?.backendToken;
  if (!bearer) {
    return <p>Please sign in to view your products.</p>;

  }


  const { page: pageStr = '1', limit: limitStr = '10' } = await searchParams;

  // 2. parse page & limit (fall back to 1 & 10)
  const page  = parseInt(pageStr,  10);
  const limit = parseInt(limitStr, 10);

  // 3. fetch products+pagination from backend
  const [prodRes, catRes] = await Promise.all([
    fetch(
      `${API_BASE}/api/products?page=${page}&limit=${limit}`,
      {
        headers: { Authorization: `Bearer ${bearer}` },
        cache: 'no-cache',
      }
    ).then((r) => r.json()),
    fetch(`${API_BASE}/api/categories`, {
       cache: 'no-cache',
    }).then((r) => r.json()),
  ]);

  // 4. Destructure the response
  const { products, pagination } = prodRes as {
    products: Product[];
    pagination: { total: number; totalPages: number; page: number; limit: number };
  };
  const categories = catRes as Category[];

  // 5. Render client with pagination metadata


  return (
    <SellerProductClient
      products={products}
      categories={categories}
      pagination={pagination}
    />
  );
};

export default SellerProductPage;
