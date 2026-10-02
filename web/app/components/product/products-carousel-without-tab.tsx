// Products Carousel without Categories Tabs


import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import ProductCard from "./product-card";
import { Product } from "@/app/home-client";


interface Props {
  products: Product[];
  hoveredId: Product["_id"] | null;
  setHoveredId: (id: Product["_id"] | null) => void;

}

const Productswithoutcarouseltab: React.FC<Props> = ({
  products,
  hoveredId,
  setHoveredId,

}) => {

  return (
    <section className="w-full  mb-[70px] px-[75px]  ">
      {/* Section Heading */}

      {/* ▼▼▼ SWIPER ▼▼▼ */}
      <Swiper
        modules={[Pagination]}
        pagination={{ clickable: true }}
        spaceBetween={30}
        className="mt-8 pb-12 w-[100%]"
        breakpoints={{
          0: { slidesPerView: 1 },
          640: { slidesPerView: 2 },
          768: { slidesPerView: 3 },
          1024: { slidesPerView: 4 },
          1280: { slidesPerView: 4 },
        }}
      >
        {products?.map((p) => {

          return (
            <SwiperSlide className="w-full" key={p._id}>
              <ProductCard
                p={p}
                hoveredId={hoveredId}
                setHoveredId={setHoveredId}
              />
            </SwiperSlide>
          );
        })}
      </Swiper>
    </section>
  );
};

export default Productswithoutcarouseltab;
