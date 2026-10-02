"use client";

import React from "react";
import Link from "next/link";
import Image from "@/app/components/AppImage";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import ProductCard from "./product-card";
import { Product } from "@/app/home-client";

interface Props {
  categories: string[];               // dynamic tabs
  selectedCategory: string;
  setSelectedCategory: (c: string) => void;
  hoveredId: Product["_id"] | null;
  setHoveredId: (id: Product["_id"] | null) => void;
  filtered: Product[];
}

const ProductCarouselTab: React.FC<Props> = ({
  categories,
  selectedCategory,
  setSelectedCategory,
  hoveredId,
  setHoveredId,
  filtered,
}) => {
  return (
    <section className="px-20 mt-20">
      {/* Header Row */}
      <div className="flex py-6 border-b border-[#DEE2E6]">
        {/* Title */}
        <div className="w-1/6 flex items-center justify-start">
          <h3 className="text-[20px] font-[600] leading-[26px]">
            Featured Products
          </h3>
        </div>

        {/* Dynamic Categories */}
        <div className="w-4/6 text-[13px] leading-[13px] flex items-center">
          <div className="flex gap-4 p-[7px] bg-[#F1F3F5] font-[600] rounded-[10px]">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`p-[7px] rounded-[10px] ${
                  selectedCategory === cat
                    ? "bg-[#FFA500] text-white"
                    : ""
                }`}
              >
                {cat.replace("&", "and")}
              </button>
            ))}
          </div>
        </div>

        {/* View All */}
        <div className="w-1/6 flex items-center justify-end">
          <Link href="/tools" className="flex gap-2 items-center">
            View all
            {/* Arrow / navigation icon */}
            <Image
              src="/images/icons/arrow-right.svg"
              alt="next"
              width={16}
              height={16}
              style={{ width: "16px", height: "16px" }}
              className="object-contain"
            />

            {/* If you have other SVG icons here, apply the same pattern:
               give width, height and matching inline style to prevent warnings. */}
          </Link>
        </div>
      </div>

      {/* Swiper Carousel */}
      <Swiper
        modules={[Pagination]}
        pagination={{ clickable: true }}
        spaceBetween={30}
        className="mt-8 pb-12 w-full"
        breakpoints={{
          0: { slidesPerView: 1 },
          640: { slidesPerView: 2 },
          768: { slidesPerView: 3 },
          1024: { slidesPerView: 4 },
          1280: { slidesPerView: 4 },
        }}
      >
        {filtered.map((p) => (
          <SwiperSlide key={p._id} className="w-full">
            <ProductCard
              p={p}
              hoveredId={hoveredId}
              setHoveredId={setHoveredId}
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
};

export default ProductCarouselTab;
