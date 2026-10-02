"use client"

import React, { useState } from "react";
import Link from "next/link";
import Image from "@/app/components/AppImage";
import { Product } from "@/app/home-client";
import AddToCart from "./add-to-cart";
import { useWishlist } from "@/app/context/wishlist-context";

// Props for the component
interface Props {
  p: Product;
  hoveredId: Product["_id"] | null;
  setHoveredId: (id: Product["_id"] | null) => void;
}

const ProductCard: React.FC<Props> = ({
  hoveredId,
  setHoveredId,
  p,
}) => {
  const [isWishing, setIsWishing] = useState(false);
  const { isWishlisted, toggle } = useWishlist();

  const discountBadge = p.price < p.salePrice && "Sale";
  const isHover = hoveredId === p._id;
  const img = isHover && p.images[1] ? p.images[1] : p.images[0];

  const wishled = isWishlisted(p._id);

  const onWishlistClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // prevent Link navigation
    if (isWishing) return;
    setIsWishing(true);
    try {
      await toggle(p._id);
      // toggle shows success/error toasts and keeps context in sync
    } catch {
      // toggle already handles errors/toasts; nothing else required here
    } finally {
      setIsWishing(false);
    }
  };

  return (
    <div
      className="w-full relative"
      onMouseEnter={() => setHoveredId(p._id)}
      onMouseLeave={() => setHoveredId(null)}
    >
      <Link href={`/product/${p._id}`} className="block">
        {/* Discount Badge */}
        {discountBadge && (
          <span className="z-50 absolute top-[10px] left-[15px] bg-[#FFA500] text-white px-[10px] py-[6px] rounded-[5px] text-xs font-bold shadow">
            {discountBadge}
          </span>
        )}

        {/* Product Image */}
        <div className="lg:min-h-[270px] lg:max-h-[270px] border rounded-[15px] border-gray-200 p-[10px] mb-[10px] flex justify-center relative">
          <Image
            width={252}
            height={235}
            src={img}
            alt={p.name}
            className="object-contain rounded-[10px]"
          />
        </div>

        {/* Product Info */}
        <h3 className="text-[18px] font-semibold mb-1 truncate">{p.name}</h3>
        <p className="text-[14px] text-gray-500 mb-2">@{p.sellerName}</p>

        {/* Rating */}
        {p.reviews && (
          <div className="flex items-center mb-[10px] gap-[1px]">
            {Array.from({ length: 5 }).map((_, i) =>
              i < p.reviews[0]?.rating ? (
                <svg
                  key={i}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-3 h-3 text-[#FFA500]"
                >
                  <path d="M12 .587l3.668 7.568L24 9.75l-6 5.847 1.417 8.263L12 18.896l-7.417 4.964L6 15.597 0 9.75l8.332-1.595z" />
                </svg>
              ) : (
                <svg
                  key={i}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-3 h-3 text-gray-300"
                >
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
              )
            )}

            <span className="text-xs text-gray-500 ml-2">
              {p.reviews[0]?.rating} review{p.reviews[0]?.rating !== 1 && "s"}
            </span>
          </div>
        )}

        {/* Pricing */}
        <div className="flex items-center justify-between gap-[20px]">
          <div className="flex items-center gap-2">
            {p.salePrice && p.salePrice < p.price ? (
              <>
                <span className="text-sm text-gray-400 line-through">PKR {p.price}</span> <br />
                <span className="text-lg font-semibold text-[#FFA500]">PKR {p.salePrice}</span>
              </>
            ) : (
              <>
                <span className="text-lg font-semibold text-gray-900">PKR {p.price}</span>
                <span className="text-lg font-semibold text-gray-900">{" "}</span>
              </>
            )}
          </div>

          {/* Icons */}
          <div className="flex items-center gap-4 justify-end">
            <span className="iconBtn bg-[#F1F3F5] rounded-[10px] p-[8px]">
              <Image src="/images/icons/chat.svg" alt="chat" width={25} height={25} />
            </span>
            <span className="iconBtn bg-[#F1F3F5] rounded-[10px] p-[8px]">
              <Image src="/images/icons/cart.svg" alt="cart" width={25} height={20} />
            </span>
          </div>
        </div>

        {/* Stock */}
        <span className="flex items-center gap-[5px] text-sm mb-[15px]">
          <Image src="/images/icons/stock.svg" alt="stock" width={15} height={15} />
          <span className={p.stock > 0 ? "text-green-600" : "text-red-500"}>
            {p.stock > 0 ? "In Stock" : "Out of Stock"}
          </span>
        </span>
      </Link>

      {/* Wishlist button placed outside Link to avoid nested interactive elements.
          Positioned absolutely so it visually overlaps the image like before. */}
      <button
        type="button"
        onClick={onWishlistClick}
        onMouseDown={(e) => e.stopPropagation()}
        disabled={isWishing}
        aria-pressed={wishled}
        title={wishled ? "Remove from wishlist" : "Add to wishlist"}
        className="absolute top-[23px] right-[20px] z-50 p-1 bg-white rounded-full"
      >
        <Image
          src={wishled ? "/images/icons/favourite-filled.svg" : "/images/icons/favourite.svg"}
          alt={wishled ? "favorited" : "favorite"}
          width={20}
          height={20}
        />
      </button>

      <AddToCart productName={p.name} productId={p._id} stock={p.stock} quantity={1} />
    </div>
  );
};

export default ProductCard;
