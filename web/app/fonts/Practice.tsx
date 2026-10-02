/* -------------------------------------------------
   Home page 
------------------------------------------------- */
"use client";

import Image from "@/app/components/AppImage";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import { rockyBillyFont, moveXFont } from "./fonts";
import { useRef } from "react";
import Productscarouseltab from "./components/product/product-carousel-tab";
import Productswithoutcarouseltab from "./components/product/products-carousel-without-tab";


/* ---------- Swiper ---------- */
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import { Autoplay } from 'swiper/modules';

/* -------------------------------------------------
   TYPES & MOCK DATA
------------------------------------------------- */
type Category =
  | "Auto Safety & Security"
  | "Interior Accessories"
  | "Tires & Wheels"
  | "Tools & Equipment"
  | "All";

  const products = [
    {
      id: 1,
      discountBadge: "SUPER PRICE",
      images: ["/images/placeholder-product.png", "/images/placeholder-product-2.png"],
      name: "Car Alarm with Charging",
      storeName: "@Amir Store",
      originalPrice: "$51.99",
      discountedPrice: "$47.99",
      rating: 5,
      reviewsCount: 1,
      inStock: true,
      category: "Auto Safety & Security",
    },
    {
      id: 2,
      discountBadge: "21%",
      images: ["/images/placeholder-product.png", "/images/placeholder-product-2.png"],
      name: "Right Stuff® – Drilled & Slotted",
      storeName: "@Rotor Store",
      originalPrice: "$199.37",
      discountedPrice: "$157.99",
      rating: 4,
      reviewsCount: 1,
      inStock: true,
      category: "Tires & Wheels",
    },
  
  
    {
      id: 3,
      discountBadge: "21%",
      images: ["/images/placeholder-product.png", "/images/placeholder-product-2.png"],
      name: "Right Stuff® – Drilled & Slotted",
      storeName: "@Rotor Store",
      originalPrice: "$199.37",
      discountedPrice: "$157.99",
      rating: 4,
      reviewsCount: 1,
      inStock: true,
      category: "Tires & Wheels",
    },
    {
      id: 4,
      discountBadge: "21%",
      images: ["/images/placeholder-product.png", "/images/placeholder-product-2.png"],
      name: "Right Stuff® – Drilled & Slotted",
      storeName: "@Rotor Store",
      originalPrice: "$199.37",
      discountedPrice: "$157.99",
      rating: 4,
      reviewsCount: 1,
      inStock: true,
      category: "Tires & Wheels",
    },
    {
      id: 5,
      discountBadge: "21%",
      images: ["/images/placeholder-product.png", "/images/placeholder-product-2.png"],
      name: "Right Stuff® – Drilled & Slotted",
      storeName: "@Rotor Store",
      originalPrice: "$199.37",
      discountedPrice: "$157.99",
      rating: 4,
      reviewsCount: 1,
      inStock: true,
      category: "Tires & Wheels",
    },
    {
      id: 6,
      discountBadge: "21%",
      images: ["/images/placeholder-product.png", "/images/placeholder-product-2.png"],
      name: "Right Stuff® – Drilled & Slotted",
      storeName: "@Rotor Store",
      originalPrice: "$199.37",
      discountedPrice: "$157.99",
      rating: 4,
      reviewsCount: 1,
      inStock: true,
      category: "Tires & Wheels",
    },
  
    /* …add more products… */
  ];



/* ---------- Countdown Timer ---------- */
const CountdownTimer = () => {
  const [timeLeft, setTimeLeft] = useState(3600); // 1 hour in seconds

  // Convert seconds to HH:MM:SS
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return {
      hrs: String(hrs).padStart(2, "0"),
      mins: String(mins).padStart(2, "0"),
      secs: String(secs).padStart(2, "0"),
    };
  };

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const { hrs, mins, secs } = formatTime(timeLeft);

  return (
    <div className="flex justify-center align-middle gap-2 mb-5 text-[#ffffff] font-bold text-lg">
      <span className="bg-[#FFA500] px-2.5 py-2 rounded-sm">{hrs}</span> <span className="flex py-2 justify-center text-[#B8BDC1]">:</span> <span className="bg-[#FFA500] px-2.5 py-2 rounded-sm">{mins}</span> <span className="flex py-2 justify-center text-[#B8BDC1]">:</span><span className="bg-[#FFA500] px-2.5 py-2 rounded-sm">{secs}</span>
    </div>
  );
};

