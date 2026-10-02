'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from '@/app/components/AppImage';
import Link from 'next/link';
import {
  FiShoppingCart,
  FiTrash2,
  FiX,
  FiPlus,
  FiMinus,
} from 'react-icons/fi';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';

import { useCart } from '@/app/context/cart-context';
import { Product } from '@/app/home-client';

type SuggestedProducts = {
  products: Product[];
  pagination: { page: number, limit: number, total: number, totalPages: number }
}

const CartSidePanel = () => {

  const wrapperRef = useRef<HTMLDivElement>(null);
  const { isCartOpen, setIsCartOpen, cart, updateCartItem, removeFromCart, addToCart } = useCart();
  const [suggestions, setsSuggestions] = useState<SuggestedProducts>({ products: [], pagination: { page: 1, limit: 10, total: 5, totalPages: 1 } });


  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsCartOpen(false);
      }
    }

    async function getSuggestions() {
      const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:4001').replace(/\/$/, '');
      const response = await fetch(`${API_BASE}/api/public/products/`)
      const data: SuggestedProducts = await response.json();
      setsSuggestions(data);
    }

    getSuggestions();


    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [wrapperRef, setIsCartOpen]);

  const increment = (id: string, quantity: number) => {
    updateCartItem(id, quantity + 1);
  };

  const decrement = (id: string, quantity: number) => {
    if (quantity > 1) updateCartItem(id, quantity - 1);
  };

  const handleRemove = (id: string) => {
    removeFromCart(id);
  };

  const total = cart.reduce((sum, item) => sum + item.product?.price * item.quantity, 0);
  return (
    <div ref={wrapperRef} className="relative mini-cart max-h-screen">
      {/* ── Cart icon trigger */}
      <button
        onClick={() => setIsCartOpen(true)}
        aria-label="Toggle cart"
        className="cursor-pointer relative focus:outline-none"
      >
        <FiShoppingCart className="text-2xl" />
        {cart.length > 0 && (
          <span className="bg-[#ffa500] text-white absolute -top-2 -right-2 rounded-full text-[12px] px-2">
            {cart.length}
          </span>
        )}
      </button>

      {/* ── Side panel */}
      <div
        className={`
        fixed top-0 right-0 h-screen w-[30%] bg-white shadow-lg
        transform transition-transform duration-300 ease-out z-50
        ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}
      `}
      >
        {/* Header */}
        <div className="flex bg-[#ffa500] justify-between items-center p-4 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-white">Cart Items</h1>
          <button onClick={() => setIsCartOpen(false)} className="cursor-pointer">
            <FiX className="text-white" />
          </button>
        </div>

        {/* Cart items list */}
        {/* TODO: seller can not add his own product to cart */}
        <ul className={`${cart.length > 0 ? "min-h-[48vh]" : "min-h-[70vh]"} max-h-[48vh] overflow-y-auto`}>
          {cart.length > 0 ? cart.map((item, index) => (
            <li key={item.product?._id || index} className="flex items-center p-4 border-b border-gray-200 last:border-none">
              <Image
                src={item.product?.images?.[0] || '/images/placeholder-product.png'}
                alt={item.product?.name || "Product name"}
                width={48}
                height={48}
                className="rounded"
              />
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium mb-1">{item.product?.name}</p>
                <p className="text-sm">
                  {item.product?.salePrice ? (
                    <>
                      <span className="line-through text-gray-400 mr-2">PKR {item.product?.price.toFixed(2)}</span>
                      <span className="text-black">PKR {item.product?.salePrice.toFixed(2)}</span>
                    </>
                  ) : (
                    <>PKR {item.product?.price.toFixed(2)}</>
                  )}
                </p>
                <div className="border w-fit flex items-center mt-2 p-1 rounded border-gray-400">
                  <button className='cursor-pointer' onClick={() => decrement(item.product?._id, item.quantity)}>
                    <FiMinus />
                  </button>
                  <span className="px-2">{item.quantity}</span>
                  <button className='cursor-pointer' onClick={() => increment(item.product?._id, item.quantity)}>
                    <FiPlus />
                  </button>
                </div>
              </div>
              <button onClick={() => handleRemove(item.product?._id)} className="ml-2 cursor-pointer">
                <FiTrash2 className="text-red-600" />
              </button>
            </li>
          )) : <h3 className='p-4'>Nothing added to cart!</h3>}
        </ul>

        {/* You May Also Like */}
        {cart.length > 0 && <div className="p-4 border-t border-gray-200">
          <h5 className="font-medium mb-2">You May Also Like</h5>
          <Swiper modules={[Navigation]} spaceBetween={10} slidesPerView={1.2} navigation>
            {suggestions?.products?.map((prod) => (
              <SwiperSlide key={prod._id}>
                <div className="bg-gray-50 p-2 rounded flex flex-row items-center gap-2">
                  <Image src={prod.images[0]} alt={prod.name} width={80} height={80} />
                  <div>
                    <p className="text-sm mb-1 line-clamp-1">{prod.name}</p>
                    <p className="text-sm font-semibold mb-1">PKR {prod.price.toFixed(2)}</p>
                    <button onClick={() => addToCart(prod._id, 1)} className="px-3 py-1 bg-[#ffa500] text-white text-xs rounded">ADD</button>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>}

        {/* Total and actions */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex justify-between mb-3">
            <span className="font-medium">Total</span>
            <span className="font-semibold">PKR {total.toFixed(2)}</span>
          </div>
          <Link
            href="/cart"
            onClick={() => setIsCartOpen(!isCartOpen)}
            className="block w-full py-2 mb-2 rounded border text-center">
            View Cart
          </Link>
          <Link
            href="/checkout"
            onClick={() => setIsCartOpen(!isCartOpen)}
            className="block w-full py-2 bg-[#ffa500] text-white rounded text-center">
            Go to checkout →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CartSidePanel;
