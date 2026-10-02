// ✅ AddToCart.tsx - Theme-Aligned Layout
'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState } from 'react'
import Image from '@/app/components/AppImage'
import Productswithoutcarouseltab from '../components/product/products-carousel-without-tab'
import Link from 'next/link'
import { useCart } from '@/app/context/cart-context'
import { Product } from '@/app/home-client'


const SUGGESTIONS_LIMIT = 8;

const AddToCart = () => {
  // const [cartItems, setCartItems] = useState(mockCartItems)
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const { cart, updateCartItem } = useCart();

  const [suggestedProducts, setSuggestedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch suggested products based on categories in cart
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Collect unique categories from cart items
        const catSet = new Set<string>();
        (cart || []).forEach(ci => {
          (ci.product.categories || []).forEach(c => catSet.add(c));
        });

        // Fetch public products (no-store to keep fresh)
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:4000'}/api/public/products?limit=50&status=active`,
          { cache: 'no-store' }
        );
        if (!res.ok) throw new Error('Failed to load products');
        const data = await res.json();
        const all: Product[] = data?.products || [];

        // If no categories in cart, just take top N
        if (catSet.size === 0) {
          setSuggestedProducts(all.slice(0, SUGGESTIONS_LIMIT));
          return;
        }

        // Filter by any matching category, exclude items already in cart, dedupe
        const inCartIds = new Set<string>((cart || []).map(ci => ci.product._id));
        const cats = Array.from(catSet);
        const picked: Product[] = [];
        const seen = new Set<string>();

        for (const p of all) {
          if (inCartIds.has(p._id)) continue;
          if (!p.categories || p.categories.length === 0) continue;
          const matches = p.categories.some(c => cats.includes(c));
          if (!matches) continue;
          if (seen.has(p._id)) continue;
          seen.add(p._id);
          picked.push(p);
          if (picked.length >= SUGGESTIONS_LIMIT) break;
        }
        console.log('Suggested products picked:', picked);
        setSuggestedProducts(picked);
      } catch (err: any) {
        console.error('Suggested products error:', err);
        setError('Could not load suggested products');
        setSuggestedProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [cart]);

  
  const increment = (id: string, quantity: number) => {
    updateCartItem(id, quantity + 1);
  };

  const decrement = (id: string, quantity: number) => {
    if (quantity > 1) updateCartItem(id, quantity - 1);
  };

  return (
    <>
      <section className="px-[75px] mt-20">

        <h1 className="text-xl md:text-3xl font-semibold text-gray-900 mb-8">Item(s) Added to cart</h1>
        <div className=" bg-white rounded-lg shadow border border-gray-300 pb-5">

          {/* ✅ Table Headers */}
          <div className="hidden md:grid grid-cols-5 text-sm font-semibold text-white bg-[#FFA500] py-3 px-6 rounded-t">
            <span className="col-span-2">Items</span>
            <span className="text-center">Qty</span>
            <span className="text-center">Sub-total</span>
            <span className="text-center">Total</span>
          </div>

          
          {/* ✅ Cart Items */}
          {cart ? cart.map((item) => (
            <div
              key={item.product._id}
              className="grid grid-cols-1 md:grid-cols-5 items-center gap-4 py-6 px-6 border-b border-gray-300 bg-white transition"
            >
              <div className="col-span-2 flex items-center gap-4">
                <Image
                  src={item.product.images[0]}
                  alt={item.product.name}
                  width={80}
                  height={80}
                  className="rounded-md "
                />
                <div>
                  <p className="font-medium text-[15px] text-gray-900 mb-1 leading-tight">{item.product.name}</p>
                  {item.product.stock > 0 && <p className="text-green-600 text-sm font-[500]">In Stock</p>}
                </div>
              </div>

              <div className="flex justify-center">
                <div className="flex items-center border border-gray-400 rounded-md px-3 py-1 ">
                  <button
                    onClick={() => decrement(item.product._id, item.quantity)}
                    className="text-base px-2 text-gray-500 hover:text-[#ffa500]"
                  >−</button>
                  <span className="px-3 text-sm text-gray-800 font-semibold">{item.quantity}</span>
                  <button
                    onClick={() => increment(item.product._id, item.quantity)}
                    className="text-base px-2 text-gray-500 hover:text-[#ffa500]"
                  >+</button>
                </div>
              </div>

              <div className="text-center  ">
                <span className="line-through text-gray-400 text-[15px] mr-2">Rs {item.product.price?.toFixed(2)}</span>
                <span className="text-[#ef4444] font-semibold text-[15px]">Rs {item.product.salePrice?.toFixed(2) || item.product.price?.toFixed(2)}</span>
              </div>

              <div className="text-center text-[#ef4444] font-semibold text-[16px]">
                Rs. {((item.product.salePrice || item.product.price) * item.quantity)?.toFixed(2)}
              </div>
            </div>
          )) : <h3 className='p-4'>Nothing added to cart!</h3>}

          {/* ✅ Footer Buttons */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-10 px-6">
            <Link href="/tools" className="bg-[#ffa500] hover:bg-[#e88e00] text-white px-6 py-3 rounded text-sm font-medium shadow-sm">
              ← CONTINUE SHOPPING
            </Link>
            <Link href="/checkout" className="bg-[#ffa500]  text-white px-6 py-3 rounded text-sm font-medium shadow-sm">
              CHECKOUT →
            </Link>
          </div>
        </div>
      </section>

      <div className="px-[75px] mt-[50px] w-[100%] flex  border-[#DEE2E6] ">
        <div className="w-[100%] flex py-6 border-b border-[#DEE2E6] justify-between">
          <div className=" w-fit flex items-center gap-[20px] ">
            <h3 className="text-[20px] font-[600] leading-[26px]">Suggested Products</h3>

          </div>
          <a href="#" className="items-center  text-sm text-gray-500 hover:text-[#ffa500] hover:underline">
            View All →
          </a>
        </div>
      </div>

      {isLoading ? (
        <div className="px-[75px] py-12 text-center">
          <p className="text-gray-500">Loading suggested products...</p>
        </div>
      ) : error ? (
        <div className="px-[75px] py-12 text-center">
          <p className="text-gray-500">{error}</p>
        </div>
      ) : (
        <Productswithoutcarouseltab
          products={suggestedProducts}
          hoveredId={hoveredId}
          setHoveredId={setHoveredId}
        />
      )}
    </>
  )
}

export default AddToCart
