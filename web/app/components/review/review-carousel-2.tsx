// Review Carousel 

import React, { useState, useRef } from "react";

/* ---------- Swiper ---------- */
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import ReviewCard from "./review-card";

interface Review {
    name: string;
    title: string;
    img: string;
    text: string;
}

// Props for the component
interface Props {
    testimonials: Review[];
}


const ReviewCarousel2: React.FC<Props> = ({
    testimonials,
}) => {
    const prevRef = useRef(null);
    const nextRef = useRef(null);
    const [isBeginning, setIsBeginning] = useState(true);
    return (

        <section className="bg-white pb-20">
        {/* Heading + Navigation */}
        <div className="py-6 border-b border-[#DEE2E6] flex items-center justify-between mb-6">
          <h2 className="text-[20px] font-[700] text-black">Store Reviews</h2>
          <div className="flex gap-3">

            <button
              ref={prevRef}
              className={`w-[40px] h-[40px] rounded-full flex items-center justify-center transition-all duration-300 ${isBeginning ? "bg-[#F5F6FA]" : "bg-[#FFA500]"
                }`}
            >
              <svg
                width="16"
                height="14"
                viewBox="0 0 16 14"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M15.4997 7.00021C15.4997 7.24885 15.401 7.48731 15.2251 7.66312C15.0493 7.83894 14.8109 7.93771 14.5622 7.93771H3.70035L7.72597 11.9615C7.81314 12.0486 7.88228 12.1521 7.92945 12.266C7.97663 12.3799 8.00091 12.5019 8.00091 12.6252C8.00091 12.7485 7.97663 12.8705 7.92945 12.9844C7.88228 13.0983 7.81314 13.2018 7.72597 13.289C7.63881 13.3761 7.53533 13.4453 7.42144 13.4924C7.30756 13.5396 7.18549 13.5639 7.06222 13.5639C6.93895 13.5639 6.81689 13.5396 6.703 13.4924C6.58912 13.4453 6.48564 13.3761 6.39847 13.289L0.773473 7.66396C0.686167 7.57687 0.616898 7.47342 0.569636 7.35952C0.522374 7.24562 0.498047 7.12352 0.498047 7.00021C0.498047 6.87689 0.522374 6.75479 0.569636 6.6409C0.616898 6.527 0.686167 6.42354 0.773473 6.33646L6.39847 0.711458C6.57451 0.53542 6.81327 0.436523 7.06222 0.436523C7.31118 0.436523 7.54993 0.53542 7.72597 0.711458C7.90201 0.887495 8.00091 1.12625 8.00091 1.37521C8.00091 1.62416 7.90201 1.86292 7.72597 2.03896L3.70035 6.06271H14.5622C14.8109 6.06271 15.0493 6.16148 15.2251 6.3373C15.401 6.51311 15.4997 6.75157 15.4997 7.00021Z"
                  fill={isBeginning ? "#0000004D" : "#FFFFFF"}
                />
              </svg>
            </button>



            <button ref={nextRef} className="w-[40px] h-[40px] rounded-full bg-[#FFA500] flex items-center justify-center">

              <svg width="16" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
                <path fillRule="evenodd" clipRule="evenodd" d="M0.500278 7.00021C0.500278 7.24885 0.59905 7.48731 0.774864 7.66312C0.95068 7.83894 1.18914 7.93771 1.43778 7.93771H12.2997L8.27403 11.9615C8.18686 12.0486 8.11772 12.1521 8.07055 12.266C8.02337 12.3799 7.99909 12.5019 7.99909 12.6252C7.99909 12.7485 8.02337 12.8705 8.07055 12.9844C8.11772 13.0983 8.18686 13.2018 8.27403 13.289C8.36119 13.3761 8.46467 13.4453 8.57856 13.4924C8.69244 13.5396 8.81451 13.5639 8.93778 13.5639C9.06105 13.5639 9.18311 13.5396 9.297 13.4924C9.41088 13.4453 9.51436 13.3761 9.60153 13.289L15.2265 7.66396C15.3138 7.57687 15.3831 7.47342 15.4304 7.35952C15.4776 7.24562 15.502 7.12352 15.502 7.00021C15.502 6.87689 15.4776 6.75479 15.4304 6.6409C15.3831 6.527 15.3138 6.42354 15.2265 6.33646L9.60153 0.711458C9.42549 0.53542 9.18673 0.436523 8.93778 0.436523C8.68882 0.436523 8.45006 0.53542 8.27403 0.711458C8.09799 0.887495 7.99909 1.12625 7.99909 1.37521C7.99909 1.62416 8.09799 1.86292 8.27403 2.03896L12.2997 6.06271H1.43778C1.18914 6.06271 0.95068 6.16148 0.774864 6.3373C0.59905 6.51311 0.500278 6.75157 0.500278 7.00021Z" fill="white" />
              </svg>

            </button>
          </div>
        </div>

        {/* Swiper Carousel */}
        <Swiper
          modules={[Navigation]}


          breakpoints={{
            0: { slidesPerView: 1 },
            768: { slidesPerView: 2 },
            1024: { slidesPerView: 3 },
          }}
          spaceBetween={30}
          onBeforeInit={(swiper) => {
            // @ts-expect-error: ignore TS error due to possible null
            swiper.params.navigation.prevEl = prevRef.current;
            // @ts-expect-error: ignore TS error due to possible null
            swiper.params.navigation.nextEl = nextRef.current;
          }}
          navigation={{
            prevEl: prevRef.current,
            nextEl: nextRef.current,
          }}
          onSwiper={(swiper) => setIsBeginning(swiper.isBeginning)}
          onSlideChange={(swiper) => setIsBeginning(swiper.isBeginning)}
        >
          {testimonials.map((testimonial, i) => (
            <SwiperSlide key={i}>
            <ReviewCard
            
            t={testimonial}
            
            
            />
            </SwiperSlide>
          ))}
        </Swiper>
      </section>

    );
};

export default ReviewCarousel2;