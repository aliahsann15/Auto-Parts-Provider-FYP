/* -------------------------------------------------
   Home page 
------------------------------------------------- */
"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import Image from "@/app/components/AppImage";
import Link from "next/link";
import React, { useState, useEffect, useMemo } from "react";
import { rockyBillyFont, moveXFont } from "./fonts";

import Productswithoutcarouseltab from "./components/product/products-carousel-without-tab";
import CarFilterForm from "./components/car-filter/car-filter-form";



/* ---------- Swiper ---------- */
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import { Autoplay } from 'swiper/modules';
import ReviewCarousel from "./components/review/review-carousel";
import ProductCarouselTab from "./components/product/product-carousel-tab";
import AddToCart from "./components/product/add-to-cart";


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

export interface Review {
  userId: string,
  userImage: string,
  userName: string
  rating: number,
  comment: string
  createdAt: string
}

export interface Product {
  _id: string
  images: string[]           // featured image path
  name: string
  brand: string
  carModel: string
  make: string
  variant: string
  sku: string
  status: 'active' | 'draft'
  price: number
  salePrice: number
  stock: number
  categories: string[]      // multiple categories
  description: string
  technicalDescription: string
  reviews: Review[]
  sellerId: string,
  sellerName: string,
  sellerImage: string
  itemsSold: number
}