const slides = [
  {
    id: 1,
    bg: '/images/home6-1.jpg', // Your image path
    discount: '50%',
    title: 'HOT OFFER ON AUTO PARTS!',
    subtitle: "Don't miss out – limited stock available!",
    button: 'Explore More',
    image: '/images/home6-1-1.png' // Your car image
  },
  {
    id: 2,
    bg: '/images/home6-2.jpg', // Your image path
    discount: '50%',
    title: 'HOT OFFER ON AUTO PARTS!',
    subtitle: "Don't miss out – limited stock available!",
    button: 'Explore More',
    image: '/images/home6-1-1.png' // Your car image
  },


  // Add more slides if needed
];

const testimonials = [
  {
    name: "Marry Wil.",
    title: "Engineer",
    img: "/images/client.jpeg",
    text: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry’s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled i.",
  },
  {
    name: "John D.",
    title: "Bank Manager",
    img: "/images/client.jpeg",
    text: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled i.",
  },
  {
    name: "Cokwl",
    title: "Doctor",
    img: "/images/client.jpeg",
    text: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled i.",
  },
  {
    name: "David",
    title: "Doctor",
    img: "/images/client.jpeg",
    text: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled i.",
  },
];



/* -------------------------------------------------
   MAIN COMPONENT
------------------------------------------------- */
export default function Home() {
  const prevRef = useRef(null);
  const nextRef = useRef(null);

/* Code For Product Carousel Tab Starts Here */
  const [selectedCategory, setSelectedCategory] = useState<Category>("All");
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const Products = [
    {
      id: 1,
      discountBadge: "SUPER PRICE",
      images: ["/images/placeholder-product.png", "/images/placeholder-product-2.png"],
      name: "Car Alarm with Charging",
      storeName: "@Amir Store",
      originalPrice: "$51.99",
      discountedPrice: "$47.99",
      rating: 5,
      reviewsCount: 1,
      inStock: true,
      category: "Auto Safety & Security",
    },
    {
      id: 2,
      discountBadge: "21%",
      images: ["/images/placeholder-product.png", "/images/placeholder-product-2.png"],
      name: "Right Stuff® – Drilled & Slotted",
      storeName: "@Rotor Store",
      originalPrice: "$199.37",
      discountedPrice: "$157.99",
      rating: 4,
      reviewsCount: 1,
      inStock: true,
      category: "Tires & Wheels",
    },
  
  
    {
      id: 3,
      discountBadge: "21%",
      images: ["/images/placeholder-product.png", "/images/placeholder-product-2.png"],
      name: "Right Stuff® – Drilled & Slotted",
      storeName: "@Rotor Store",
      originalPrice: "$199.37",
      discountedPrice: "$157.99",
      rating: 4,
      reviewsCount: 1,
      inStock: true,
      category: "Tires & Wheels",
    },
    {
      id: 4,
      discountBadge: "21%",
      images: ["/images/placeholder-product.png", "/images/placeholder-product-2.png"],
      name: "Right Stuff® – Drilled & Slotted",
      storeName: "@Rotor Store",
      originalPrice: "$199.37",
      discountedPrice: "$157.99",
      rating: 4,
      reviewsCount: 1,
      inStock: true,
      category: "Tires & Wheels",
    },
    {
      id: 5,
      discountBadge: "21%",
      images: ["/images/placeholder-product.png", "/images/placeholder-product-2.png"],
      name: "Right Stuff® – Drilled & Slotted",
      storeName: "@Rotor Store",
      originalPrice: "$199.37",
      discountedPrice: "$157.99",
      rating: 4,
      reviewsCount: 1,
      inStock: true,
      category: "Tires & Wheels",
    },
    {
      id: 6,
      discountBadge: "21%",
      images: ["/images/placeholder-product.png", "/images/placeholder-product-2.png"],
      name: "Right Stuff® – Drilled & Slotted",
      storeName: "@Rotor Store",
      originalPrice: "$199.37",
      discountedPrice: "$157.99",
      rating: 4,
      reviewsCount: 1,
      inStock: true,
      category: "Tires & Wheels",
    },
  
    /* …add more products… */
  ];
  const filtered = Products.filter((p) =>
    selectedCategory === "All" ? true : p.category === selectedCategory
  );
/* Code For Product Carousel Tab Ends Here */

/* Code For Product Carousel Without Tab Starts Here */

const Products1 = [
  {
    id: 1,
    discountBadge: "SUPER PRICE",
    images: ["/images/placeholder-product.png", "/images/placeholder-product-2.png"],
    name: "Car Alarm with Charging",
    storeName: "@Amir Store",
    originalPrice: "$51.99",
    discountedPrice: "$47.99",
    rating: 5,
    reviewsCount: 1,
    inStock: true,
    category: "Auto Safety & Security",
  },
  {
    id: 2,
    discountBadge: "21%",
    images: ["/images/placeholder-product.png", "/images/placeholder-product-2.png"],
    name: "Right Stuff® – Drilled & Slotted",
    storeName: "@Rotor Store",
    originalPrice: "$199.37",
    discountedPrice: "$157.99",
    rating: 4,
    reviewsCount: 1,
    inStock: true,
    category: "Tires & Wheels",
  },


  {
    id: 3,
    discountBadge: "21%",
    images: ["/images/placeholder-product.png", "/images/placeholder-product-2.png"],
    name: "Right Stuff® – Drilled & Slotted",
    storeName: "@Rotor Store",
    originalPrice: "$199.37",
    discountedPrice: "$157.99",
    rating: 4,
    reviewsCount: 1,
    inStock: true,
    category: "Tires & Wheels",
  },
  {
    id: 4,
    discountBadge: "21%",
    images: ["/images/placeholder-product.png", "/images/placeholder-product-2.png"],
    name: "Right Stuff® – Drilled & Slotted",
    storeName: "@Rotor Store",
    originalPrice: "$199.37",
    discountedPrice: "$157.99",
    rating: 4,
    reviewsCount: 1,
    inStock: true,
    category: "Tires & Wheels",
  },
  {
    id: 5,
    discountBadge: "21%",
    images: ["/images/placeholder-product.png", "/images/placeholder-product-2.png"],
    name: "Right Stuff® – Drilled & Slotted",
    storeName: "@Rotor Store",
    originalPrice: "$199.37",
    discountedPrice: "$157.99",
    rating: 4,
    reviewsCount: 1,
    inStock: true,
    category: "Tires & Wheels",
  },
  {
    id: 6,
    discountBadge: "21%",
    images: ["/images/placeholder-product.png", "/images/placeholder-product-2.png"],
    name: "Right Stuff® – Drilled & Slotted",
    storeName: "@Rotor Store",
    originalPrice: "$199.37",
    discountedPrice: "$157.99",
    rating: 4,
    reviewsCount: 1,
    inStock: true,
    category: "Tires & Wheels",
  },

  /* …add more products… */
];

/* Code For Product Without Carousel Tab Ends Here */

  const [isBeginning, setIsBeginning] = useState(true);

  return (
    <main>
      {/* HERO */}
      <div className="px-[100px] relative flex flex-col justify-center text-white min-h-[100vh]">
        <div className="absolute inset-0 bg-[url(/images/hero-image.jpeg)] bg-cover bg-center" />
        <div className="absolute inset-0 bg-black opacity-50" />
        <div className="relative z-10 max-w-[700px]">
          <h2 className={`text-[#FFA500] ${rockyBillyFont.className}`}>This week only for premier offers</h2>
          <h1 className={`${moveXFont.className} uppercase text-[56px] leading-[100%] mb-4 mt-8`}>Top Products in High Quality</h1>
          <p className="mb-12">Lorem ipsum dolor sit amet consectetur adipisicing elit. Eveniet, aut iusto deleniti aperiam ducimus necessitatibus doloremque praesentium autem similique.</p>
          <Link className="rounded-[8px] text-[24px] uppercase font-bold bg-[#FFA500] py-[10px] px-[18px]" href="#">Parts request</Link>

          <span className="bg-[rgba(255,255,255,0.1)] shadow-[-6px_4px_4px_0px_#00000070] w-fit min-w-[180px] text-center absolute top-[16px] xl:left-[100%] rounded-[3px] border-[0.5px] py-3 px-5">High Quality</span>
          <span className="bg-[rgba(255,255,255,0.1)] shadow-[-6px_4px_4px_0px_#00000070] w-fit min-w-[180px] text-center absolute top-[152px] xl:left-[150%] rounded-[3px] border-[0.5px] py-3 px-5">Customer Care</span>
          <span className="bg-[rgba(255,255,255,0.1)] shadow-[-6px_4px_4px_0px_#00000070] w-fit min-w-[180px] text-center absolute top-[356px] xl:left-[120%] rounded-[3px] border-[0.5px] py-3 px-5">Original Parts</span>
        </div>
      </div>
      {/* FORM */}
      <div className="text-white bg-[#FFA500] shadow-[0px_4px_4px_-1px_#2125290F] rounded-[18px] px-10 py-8 mx-[100px] relative -mt-[100px] z-20">
        <div className="border-b border-[rgba(255,255,255,0.3)] pb-10">
          <h3 className="text-[30px] font-bold">Find the right parts faster</h3>
          <p>Lorem ipsum dolor sit amet consectetur, adipisicing elit. Vel, quidem eligendi, nostrum quibusdam ipsum necessitatibus debitis atque cumque et voluptatibus eaque ut quae nemo voluptatem inventore commodi praesentium vitae. Voluptates?</p>
        </div>
        <div className="py-10 flex gap-4">
          <div className="w-1/4">
            <select id="make" className="bg-white text-black rounded-[10px] p-[9px] w-full">
              <option>Select Make</option>
            </select>
          </div>
          <div className="w-1/4">
            <select id="make" className="bg-white text-black rounded-[10px] p-[9px] w-full">
              <option>Select maker model</option>
            </select>
          </div>
          <div className="w-1/4">
            <select id="make" className="bg-white text-black rounded-[10px] p-[9px] w-full">
              <option>Select Year</option>
            </select>
          </div>
          <div className="w-1/4">
            <button className="w-full h-full rounded-[10px] border-2 border-white capitalize">Find auto parts</button>
          </div>
        </div>
      </div>

      {/* TOP BRANDS */}
      <div className="mt-20 flex flex-col justify-center items-center">
        <div className="text-center">
          <h2 className="font-bold text-[32px]">OUR TOP BRANDS</h2>
          <p className="text-[#868E96]">Lorem ipsum dolor sit amet consectetur, adipisicing elit. Ad libero eius amet velit inventore saepe.</p>
        </div>
        <div className="w-full justify-center flex gap-[80px] mt-12 px-20">
          <div className="w-full">
            <Image width={130} height={75} alt="Redcar" src="/images/red-car.png" />
          </div>
          <div className="w-full">
            <Image width={130} height={75} alt="Redcar" src="/images/auto-car.png" />
          </div>
          <div className="w-full">
            <Image width={130} height={75} alt="Redcar" src="/images/corporate.png" />
          </div>
          <div className="w-full">
            <Image width={130} height={75} alt="Redcar" src="/images/detroit.png" />
          </div>
          <div className="w-full">
            <Image width={130} height={75} alt="Redcar" src="/images/phone-plaent.png" />
          </div>
        </div>
      </div>

      {/* ------------- FEATURED PRODUCTS ------------- */}
      <div>
      <Productscarouseltab
        products={Products}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        hoveredId={hoveredId}
        setHoveredId={setHoveredId}
        filtered={filtered}
      />
    </div>
      {/* ========================
     BRAKE SYSTEM BANNER
=========================== */}
      <section className="bg-[#121212] text-white w-full my-[100px]">
        <div className=" mx-auto flex flex-col lg:flex-row items-center justify-between gap-12">

          {/* LEFT SIDE: Text Content */}
          <div className="w-full lg:w-1/2 px-[70px]">
            {/* Tag above the heading */}
            <span className="inline-block bg-[#FFA500] text-white text-sm font-semibold py-1 px-4 rounded-full mb-4">
              On Sale This Week
            </span>

            {/* Main Heading */}
            <h2 className="text-3xl md:text-4xl font-bold leading-tight mb-4">
              Use Only The Best Brake System<br />
              Recommended For Your Vehicle
            </h2>

            {/* Supporting text */}
            <p className="text-gray-400 mb-8">
              Plakrore maheten. Astronens ultranirad. Dod. Mms pal.
              Fysisk cd megade vägisk.
            </p>

            {/* Call-to-Action Button */}
            <button className="bg-[#FFA500] hover:bg-[#e69500] text-white font-bold py-3 px-6 rounded">
              ORDER NOW
            </button>
          </div>

          {/* RIGHT SIDE: Image */}
          <div className="w-full lg:w-1/2">
            <img
              src="/images/home4.png" // <-- replace with your image path
              alt="Engine image"
              className="w-full h-auto object-contain"
            />
          </div>
        </div>
      </section>
      {/* ===============================
     LATEST DEALS FOR THIS WEEK
================================= */}
      <div>
      <Productswithoutcarouseltab
        products={Products1}
        hoveredId={hoveredId}
        setHoveredId={setHoveredId}
  
      />
    </div>

      {/* Home 6 */}
      <section className="w-full my-10 px-[75px]  ">
        <div className="h-[350px] rounded-[15px] bg-gradient-to-r from-[#1c1c1c] via-[#121212] to-[#1c1c1c] px-[100px] text-white flex flex-col md:flex-row justify-between items-center gap-8">

          {/* LEFT TEXT */}
          <div className="text-[50px] font-[600] leading-tight text-center md:text-left">
            Find Best <br />
            Part Today!
          </div>

          {/* RIGHT CONTENT */}
          <div className="flex flex-col gap-6 text-center md:text-left">
            <p className="text-[18px] text-gray-300 max-w-[400px]">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua
              Lorem ipsum dolor sit amet, consectetur adipiscing elit.
            </p>
            <button className="bg-white text-black text-sm font-semibold py-2 px-5 rounded hover:bg-gray-100 w-fit self-center md:self-start">
              ORDER NOW
            </button>
          </div>
        </div>
      </section>
      {/* Home 7  */}
      <section className="w-full mt-[100px] mb-[70px] px-[75px]  ">
        {/* Section Heading */}
        <div className="w-[100%] flex py-6 border-b border-[#DEE2E6] justify-between">
          <div className=" w-fit flex items-center gap-[20px] ">
            <h3 className="text-[20px] font-[800] leading-[26px]">Top sell Products</h3>
            <p className="text-[14px] text-gray-400">
              Don’t miss out on this week’s deals
            </p>
          </div>
          <a href="#" className="items-center  text-sm text-gray-500 hover:text-gray-700">
            View All →
          </a>
        </div>
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
          {filtered.map((p) => {
            const isHover = hoveredId === p.id;
            const img = isHover && p.images[1] ? p.images[1] : p.images[0];
            return (
              <SwiperSlide className="w-full" key={p.id}>
                <div
                  className="w-full pb-[80px]"
                  onMouseEnter={() => setHoveredId(p.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {/* badge */}
                  {p.discountBadge && (
                    <span className=" z-50 absolute top-[10px] left-[25px] bg-[#F03E3E] text-white px-[10px] py-[6px] rounded-[5px] text-xs font-bold shadow">
                      {p.discountBadge}
                    </span>
                  )}

                  {/* image box */}
                  <div className="border rounded-[15px] border-gray-200 p-[10px] mb-[10px] flex justify-center relative">
                    <Image
                      width={252}
                      height={235}
                      src={img}
                      alt={p.name}
                      className="object-contain rounded-[10px]"
                    />
                    <span className="iconBtn absolute top-[13px] right-[5px]">
                      <Image
                        src="/images/icons/favourite.svg"
                        alt="fav"
                        width={20}
                        height={20}
                      />
                    </span>
                  </div>

                  <h3 className="text-[18px] font-semibold mb-1">{p.name}</h3>
                  <p className="text-[14px] text-gray-500 mb-2">{p.storeName}</p>

                  {/* stars */}
                  {/* stars */}
                  <div className="flex items-center mb-[10px]">
                    {Array.from({ length: 5 }).map((_, i) =>
                      i < p.rating ? (
                        /* —— FILLED —— */
                        <svg
                          key={i}
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="w-4 h-4 text-[#FFA500]"
                        >
                          <path d="M11.048 2.927a1 1 0 011.904 0l1.518 4.674a1
                 1 0 00.95.69h4.91c.969 0 1.371 1.24.588
                 1.81l-3.977 2.89a1 1 0 00-.364 1.118l1.518
                 4.674c.3.922-.755 1.688-1.54
                 1.118l-3.977-2.89a1 1 0 00-1.176
                 0l-3.977 2.89c-.784.57-1.838-.196-1.538-1.118l1.517-4.674a1
                 1 0 00-.364-1.118l-3.977-2.89c-.783-.57-.38-1.81.589-1.81h4.91a1
                 1 0 00.95-.69l1.518-4.674z" />
                        </svg>
                      ) : (
                        /* —— OUTLINE ——  (stroke only) */
                        <svg
                          key={i}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-4 h-4 text-gray-300"
                        >
                          <path d="M11.048 2.927a1 1 0 011.904 0l1.518 4.674a1
                 1 0 00.95.69h4.91c.969 0 1.371 1.24.588
                 1.81l-3.977 2.89a1 1 0 00-.364 1.118l1.518
                 4.674c.3.922-.755 1.688-1.54
                 1.118l-3.977-2.89a1 1 0 00-1.176
                 0l-3.977 2.89c-.784.57-1.838-.196-1.538-1.118l1.517-4.674a1
                 1 0 00-.364-1.118l-3.977-2.89c-.783-.57-.38-1.81.589-1.81h4.91a1
                 1 0 00.95-.69l1.518-4.674z" />
                        </svg>
                      )
                    )}
                    <span className="text-xs text-gray-500 ml-2">
                      {p.reviewsCount} review{p.reviewsCount !== 1 && "s"}
                    </span>
                  </div>


                  {/* price row */}
                  <div className="flex items-center  justify-between gap-[20px] ">
                    <div className="flex items-center gap-2 ">
                      {p.originalPrice && (
                        <span className="line-through text-[14px] text-gray-400">
                          {p.originalPrice}
                        </span>
                      )}
                      <span className="text-[15px] font-semibold text-red-600">
                        {p.discountedPrice}
                      </span>
                    </div>

                    {/* icons & stock */}
                    <div className="flex items-center gap-4 justify-end">
                      <span className="iconBtn bg-[#F1F3F5] rounded-[10px] p-[8px]">
                        <Image
                          src="/images/icons/chat.svg"
                          alt="chat"
                          width={25}
                          height={25}
                        />
                      </span>
                      <span className="iconBtn bg-[#F1F3F5] rounded-[10px] p-[8px]">
                        <Image
                          src="/images/icons/cart.svg"
                          alt="cart"
                          width={25}
                          height={20}
                        />
                      </span>

                    </div>
                  </div>
                  <span className="flex items-center gap-[5px] text-sm mb-[15px] ">
                    <Image
                      src="/images/icons/stock.svg"
                      alt="stock"
                      width={15}
                      height={15}
                    />
                    <span className={p.inStock ? "text-green-600" : "text-red-500"}>
                      {p.inStock ? "In Stock" : "Out of Stock"}
                    </span>
                  </span>
                  <button className="bg-[#FFA500] hover:bg-[#FFA500] text-white text-sm w-full py-[10px] rounded">
                    Add to Cart
                  </button>
                </div>
              </SwiperSlide>
            );
          })}
        </Swiper>
      </section>


      {/* Home 8  */}
      <section className="home8 w-full px-[75px] py-10">
        <Swiper
          modules={[Pagination, Autoplay]} // include Autoplay
          pagination={{ clickable: true }}
          autoplay={{
            delay: 3000, // change slide every 3 seconds
            disableOnInteraction: false, // keeps autoplay running after user interacts
          }}
          spaceBetween={30}
          loop
          className="rounded-[15px] overflow-hidden"
        >
          {slides.map((slide) => (
            <SwiperSlide key={slide.id}>
              <div
                className="flex flex-col md:flex-row items-center justify-between px-[70px] py-12 bg-cover bg-center text-white"
                style={{ backgroundImage: `url(${slide.bg})` }}
              >
                {/* LEFT SIDE */}
                <div className="max-w-xl text-center md:text-left">
                  <h1 className="text-[100px] font-extrabold leading-none">{slide.discount}</h1>
                  <h2 className="text-[24px] font-semibold mt-2">{slide.title}</h2>
                  <p className="text-[16px] mt-2 mb-6">{slide.subtitle}</p>
                  <button className="bg-white text-black text-[16px] font-semibold py-3 px-5 rounded hover:bg-gray-100 inline-flex items-center gap-2">
                    {slide.button}
                    <span>↗</span>
                  </button>
                </div>

                {/* RIGHT SIDE IMAGE */}
                <div className="mt-6 md:mt-0">
                  <Image
                    src={slide.image}
                    alt="Banner Car"
                    width={500}
                    height={300}
                    className="object-contain"
                  />
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </section>
      {/* Home 9  */}
      <section className="bg-white py-20 px-[75px]">
        {/* Heading + Navigation */}
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-[32px] font-[800] text-black">What Our Client Said About Us</h2>
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
                <path ="evenodd" clipRule="evenodd" d="M0.500278 7.00021C0.500278 7.24885 0.59905 7.48731 0.774864 7.66312C0.95068 7.83894 1.18914 7.93771 1.43778 7.93771H12.2997L8.27403 11.9615C8.18686 12.0486 8.11772 12.1521 8.07055 12.266C8.02337 12.3799 7.99909 12.5019 7.99909 12.6252C7.99909 12.7485 8.02337 12.8705 8.07055 12.9844C8.11772 13.0983 8.18686 13.2018 8.27403 13.289C8.36119 13.3761 8.46467 13.4453 8.57856 13.4924C8.69244 13.5396 8.81451 13.5639 8.93778 13.5639C9.06105 13.5639 9.18311 13.5396 9.297 13.4924C9.41088 13.4453 9.51436 13.3761 9.60153 13.289L15.2265 7.66396C15.3138 7.57687 15.3831 7.47342 15.4304 7.35952C15.4776 7.24562 15.502 7.12352 15.502 7.00021C15.502 6.87689 15.4776 6.75479 15.4304 6.6409C15.3831 6.527 15.3138 6.42354 15.2265 6.33646L9.60153 0.711458C9.42549 0.53542 9.18673 0.436523 8.93778 0.436523C8.68882 0.436523 8.45006 0.53542 8.27403 0.711458C8.09799 0.887495 7.99909 1.12625 7.99909 1.37521C7.99909 1.62416 8.09799 1.86292 8.27403 2.03896L12.2997 6.06271H1.43778C1.18914 6.06271 0.95068 6.16148 0.774864 6.3373C0.59905 6.51311 0.500278 6.75157 0.500278 7.00021Z" fill="white" />
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
            // @ts-ignore: ignore TS error due to possible null
            swiper.params.navigation.prevEl = prevRef.current;
            // @ts-ignore
            swiper.params.navigation.nextEl = nextRef.current;
          }}
          navigation={{
            prevEl: prevRef.current,
            nextEl: nextRef.current,
          }}
          onSwiper={(swiper) => setIsBeginning(swiper.isBeginning)}
          onSlideChange={(swiper) => setIsBeginning(swiper.isBeginning)}
        >
          {testimonials.map((t, i) => (
            <SwiperSlide key={i}>
              <div
                className="p-8 rounded-[32px] h-full text-black bg-[#D9D9D9]"

              >
                <div className="flex items-center gap-4 mb-4">
                  <img
                    src={t.img}
                    alt={t.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="text-lg font-semibold leading-tight">
                      {t.name}
                    </h4>
                    <p className="text-sm opacity-80 font-medium">{t.title}</p>
                  </div>
                </div>
                <p className="text-sm leading-6">{t.text}</p>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </section>
      {/* Home 10 */}
      <section className="mx-[75px] bg-[#F4A825] rounded-[40px] px-[50px] py-20  my-16">
        {/* Outer section with orange background and large rounded corners */}

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
          {/* Responsive layout:
        - On small screens: column layout (text above image)
        - On medium and up: row layout (text beside image)
        - 'gap-10' adds spacing between text and image
    */}

          {/* =============== LEFT SIDE =============== */}
          <div className="w-full  md:w-1/2">
            {/* Left column for text and form */}

            {/* Heading */}
            <h2 className="text-4xl font-bold text-black mb-4">
              Subscribe Our Newsletter
            </h2>

            {/* Paragraph / Description */}
            <p className="text-md text-black/80 mb-8">
              Lorem ipsum dolor sit amet consectetur. Feugiat ut aliquet sit pellentesque
              sollicitudin. Egestas faucibus lacus diam in senectus consectetur. Mattis elit
              adipiscing quisque tellus scelerisque vehicula ante nunc.
            </p>

            {/* Email form (not functional yet) */}
            <form
              onSubmit={(e) => e.preventDefault()} // prevent page refresh for now
              className="flex rounded-lg overflow-hidden  w-full max-w-xl"
            >
              {/* Email input field */}
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 p-4 text-sm outline-none text-black bg-white border-0"
              />

              {/* Submit button */}
              <button
                type="submit"
                className="bg-black text-white px-6 font-semibold text-sm hover:bg-gray-800 transition-all"
              >
                Get a Quote
              </button>
            </form>
          </div>

          {/* =============== RIGHT SIDE =============== */}
          <div className="w-full md:w-1/2 flex justify-end">
            {/* Image of car parts - make sure the path is correct */}

            <img
              src="/images/newsletter.png" // ✅ Change this path to your actual image
              alt="Car parts"
              className="max-w-full h-auto object-contain"
            />
          </div>
        </div>
      </section>


    </main>
  );
}
// Reusable single product card
function DealCard({ product }: { product: any }) {
  return (
    <div className="border border-[#DEE2E6] rounded-lg p-4 relative w-full">
      {/* Badge */}
      {product.discountBadge && (
        <div className="absolute top-3 left-3 bg-[#FFA500] text-white text-xs font-bold px-2 py-1 rounded">
          {product.discountBadge}
        </div>
      )}

      {/* Product Image */}
      <div className="flex justify-center mb-3">
        <img src={product.images[0]} alt={product.name} className="w-[120px] h-[120px] object-contain" />
      </div>

      {/* Name & Store */}
      <h3 className="text-[14px] font-semibold leading-tight min-h-[35px]">{product.name}</h3>
      <p className="text-xs text-gray-500 mb-2">{product.storeName}</p>

      {/* Price */}
      <div className="mb-2">
        <p className="text-xs text-gray-400 line-through">{product.originalPrice}</p>
        <p className="text-md text-[#d90429] font-bold">{product.discountedPrice}</p>
      </div>

      {/* Buttons */}
      <div className="flex flex-col gap-2">
        <button className="w-full  bg-black text-white py-2 rounded text-sm flex items-center justify-center gap-2">
          Add to cart <svg viewBox="0 0 28 28" fill="#ffffff" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
            <path d="M8.79881 25.49C8.21594 25.49 7.6872 25.3526 7.21258 25.0778C6.73796 24.803 6.36326 24.4283 6.08848 23.9537C5.8137 23.4791 5.67631 22.9504 5.67631 22.3675C5.67631 21.7846 5.8137 21.2559 6.08848 20.7813C6.36326 20.3066 6.73796 19.9319 7.21258 19.6572C7.6872 19.3824 8.21594 19.245 8.79881 19.245C9.38167 19.245 9.91042 19.3824 10.385 19.6572C10.8597 19.9319 11.2344 20.3066 11.5091 20.7813C11.7839 21.2559 11.9213 21.7846 11.9213 22.3675C11.9213 22.9504 11.7839 23.4791 11.5091 23.9537C11.2344 24.4283 10.8597 24.803 10.385 25.0778C9.91042 25.3526 9.38167 25.49 8.79881 25.49ZM8.79881 21.3183C8.4824 21.3183 8.23259 21.4141 8.04941 21.6056C7.86622 21.7971 7.77463 22.0511 7.77463 22.3675C7.77463 22.6839 7.86622 22.9379 8.04941 23.1294C8.23259 23.3209 8.4824 23.4167 8.79881 23.4167C9.11522 23.4167 9.36919 23.3209 9.5607 23.1294C9.75221 22.9379 9.84797 22.6839 9.84797 22.3675C9.84797 22.0511 9.75221 21.7971 9.5607 21.6056C9.36919 21.4141 9.11522 21.3183 8.79881 21.3183ZM21.2888 25.49C20.7059 25.49 20.1772 25.3526 19.7026 25.0778C19.228 24.803 18.8533 24.4283 18.5785 23.9537C18.3037 23.4791 18.1663 22.9504 18.1663 22.3675C18.1663 21.7846 18.3037 21.2559 18.5785 20.7813C18.8533 20.3066 19.228 19.9319 19.7026 19.6572C20.1772 19.3824 20.7059 19.245 21.2888 19.245C21.8717 19.245 22.4004 19.3824 22.875 19.6572C23.3497 19.9319 23.7244 20.3066 23.9991 20.7813C24.2739 21.2559 24.4113 21.7846 24.4113 22.3675C24.4113 22.9504 24.2739 23.4791 23.9991 23.9537C23.7244 24.4283 23.3497 24.803 22.875 25.0778C22.4004 25.3526 21.8717 25.49 21.2888 25.49ZM21.2888 21.3183C20.9724 21.3183 20.7226 21.4141 20.5394 21.6056C20.3562 21.7971 20.2646 22.0511 20.2646 22.3675C20.2646 22.6839 20.3562 22.9379 20.5394 23.1294C20.7226 23.3209 20.9724 23.4167 21.2888 23.4167C21.6052 23.4167 21.8592 23.3209 22.0507 23.1294C22.2422 22.9379 22.338 22.6839 22.338 22.3675C22.338 22.0511 22.2422 21.7971 22.0507 21.6056C21.8592 21.4141 21.6052 21.3183 21.2888 21.3183ZM20.6643 18.1958C20.6477 18.1958 20.6227 18.1958 20.5894 18.1958H20.6643H9.64813C8.86542 18.1958 8.17431 17.9377 7.57479 17.4215C6.97527 16.9052 6.62555 16.264 6.52563 15.498L4.85197 3.53257C4.85197 3.28277 4.74372 3.06211 4.52723 2.8706C4.31074 2.67909 4.06926 2.58333 3.80281 2.58333H1.52963C1.21322 2.58333 0.959252 2.49174 0.767739 2.30855C0.576225 2.12536 0.480469 1.87556 0.480469 1.55915C0.480469 1.24274 0.576225 0.988773 0.767739 0.79726C0.959252 0.605747 1.21322 0.509991 1.52963 0.509991H3.80281C4.58552 0.509991 5.27663 0.768118 5.87615 1.28437C6.47567 1.80062 6.82539 2.44178 6.92531 3.20783L7.25005 5.70583H24.4113C24.7777 5.70583 25.0608 5.84738 25.2606 6.13049C25.3439 6.21376 25.4022 6.33866 25.4355 6.50519C25.4521 6.60511 25.4605 6.75499 25.4605 6.95483L23.6869 15.6978C23.537 16.4306 23.179 17.0301 22.6127 17.4964C22.0465 17.9627 21.3971 18.1958 20.6643 18.1958ZM20.5644 16.1225C20.8308 16.1225 21.0598 16.0476 21.2513 15.8977C21.4429 15.7478 21.5636 15.548 21.6135 15.2982L23.1623 7.80415H7.54981L8.49905 15.1733C8.54901 15.4397 8.67391 15.6645 8.87375 15.8477C9.07359 16.0309 9.29841 16.1225 9.54821 16.1225H20.5644Z" fill="#ffffff" />
          </svg>

        </button>
        <button className="w-full border text-sm rounded py-2 flex items-center justify-center gap-2">
          Chat with seller <img src="/images/icons/chat.svg" className="w-5 h-5" />
        </button>
      </div>

      {/* Stock */}
      <div className="text-xs text-green-600 mt-4 flex gap-1"><Image
        src="/images/icons/stock.svg"
        alt="stock"
        width={15}
        height={15}
      />In Stock</div>
    </div>
  );
}

/* ------------- tiny utility classes ------------- */
/* add to a global CSS file or Tailwind @apply */
{/* 
.floatBadge{ @apply bg-[rgba(255,255,255,0.1)] shadow-[-6px_4px_4px_#00000070] w-fit min-w-[180px] text-center absolute top-[16px] xl:left-[100%] rounded-[3px] border border-white/30 py-3 px-5; }
.iconBtn   { @apply shadow-sm p-[8px] border border-[#E9ECEF] rounded-full; }
*/}