/* -------------------------------------------------
   MAIN COMPONENT
------------------------------------------------- */
export default function Home({ products, tabs }: { products: Product[], tabs: string[] }) {


  /* Code For Product Carousel Tab Starts Here */
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [hoveredId, setHoveredId] = useState<Product["_id"] | null>(null);
  const filtered = useMemo(() => {
    return products?.filter((p) =>
      selectedCategory === "All" ? true : (p.categories as string[]).includes(selectedCategory)
    );
  }, [products, selectedCategory]);



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
          <Link className="rounded-[8px] text-[16px] uppercase bg-[#FFA500] py-[15px] px-[25px]" href="/request-a-part">Parts request</Link>

          <span className="bg-[rgba(255,255,255,0.1)] shadow-[-6px_4px_4px_0px_#00000070] w-fit min-w-[180px] text-center absolute top-[16px] xl:left-[100%] rounded-[3px] border-[0.5px] py-3 px-5">High Quality</span>
          <span className="bg-[rgba(255,255,255,0.1)] shadow-[-6px_4px_4px_0px_#00000070] w-fit min-w-[180px] text-center absolute top-[185px] xl:left-[130%] rounded-[3px] border-[0.5px] py-3 px-5">Customer Care</span>
          <span className="bg-[rgba(255,255,255,0.1)] shadow-[-6px_4px_4px_0px_#00000070] w-fit min-w-[180px] text-center absolute top-[356px] xl:left-[100%] rounded-[3px] border-[0.5px] py-3 px-5 temp">Original Part</span>
        </div>
      </div>

      {/* FORM */}
      <CarFilterForm />

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
      <div id="products">
        <ProductCarouselTab
          categories={tabs}
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
            <button className="bg-[#FFA500] hover:bg-[#e69500] text-white py-3 px-6 rounded">
              ORDER NOW
            </button>
          </div>

          {/* RIGHT SIDE: Image */}
          <div className="w-full lg:w-1/2">
            <Image
              src="/images/home4.png"
              alt="Engine image"
              width={600}
              height={400}
              className="w-full h-auto object-contain"
            />
          </div>
        </div>
      </section>
      {/* ===============================
     LATEST DEALS FOR THIS WEEK
================================= */}
      <section className="px-20 mt-20">
        {/* Section Heading */}
        <div className="w-[100%] flex py-6 border-b border-[#DEE2E6] justify-between">
          <div className=" w-fit flex items-center gap-[20px] ">
            <h3 className="text-[20px] font-[600] leading-[26px]">Latest Deals for This Week</h3>
            <p className="text-[14px] text-gray-400">
              Don’t miss out on this week’s deals
            </p>
          </div>
          <Link href="/tools" className="items-center  text-sm text-gray-500 hover:text-gray-700">
            View All →
          </Link>
        </div>

        {/* Deals Grid: 2 Left + 1 Center Offer + 2 Right */}
        <div className="flex pt-[30px]">
          <div className="flex flex-wrap gap-2 w-1/3 justify-start">
            {products?.slice(0, 4).map((product) => (
              <div key={product._id} className="w-[49%]">
                <DealCard product={product} />
              </div>
            ))}
          </div>

          {/* CENTER: Timed Special Offer */}
          <div className="mx-[20px] w-1/3 border-2 border-[#FFA500] rounded-lg p-6 flex flex-col items-center justify-start mb-4">
            {/* Header */}
            <div className="text-center mb-5 ">
              <h3 className="text-[#FFA500] font-[700] text-[27px] leading-7 mb-2.5">Timed special offer for you</h3>
              <p className="text-xs text-gray-500">
                Hurry before the deal ends. Limited stock available.
              </p>
            </div>

            {/*Countdown */}
            <CountdownTimer />


            {/* Product Image */}
            <div className="bg-white rounded-md border border-[#E9ECEF] p-4 w-full flex justify-center mb-4 h-[300px]">
              <Image src={products[0]?.images[0] || "/images/placeholder.png"} alt="Special Deal" width={1080} height={1080} className="w-[250px] h-auto object-contain" />
            </div>
            {/* stars */}
            <div className="flex items-start textali mb-[5px] w-full">
              {Array.from({ length: 5 }).map((_, i) =>
                products[0]?.reviews?.length > 0 && i < products[0]?.reviews[0]?.rating ? (
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
                {products[0]?.reviews?.length} review{products[0]?.reviews?.length !== 1 && "s"}
              </span>
            </div>
            {/* Product Info */}
            <h3 className="text-[20px] font-semibold w-full ">{products[0]?.name}</h3>
            {/* <p className="text-[16px] text-gray-500 mb-2 w-full">{products[0].storeName}</p> */}




            {/* price row */}
            <div className="flex items-center mb-4 gap-[20px] w-full">
              <div className="flex items-center gap-2 ">
                {products?.length > 0 && products[0]?.price && (
                  <span className="line-through text-[18px] text-gray-400">
                    {products[0]?.price}
                  </span>
                )}
                <span className="text-[19px] font-semibold text-red-600">
                  {products && products[0]?.salePrice}
                </span>
              </div>
            </div>

            {/* Buttons */}
            <AddToCart productName={products[0]?.name} productId={products[0]?._id} stock={products[0]?.stock} quantity={1} />
            <button className="w-full border mt-2 border-[#FFA500] text-sm rounded py-2 flex items-center justify-center gap-2">
              Chat with seller <Image src="/images/icons/chat.svg" alt="chat" width={20} height={20} className="w-5 h-5" />
            </button>

            {/* Stock Info */}
            <div className="flex flex-col justify-between w-full text-xs text-gray-500 mt-4">
              <div className="mb-2 flex gap-1"><Image
                src="/images/icons/stock.svg"
                alt="stock"
                width={15}
                height={15}
              />
                <span className="text-[14px] text-green-600">In Stock</span></div>
              <div className="mb-2 w-full  h-1 bg-gray-200 rounded-full relative overflow-hidden">
                <div className="h-full bg-[#FFA500] w-[72%]" />
              </div>
            </div>
            <div className="mb-2 flex gap-1 justify-between w-full">
              <span className="text-[14px] font-semibold">Available: 298</span>
              <span className="text-[14px] font-semibold">Sold: 298</span>
            </div>
          </div>

          {/* RIGHT SIDE: Reuse next 2 products */}
          <div className="flex flex-wrap gap-2 w-1/3 justify-end">
            {products && products.slice(0, 4).map((product) => (
              <div key={product._id} className="w-[49%]">
                <DealCard product={product} />
              </div>

            ))
            }


          </div>
        </div>
      </section>

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
            <button className="bg-white text-black text-sm py-2 px-5 rounded hover:bg-gray-100 w-fit self-center md:self-start">
              ORDER NOW
            </button>
          </div>
        </div>
      </section>
      {/* Home 7  */}
      <div className="px-[75px] mt-[50px] w-[100%] flex  border-[#DEE2E6] ">
        <div className="w-[100%] flex py-6 border-b border-[#DEE2E6] justify-between">
          <div className=" w-fit flex items-center gap-[20px] ">
            <h3 className="text-[20px] font-[600] leading-[26px]">Top Sell Products</h3>
            <p className="text-[14px] text-gray-400">
              Don’t miss out on this week’s deals
            </p>
          </div>
          <Link href="/tools" className="items-center  text-sm text-gray-500 hover:text-[#ffa500] hover:underline">
            View All →
          </Link>
        </div>
      </div>

      <Productswithoutcarouseltab
        products={products}
        hoveredId={hoveredId}
        setHoveredId={setHoveredId}

      />



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
      <div className="px-[75px]">
        <ReviewCarousel
          testimonials={testimonials}
        /></div>



      {/* Home 10 */}
      <section className="mx-[75px] bg-[#ffa500] rounded-[40px] px-[50px] py-20  my-16">
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

            <Image
              src="/images/newsletter.png"
              alt="Car parts"
              width={500}
              height={400}
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
      <Link href={"/product/" + product._id}>
        <div className="flex justify-center mb-3">
          <Image
            src={product.images[0]}
            alt={product.name}
            width={120}
            height={120}
            className="w-[120px] h-[120px] object-contain"
          />
        </div>
      </Link>

      {/* Name & Store */}
      <h3 className="text-[14px] font-semibold leading-tight min-h-[35px]">{product.name}</h3>
      <p className="text-xs text-gray-500 mb-2">{product.sellerName}</p>

      {/* Price */}
      <div className="mb-2">
        <p className="text-xs text-gray-400 line-through">{product.originalPrice}</p>
        <p className="text-md text-[#d90429] font-bold">{product.discountedPrice}</p>
      </div>

      {/* Buttons */}
      <div className="flex flex-col gap-2">
        <AddToCart productName={product.name} productId={product._id} stock={product.stock} quantity={1} />
        <button className="w-full border text-sm rounded py-2 flex items-center justify-center gap-2">
          Chat with seller <Image src="/images/icons/chat.svg" alt="chat" width={20} height={20} className="w-5 h-5" />
        </button>
      </div>

      {/* Stock */}
      <div className="text-xs text-green-600 mt-4 flex gap-1">
        <Image
          src="/images/icons/stock.svg"
          alt="stock"
          width={15}
          height={15}
        />In Stock
      </div>
    </div>
  );
}
