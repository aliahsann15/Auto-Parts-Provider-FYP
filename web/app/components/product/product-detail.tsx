'use client'

import { useState, useRef, useEffect, useActionState } from 'react'
import Image from '@/app/components/AppImage'
import { Swiper, SwiperSlide } from 'swiper/react'
import type { Swiper as SwiperClass } from 'swiper'
import 'swiper/css'
import { Navigation } from 'swiper/modules'
import { Product, Review } from '@/app/home-client'
import SimilarProducts from './similar-products'
import { useSession } from 'next-auth/react'
import ReviewItem from './review'
import { createReview } from '@/actions/product'
import { toast } from 'sonner'
import AddToCart from "./add-to-cart";

type SingleProduct = Omit<Product, "categories"> & {
  categories: { id: string; name: string }[];
}
interface ProductDetailsProps {
  product: SingleProduct,
  itemsSold: number,
  reviews: Review[]
}

// Define the state shape returned by the server action
interface CreateReviewState {
  success: boolean;
  message?: string;
  errors?: {
    [key: string]: string | string[];
  };
}


const initialState: CreateReviewState = {
  success: false,
  message: '',
  errors: {},
};

const ProductDetails: React.FC<ProductDetailsProps> = ({ product, itemsSold, reviews }) => {
  const safeProduct: SingleProduct = product ?? {
    _id: '',
    name: '',
    images: [],
    brand: '',
    carModel: '',
    make: '',
    variant: '',
    year: 0,
    sku: '',
    status: '',
    price: 0,
    salePrice: 0,
    stock: 0,
    categories: [],
    sellerName: '',
    itemsSold: 0,
    sellerId: ''
  } as unknown as SingleProduct;

  const { data: session } = useSession();
  const isSeller = !!(session?.user?.id) && session.user.id === safeProduct.sellerId;

  const [state, formAction, isPending] = useActionState<CreateReviewState, FormData>(
    createReview,
    initialState // Pass the initial state defined locally
  );

  const initialImages = Array.isArray(safeProduct.images) ? safeProduct.images.filter((src) => !!src && src.trim().length > 0) : []
  const [selectedImage, setSelectedImage] = useState<string | undefined>(initialImages[0])
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [popupImage, setPopupImage] = useState<string | null>(null)
  const swiperRef = useRef<SwiperClass | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 })
  const [tab, setTab] = useState<'description' | 'reviews'>('description')
  const [isFullscreen, setIsFullscreen] = useState(false);
  const averageRating: number =
    reviews.length === 0 ? 0 : reviews.reduce((sum: number, r: Review) => sum + r.rating, 0) / reviews.length;
  const fullStars = Math.round(averageRating);
  const starString = "★".repeat(fullStars) + "☆".repeat(5 - fullStars);
  const [rating, setRating] = useState<number>(0)
    const [hoverRating, setHoverRating] = useState<number>(0);


  const discountPercentage = safeProduct.salePrice && safeProduct.price
    ? Math.round(((safeProduct.price - safeProduct.salePrice) / safeProduct.price) * 100)
    : 0;



  const handleThumbnailClick = (img: string, index: number) => {
    setSelectedImage(img)
    setSelectedImageIndex(index)
    swiperRef.current?.slideToLoop(index)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPopupImage(null); // Close the popup
        setIsFullscreen(false); // Exit fullscreen if active
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown); // Cleanup on unmount
    };
  }, [popupImage]);

  useEffect(() => {
    if (state.success) {
      toast("Review added successfully");
      setRating(0);
    }

    if (!state.success && state.message) {
      toast(state.message)
      // you could also set a little banner in the UI,
      // but at least don’t reset the inputs here
    }
  }, [state.success, state.message, state.errors])

  const [count, setCount] = useState(1);


  return (
    <main>
      <section className=" mx-auto px-[75px] md:px-[75px] pt-20 pb-2 ">
        <span className="text-[15px] font-[500] text-primary">Home/Product/{safeProduct.name}</span>
      </section>
      <section className=" mx-auto px-[75px] md:px-[75px] ">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* ✅ Left: Image Gallery */}
          <div className="flex flex-col relative">
            <Swiper
              onSwiper={(swiper) => (swiperRef.current = swiper)}
              slidesPerView={1}
              loop={true}
              grabCursor={true}
              onSlideChange={(swiper) => {
                const newImage = product.images[swiper.realIndex]
                setSelectedImage(newImage)
                setSelectedImageIndex(swiper.realIndex)
              }}
              className="w-full h-[500px] border-1 border-gray-300 rounded-lg overflow-hidden mb-2.5"
            >
              {product.images.map((img, index) => (
                <SwiperSlide key={index}>
                  <div className="relative w-full h-full overflow-hidden">
                    <Image
                      src={img}
                      alt={`Product Image ${index + 1}`}
                      fill
                      className="object-contain"
                    />
                  </div>
                </SwiperSlide>
              ))}
              <button
                onClick={() => setPopupImage(selectedImage ?? null)}
                className="absolute bottom-3 left-3 z-10 bg-white rounded-full p-1"
                title="Enlarge image"
              >
                <svg width="35" height="35" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6.10039 4.13964H10.6504C11.0837 4.13964 11.4754 3.98131 11.8254 3.66465C12.1754 3.34798 12.3504 2.95631 12.3504 2.48965C12.3504 2.02298 12.1837 1.65631 11.8504 1.38964C11.5171 1.12298 11.1171 0.989647 10.6504 0.989647H2.35039C2.05039 0.989647 1.83372 1.07298 1.70039 1.23965C1.60039 1.23965 1.50872 1.28131 1.42539 1.36465C1.34206 1.44798 1.30039 1.53131 1.30039 1.61465C1.30039 1.69798 1.23372 1.73965 1.10039 1.73965C0.967057 1.73965 0.900391 1.77298 0.900391 1.83965C0.900391 1.90631 0.858724 2.00631 0.775391 2.13964C0.692057 2.27298 0.650391 2.38964 0.650391 2.48965V10.7896C0.650391 11.223 0.808724 11.6146 1.12539 11.9646C1.44206 12.3146 1.85039 12.4896 2.35039 12.4896C2.85039 12.4896 3.25039 12.323 3.55039 11.9896C3.85039 11.6563 4.00039 11.2563 4.00039 10.7896V6.23965L11.7004 13.9396C11.8004 14.1396 11.9504 14.2896 12.1504 14.3896C12.3504 14.4896 12.5504 14.5396 12.7504 14.5396C12.9504 14.5396 13.1504 14.498 13.3504 14.4146C13.5504 14.3313 13.7004 14.2396 13.8004 14.1396C14.1004 13.8063 14.2504 13.423 14.2504 12.9896C14.2504 12.5563 14.1004 12.173 13.8004 11.8396L6.10039 4.13964ZM37.1504 1.83965C37.1504 1.73965 37.1004 1.64798 37.0004 1.56464C36.9004 1.48131 36.8004 1.43964 36.7004 1.43964C36.6004 1.43964 36.5087 1.39798 36.4254 1.31464C36.3421 1.23131 36.3004 1.12298 36.3004 0.989647C36.2337 0.989647 36.1337 0.95631 36.0004 0.889645C35.8671 0.822979 35.7504 0.789646 35.6504 0.789646H27.3504C26.9171 0.789646 26.5254 0.947979 26.1754 1.26464C25.8254 1.58131 25.6504 1.99798 25.6504 2.51464C25.6504 3.03131 25.8004 3.43131 26.1004 3.71465C26.4004 3.99798 26.8171 4.13964 27.3504 4.13964H31.9004L24.2004 11.8396C23.9004 12.173 23.7504 12.5563 23.7504 12.9896C23.7504 13.423 23.9004 13.8063 24.2004 14.1396C24.3004 14.2396 24.4504 14.3313 24.6504 14.4146C24.8504 14.498 25.0504 14.5396 25.2504 14.5396C25.4504 14.5396 25.6504 14.498 25.8504 14.4146C26.0504 14.3313 26.2004 14.2396 26.3004 14.1396L34.0004 6.43965V10.7896C34.0004 11.223 34.1587 11.6146 34.4754 11.9646C34.7921 12.3146 35.1921 12.4896 35.6754 12.4896C36.1587 12.4896 36.5587 12.3396 36.8754 12.0396C37.1921 11.7396 37.3504 11.323 37.3504 10.7896V2.48965C37.3504 2.38964 37.3171 2.27298 37.2504 2.13964C37.1837 2.00631 37.1504 1.90631 37.1504 1.83965ZM11.7004 24.3396L4.00039 32.0396V27.4896C4.00039 27.023 3.85039 26.623 3.55039 26.2896C3.25039 25.9563 2.85039 25.7896 2.35039 25.7896C1.85039 25.7896 1.44206 25.9646 1.12539 26.3146C0.808724 26.6646 0.650391 27.0563 0.650391 27.4896V35.7896C0.650391 36.0896 0.733724 36.3063 0.900391 36.4396C0.900391 36.5396 0.942057 36.6313 1.02539 36.7146C1.10872 36.798 1.20039 36.8396 1.30039 36.8396C1.40039 36.8396 1.49206 36.8813 1.57539 36.9646C1.65872 37.048 1.70039 37.1563 1.70039 37.2896C1.76706 37.2896 1.87539 37.323 2.02539 37.3896C2.17539 37.4563 2.28372 37.4896 2.35039 37.4896H10.6504C11.0837 37.4896 11.4754 37.3313 11.8254 37.0146C12.1754 36.698 12.3504 36.2896 12.3504 35.7896C12.3504 35.2896 12.1837 34.923 11.8504 34.6896C11.5171 34.4563 11.1171 34.3396 10.6504 34.3396H6.10039L13.8004 26.6396C14.1004 26.3063 14.2504 25.923 14.2504 25.4896C14.2504 25.0563 14.1004 24.673 13.8004 24.3396C13.5004 24.0063 13.1587 23.848 12.7754 23.8646C12.3921 23.8813 12.0337 24.0396 11.7004 24.3396ZM35.6504 25.9896C35.2171 25.9896 34.8337 26.148 34.5004 26.4646C34.1671 26.7813 34.0004 27.1896 34.0004 27.6896V32.2396L26.3004 24.5396C25.9671 24.2396 25.5837 24.0896 25.1504 24.0896C24.7171 24.0896 24.3337 24.2396 24.0004 24.5396C23.6671 24.8396 23.5087 25.223 23.5254 25.6896C23.5421 26.1563 23.7004 26.5396 24.0004 26.8396L31.7004 34.5396H27.3504C26.9171 34.5396 26.5254 34.698 26.1754 35.0146C25.8254 35.3313 25.6504 35.748 25.6504 36.2646C25.6504 36.7813 25.8004 37.1813 26.1004 37.4646C26.4004 37.748 26.8171 37.8896 27.3504 37.8896H35.6504C35.9504 37.8896 36.1671 37.823 36.3004 37.6896C36.4004 37.6896 36.4921 37.648 36.5754 37.5646C36.6587 37.4813 36.7004 37.3896 36.7004 37.2896C36.7004 37.1896 36.7421 37.0896 36.8254 36.9896C36.9087 36.8896 37.0171 36.8396 37.1504 36.8396C37.1504 36.773 37.1837 36.673 37.2504 36.5396C37.3171 36.4063 37.3504 36.3063 37.3504 36.2396V27.8896C37.3504 27.2896 37.1837 26.823 36.8504 26.4896C36.5171 26.1563 36.1171 25.9896 35.6504 25.9896Z" fill="#FFA500" />
                </svg>

              </button>
            </Swiper>

            { discountPercentage && <span className="z-50 absolute top-2 left-2 bg-primary text-white text-[16px] font-semibold px-2.5 py-0.5 rounded">
              {discountPercentage}% Off
            </span>}

            {/* ✅ Thumbnails */}
            <div className="flex mb-4 space-x-2 overflow-x-auto">
              {product.images.map((img, index) => (
                <button
                  key={index}
                  onClick={() => handleThumbnailClick(img, index)}
                  className={`border rounded-md p-1 transition-all ${selectedImageIndex === index ? 'border-primary border-[2px]' : 'border-gray-300'
                    }`}
                >
                  <Image
                    src={img}
                    alt={`Thumbnail ${index + 1}`}
                    width={80}
                    height={80}
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* ✅ Right: Product Info */}
          {/* ✅ Right: Info */}
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">{product.name}</h1>

            <div className="flex items-center mt-2 mb-1 space-x-2 text-sm">
              <span className='text-primary'>{starString}</span>
              <span className="text-gray-600">{reviews?.length} Customer Review{reviews?.length > 1 ? "s" : ""}</span>
              <span className="text-gray-600">| SKU: {product.sku}</span>
              {product.stock > 0 ? <span className="text-green-600 font-medium">In Stock</span> : <span className="text-red-600 font-medium">Out of Stock</span>}
            </div>
            <span className="text-sm text-primary font-[600] ">{itemsSold} Item{itemsSold > 1 ? "s" : ""} Sold</span>

            <div className="mt-4 flex items-center space-x-4">
              
              { product.salePrice && <span className="text-gray-400 line-through text-xl">Rs. {product.price}</span>}
              <span className="text-primary text-2xl font-bold">Rs. {product.salePrice || product.price}</span>
            </div>

            <ul className="text-sm text-gray-600 mt-4 space-y-1">
              {/* {product.features.map((feature, i) => (
              <li key={i}>• {feature}</li>
            ))} */}
            </ul>

            <div className="mt-6 flex items-center space-x-4">
              <div className="w-[80px] flex justify-center items-center border rounded px-3 py-1 border-gray-400">

                <button className="text-lg font-semibold text-gray-400 hover:text-primary" onClick={() => setCount(count > 0 ? count - 1 : 0)}>−</button>
                <span className="px-3 text-gray-400 text-lg">{count}</span>
                <button className="text-lg font-semibold text-gray-400 hover:text-primary" onClick={() => setCount(count + 1)}>+</button>
              </div>

              <span 
              className="w-1/2 rounded shadow"
              >
              <AddToCart productName={product.name} productId={product._id} stock={product.stock} quantity={count} />
              </span>
            </div>
            {/* ✅ Section: Favorite this product */}
            <div className="mt-6 flex items-center gap-3 text-sm text-gray-500">
              <p>Did you like this product? Add to your wishlist now and follow the product.</p>
              <button className="p-2 rounded-full border border-primary hover:bg-primary-hover hover:text-white transition">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-primary hover:text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.75a5.25 5.25 0 00-4.5 2.625A5.25 5.25 0 007.5 3.75 5.22 5.22 0 003 9c0 5.25 9 11.25 9 11.25s9-6 9-11.25a5.22 5.22 0 00-4.5-5.25z" />
                </svg>
              </button>
            </div>

            {/* ✅ Section: Seller Info */}
            <div className="mt-6 flex items-center space-x-4">
              {product.sellerImage ? (
                <Image
                  width={48}
                  height={48}
                  src={product.sellerImage}
                  alt="Seller"
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div
                  aria-label="Seller"
                  className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-600"
                >
                  {product.sellerName?.[0]?.toUpperCase() || 'S'}
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Have a Question? Ask a Specialist</p>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">@{product.sellerName}</span>
                  <a href="#" className="text-primary underline text-sm hover:underline">Chat with seller</a>
                </div>
              </div>
            </div>

            {/* ✅ Section: Feature Grid */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm text-gray-700">
              <div className="flex items-start space-x-3">


                <svg fill="#ffa500" width="38" height="38" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">

                  <g id="Dollar">
                    <g>
                      <path d="M12,21.934A9.934,9.934,0,1,1,21.934,12,9.945,9.945,0,0,1,12,21.934ZM12,3.066A8.934,8.934,0,1,0,20.934,12,8.944,8.944,0,0,0,12,3.066Z" />
                      <path d="M14.5,13.5a2.006,2.006,0,0,1-2,2v1.01a.5.5,0,0,1-1,0V15.5H10.25a.5.5,0,0,1,0-1H12.5a1,1,0,0,0,0-2h-1a2,2,0,0,1,0-4V7.49a.5.5,0,0,1,1,0V8.5h1.25a.5.5,0,0,1,0,1H11.5a1,1,0,0,0,0,2h1A2.006,2.006,0,0,1,14.5,13.5Z" />
                    </g>
                  </g>
                </svg>
                <div>
                  <p className="font-semibold">Low Prices</p>
                  <p className="text-gray-500">Price match guarantee</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">

                <svg width="35" height="35" fill="#FFA500" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink"
                  viewBox="0 0 64 64" xmlSpace="preserve">
                  <path d="M62.597,28.949c-0.437-0.579-0.889-1.178-0.961-1.643c-0.078-0.495,0.172-1.222,0.414-1.924
	c0.352-1.018,0.749-2.172,0.392-3.272c-0.363-1.121-1.375-1.828-2.268-2.452c-0.6-0.419-1.219-0.852-1.438-1.28
	c-0.224-0.438-0.211-1.202-0.199-1.94c0.018-1.082,0.038-2.307-0.647-3.249c-0.688-0.946-1.864-1.305-2.901-1.621
	c-0.703-0.214-1.431-0.437-1.774-0.78c-0.344-0.344-0.566-1.072-0.78-1.775C52.119,7.976,51.76,6.8,50.813,6.112
	c-0.941-0.685-2.167-0.666-3.248-0.647c-0.738,0.014-1.503,0.025-1.94-0.199c-0.428-0.218-0.861-0.838-1.28-1.438
	c-0.623-0.893-1.33-1.904-2.451-2.268c-1.101-0.357-2.257,0.04-3.276,0.39c-0.702,0.242-1.431,0.491-1.924,0.415
	C36.229,2.292,35.63,1.84,35.05,1.404C34.178,0.746,33.188,0,32,0s-2.178,0.746-3.051,1.404c-0.579,0.437-1.178,0.888-1.643,0.961
	c-0.493,0.079-1.221-0.173-1.924-0.415c-1.019-0.351-2.173-0.748-3.272-0.392c-1.121,0.364-1.828,1.375-2.452,2.268
	c-0.419,0.599-0.852,1.219-1.28,1.437c-0.438,0.224-1.203,0.21-1.94,0.199c-1.082-0.021-2.307-0.039-3.249,0.647
	c-0.946,0.688-1.305,1.864-1.621,2.901c-0.214,0.704-0.437,1.431-0.78,1.775c-0.344,0.344-1.072,0.566-1.776,0.781
	c-1.037,0.316-2.212,0.675-2.901,1.621c-0.685,0.941-0.665,2.167-0.647,3.249c0.012,0.739,0.024,1.502-0.199,1.941
	c-0.218,0.427-0.838,0.86-1.437,1.279c-0.893,0.624-1.904,1.331-2.269,2.452c-0.357,1.101,0.041,2.255,0.392,3.274
	c0.242,0.703,0.493,1.429,0.415,1.924c-0.073,0.465-0.524,1.064-0.961,1.643C0.746,29.822,0,30.812,0,32s0.746,2.178,1.404,3.051
	c0.437,0.579,0.888,1.179,0.961,1.644l1.976-0.311c-0.15-0.959-0.755-1.761-1.34-2.537C2.509,33.194,2,32.519,2,32
	s0.509-1.194,1.001-1.847c0.585-0.776,1.189-1.578,1.34-2.537c0.155-0.986-0.178-1.952-0.5-2.886
	c-0.261-0.757-0.531-1.541-0.38-2.004c0.157-0.483,0.846-0.964,1.512-1.43c0.8-0.559,1.628-1.137,2.073-2.009
	c0.45-0.882,0.434-1.899,0.417-2.883c-0.013-0.806-0.026-1.638,0.265-2.039c0.295-0.405,1.094-0.649,1.868-0.885
	c0.938-0.287,1.909-0.583,2.606-1.28c0.697-0.697,0.993-1.667,1.279-2.605c0.236-0.773,0.479-1.573,0.885-1.868
	c0.401-0.292,1.234-0.279,2.039-0.265c0.984,0.016,2,0.033,2.883-0.417c0.872-0.445,1.45-1.272,2.01-2.073
	c0.465-0.666,0.947-1.354,1.43-1.511c0.462-0.152,1.246,0.12,2.003,0.38c0.935,0.322,1.9,0.654,2.886,0.5
	c0.958-0.15,1.761-0.755,2.537-1.34C30.806,2.509,31.481,2,32,2c0.519,0,1.194,0.509,1.847,1.001
	c0.776,0.585,1.578,1.189,2.537,1.34c0.984,0.152,1.952-0.178,2.886-0.5c0.758-0.261,1.54-0.532,2.005-0.38
	c0.482,0.157,0.964,0.845,1.43,1.511c0.559,0.8,1.138,1.628,2.009,2.073c0.882,0.45,1.903,0.436,2.883,0.417
	c0.806-0.012,1.639-0.027,2.04,0.265c0.405,0.295,0.648,1.094,0.885,1.868c0.286,0.938,0.582,1.909,1.279,2.606
	c0.696,0.697,1.667,0.993,2.605,1.279c0.772,0.236,1.572,0.48,1.867,0.885c0.292,0.401,0.278,1.233,0.265,2.039
	c-0.016,0.984-0.032,2.001,0.418,2.883c0.445,0.872,1.272,1.45,2.072,2.009c0.666,0.466,1.354,0.947,1.512,1.431
	c0.15,0.463-0.119,1.246-0.38,2.003c-0.322,0.934-0.654,1.9-0.5,2.886c0.151,0.958,0.756,1.761,1.34,2.536
	c0.491,0.654,1,1.329,1,1.848c0,0.519-0.509,1.194-1.001,1.848c-0.584,0.775-1.188,1.577-1.34,2.536l1.977,0.311
	c0.072-0.465,0.524-1.064,0.961-1.644C63.254,34.178,64,33.188,64,32S63.254,29.822,62.597,28.949z M54.404,50.521
	c-0.938,0.286-1.909,0.582-2.605,1.279c-0.697,0.696-0.993,1.667-1.28,2.605c-0.235,0.773-0.479,1.572-0.885,1.867
	c-0.4,0.291-1.238,0.277-2.038,0.265c-0.984-0.016-2-0.032-2.884,0.418c-0.871,0.445-1.449,1.272-2.008,2.072
	c-0.466,0.666-0.947,1.354-1.431,1.512c-0.464,0.152-1.246-0.118-2.004-0.38c-0.934-0.321-1.901-0.648-2.886-0.5
	c-0.959,0.151-1.761,0.756-2.536,1.34C33.194,61.491,32.519,62,32,62s-1.194-0.509-1.848-1.001c-0.775-0.584-1.578-1.188-2.536-1.34
	c-0.983-0.148-1.952,0.179-2.886,0.5c-0.757,0.261-1.539,0.532-2.004,0.38c-0.483-0.157-0.965-0.846-1.43-1.512
	c-0.56-0.801-1.138-1.628-2.009-2.073c-0.882-0.45-1.9-0.434-2.882-0.417c-0.806,0.01-1.639,0.027-2.04-0.266
	c-0.405-0.295-0.649-1.094-0.885-1.867c-0.287-0.938-0.583-1.909-1.28-2.605c-0.697-0.697-1.667-0.993-2.606-1.28
	c-0.773-0.235-1.573-0.479-1.867-0.885L6.11,50.812c0.688,0.945,1.864,1.304,2.9,1.62c0.704,0.215,1.432,0.437,1.776,0.781
	c0.344,0.344,0.566,1.071,0.781,1.775c0.316,1.037,0.675,2.212,1.621,2.9c0.941,0.687,2.167,0.664,3.25,0.647
	c0.737-0.008,1.502-0.024,1.94,0.199c0.427,0.218,0.86,0.838,1.279,1.438c0.624,0.893,1.331,1.904,2.452,2.269
	c1.099,0.354,2.254-0.04,3.273-0.392c0.703-0.241,1.431-0.499,1.924-0.414c0.465,0.072,1.064,0.524,1.643,0.961
	C29.822,63.254,30.812,64,32,64s2.178-0.746,3.051-1.403c0.579-0.437,1.179-0.889,1.644-0.961c0.488-0.086,1.221,0.172,1.924,0.414
	c1.02,0.352,2.175,0.75,3.272,0.392c1.121-0.363,1.828-1.376,2.452-2.269c0.419-0.599,0.853-1.219,1.279-1.437
	c0.438-0.225,1.2-0.213,1.94-0.199c1.075,0.017,2.306,0.038,3.249-0.647c0.945-0.688,1.304-1.863,1.62-2.9
	c0.215-0.703,0.437-1.432,0.781-1.775c0.344-0.344,1.071-0.566,1.774-0.78c1.037-0.316,2.213-0.676,2.901-1.622l-1.617-1.176
	C55.977,50.041,55.177,50.284,54.404,50.521z"/>
                  <path d="M8,46v-2c0-0.553-0.448-1-1-1H5v2h1v1c0,0.552-0.449,1-1,1s-1-0.448-1-1v-6c0-0.552,0.449-1,1-1s1,0.448,1,1v1h2v-1
	c0-1.654-1.346-3-3-3s-3,1.346-3,3v6c0,1.654,1.346,3,3,3S8,47.654,8,46z M9,37v9c0,1.654,1.346,3,3,3s3-1.346,3-3v-9h-2v9
	c0,0.552-0.449,1-1,1s-1-0.448-1-1v-9H9z M16,40v9h2v-2h2v2h2v-9c0-1.654-1.346-3-3-3S16,38.346,16,40z M20,40v5h-2v-5
	c0-0.552,0.449-1,1-1S20,39.448,20,40z M30,40v9h2v-2h2v2h2v-9c0-1.654-1.346-3-3-3S30,38.346,30,40z M33,39c0.552,0,1,0.448,1,1v5
	h-2v-5C32,39.448,32.449,39,33,39z M23,38v4.996c0,0.003,0,0.005,0,0.007V49h2v-3.149l2.219,2.774C27.409,48.862,27.696,49,28,49h1
	v-2h-0.52l-2.434-3.043C27.718,43.694,29,42.244,29,40.5c0-1.93-1.57-3.5-3.5-3.5H24C23.448,37,23,37.447,23,38z M25,39h0.5
	c0.827,0,1.5,0.673,1.5,1.5S26.327,42,25.5,42H25V39z M41,42.808l-2.071-5.179c-0.179-0.447-0.655-0.696-1.118-0.611
	C37.34,37.108,37,37.521,37,38v11h2v-5.808l2.071,5.179C41.226,48.757,41.598,49,41.999,49c0.063,0,0.127-0.006,0.19-0.018
	C42.66,48.892,43,48.479,43,48V37h-2V42.808z M48,39h2v-2h-6v2h2v10h2V39z M56,39v-2h-4c-0.553,0-1,0.447-1,1v10
	c0,0.553,0.447,1,1,1h4v-2h-3v-3h3v-2h-3v-3H56z M57,38v10c0,0.553,0.447,1,1,1h4v-2h-3v-3h3v-2h-3v-3h3v-2h-4
	C57.447,37,57,37.447,57,38z"/>
                  <path d="M57,32C57,18.215,45.785,7,32,7S7,18.215,7,32c0,1.007,0.068,2.058,0.201,3.124l1.984-0.248C9.062,33.892,9,32.924,9,32
	C9,19.318,19.318,9,32,9c12.683,0,23,10.318,23,23c0,0.924-0.062,1.892-0.186,2.876l1.984,0.248C56.933,34.058,57,33.007,57,32z
	 M47.267,51.791l-1.223-1.582C41.985,53.343,37.13,55,32,55c-5.129,0-9.985-1.657-14.043-4.791l-1.223,1.582
	C21.146,55.199,26.424,57,32,57S42.855,55.199,47.267,51.791z"/>
                  <path d="M22,21h-2v2h1v10h2V22C23,21.448,22.552,21,22,21z M27.5,21c-1.93,0-3.5,1.57-3.5,3.5v5c0,1.93,1.57,3.5,3.5,3.5
	s3.5-1.57,3.5-3.5v-5C31,22.57,29.43,21,27.5,21z M29,29.5c0,0.827-0.673,1.5-1.5,1.5S26,30.327,26,29.5v-5
	c0-0.827,0.673-1.5,1.5-1.5s1.5,0.673,1.5,1.5V29.5z M35.5,21c-1.93,0-3.5,1.57-3.5,3.5v5c0,1.93,1.57,3.5,3.5,3.5s3.5-1.57,3.5-3.5
	v-5C39,22.57,37.43,21,35.5,21z M37,29.5c0,0.827-0.673,1.5-1.5,1.5S34,30.327,34,29.5v-5c0-0.827,0.673-1.5,1.5-1.5
	s1.5,0.673,1.5,1.5V29.5z"/>
                  <path d="M42.104,31.553l4-8l1.789,0.894l-4,8L42.104,31.553z" />
                  <rect x="41" y="25" width="2" height="2" />
                  <rect x="47" y="29" width="2" height="2" />
                </svg>
                <div>
                  <p className="font-semibold">Guaranteed Fitment.</p>
                  <p className="text-gray-500">Always the correct part</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">

                <svg className="mt-[1.8px]" fill="#ffa500" height="32" width="32" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink"
                  viewBox="0 0 512 512" xmlSpace="preserve">
                  <g transform="translate(1 1)">
                    <g>
                      <g>
                        <path d="M485.4,410.307c-1.707-0.853-4.267-2.56-5.973-3.413c-14.868-7.569-30.254-14.362-46.095-20.417
				c-0.886-1.191-2.012-2.161-3.398-2.623c-19.627-6.827-40.96-13.653-62.293-18.773c-1.311-0.328-2.747-0.275-4.116,0.104
				c-10.421-2.451-20.986-4.635-31.681-6.564c0.455-3.194,0.744-6.445,0.81-9.754v-22.556
				c35.991-31.753,58.24-83.064,57.173-131.044V153.04c0.579-0.417,1.149-0.847,1.707-1.293
				c11.093-9.387,17.067-23.04,17.067-36.693C408.6,51.053,356.547-1,293.4-1h-75.947c-64,0-116.053,52.053-116.907,115.2
				c0,14.507,5.973,27.307,17.067,36.693c0.279,0.215,0.57,0.415,0.853,0.624v43.749c0,48.394,23.046,100.169,59.733,131.854v21.746
				c0,2.981,0.184,5.914,0.508,8.802c-53.1,9.531-102.99,25.388-148.135,48.371l-5.973,3.413C8.387,417.133-1,433.347-1,451.267
				v51.2c0,5.12,3.413,8.533,8.533,8.533h85.333h324.267h85.333c5.12,0,8.533-3.413,8.533-7.68v-51.2
				C511,435.053,500.76,418.84,485.4,410.307z M371.053,442.733h-33.28l33.002-59.235c14.3,3.624,28.288,7.803,41.91,12.505
				L371.053,442.733z M380.44,138.093c-0.224,0.196-0.458,0.378-0.687,0.567c-0.959,0.223-1.89,0.582-2.726,1.14
				c-3.692,2.769-7.634,4.53-11.689,5.303c-3.216,0.493-6.488,0.449-9.644-0.183c-61.203-11.621-123.109-12.69-182.526-3.21
				c-6.594,0.953-13.167,2.019-19.714,3.21c-1.051,0.117-2.102,0.181-3.151,0.202c-6.86-0.123-13.508-2.029-19.036-6.175
				c-5.12-3.413-8.533-8.533-10.24-13.653l36.693-6.827c64-11.947,129.707-11.947,195.413,0l36.407,6.773
				C387.651,130.071,384.504,134.537,380.44,138.093z M216.6,16.067h75.947c52.343,0,95.272,40.762,98.752,92.233l-35.605-6.046
				c-67.413-11.947-135.68-11.947-201.387,0l-35.605,6.046C122.179,56.829,165.075,16.067,216.6,16.067z M135.533,195.267V160.28
				c6.827,1.707,14.507,2.56,22.187,0.853c31.861-5.947,64.144-8.932,96.64-8.958c32.5,0.026,65.21,3.01,97.92,8.958
				c2.331,0.583,4.261,0.764,6.068,0.823c5.372,0.407,10.986-0.393,16.118-1.676v34.987c0,79.578-58.365,140.216-112.917,144.78
				c-0.616,0.049-1.233,0.101-1.849,0.136c-0.429,0.026-0.858,0.047-1.287,0.066c-1.14,0.048-2.278,0.085-3.414,0.085
				c-1.137,0-2.278-0.037-3.42-0.085c-0.42-0.019-0.84-0.039-1.261-0.065c-0.66-0.038-1.322-0.093-1.983-0.147
				c-10.992-0.935-22.135-4.138-32.924-9.32c-0.091-0.045-0.184-0.084-0.275-0.13c-0.065-0.032-0.13-0.066-0.195-0.097
				c-7.739-3.868-15.225-8.849-22.235-14.903c-0.751-0.501-1.651-0.925-2.61-1.236C159.008,288.587,135.533,245.734,135.533,195.267
				z M250.894,357.315c0.099,0.004,0.198,0.012,0.297,0.015c1.264,0.045,2.533,0.069,3.808,0.069s2.544-0.025,3.808-0.069
				c0.099-0.004,0.199-0.011,0.298-0.015c20.2-0.769,38.97-7.186,55.627-17.601v9.152c0,33.28-26.453,59.733-59.733,59.733
				c-33.28,0-59.733-26.453-59.733-59.733v-9.13C211.949,350.139,230.708,356.547,250.894,357.315z M184.519,379.577
				c0.162,0.369,0.327,0.735,0.495,1.1c3.505,7.766,8.255,14.826,14.01,20.935c0.302,0.323,0.607,0.642,0.914,0.959
				c0.369,0.379,0.739,0.756,1.116,1.127c0.659,0.652,1.33,1.291,2.012,1.917c0.082,0.075,0.161,0.153,0.244,0.228
				c11.776,10.734,26.803,17.657,43.454,19.385c0.266,0.028,0.534,0.052,0.801,0.078c0.941,0.088,1.887,0.159,2.838,0.213
				c0.317,0.018,0.633,0.04,0.951,0.055c1.209,0.055,2.423,0.091,3.647,0.091c1.224,0,2.441-0.036,3.653-0.091
				c0.31-0.014,0.617-0.036,0.926-0.053c0.978-0.056,1.951-0.129,2.919-0.219c0.228-0.022,0.457-0.042,0.684-0.066
				c24.366-2.497,45.645-16.041,57.722-36.318c0.075-0.122,0.148-0.246,0.222-0.368c0.152-0.259,0.305-0.517,0.454-0.778
				c2.487-4.177,4.599-8.606,6.29-13.248c8.402,1.383,16.706,2.984,24.923,4.756l-34.864,63.452H191.6l-34.812-63.358
				c8.463-1.837,17.019-3.489,25.679-4.908c0.479,1.326,1.001,2.626,1.543,3.914C184.175,378.782,184.347,379.179,184.519,379.577z
				 M98.066,395.891c13.623-4.757,27.614-8.945,41.912-12.564l32.249,59.406h-33.28L98.066,395.891z M16.067,451.267
				c0-11.093,5.973-21.333,16.213-26.453l5.973-3.413c13.55-6.908,27.598-13.236,42.089-18.934l37.12,41.311
				c-19.165,4.235-33.13,21.019-33.13,41.623v8.533H16.067V451.267z M101.4,493.933V485.4c0-14.507,11.093-25.6,25.6-25.6h8.533
				h51.2h136.533h51.2H383c14.507,0,25.6,11.093,25.6,25.6v8.533H101.4z M493.933,493.933h-68.267V485.4
				c0-20.833-14.273-37.768-33.767-41.767l37.373-41.593c14.627,5.611,28.804,11.805,42.474,18.506
				c1.707,1.707,4.267,2.56,5.973,3.413c10.24,5.973,16.213,16.213,16.213,27.307V493.933z"/>
                        <path d="M212.333,75.8h85.333c5.12,0,8.533-3.413,8.533-8.533V33.133c0-5.12-3.413-8.533-8.533-8.533h-85.333
				c-5.12,0-8.533,3.413-8.533,8.533v34.133C203.8,72.387,207.213,75.8,212.333,75.8z M220.867,41.667h68.267v17.067h-68.267V41.667
				z"/>
                        <path d="M161.133,468.333c-5.12,0-8.533,3.413-8.533,8.533s3.413,8.533,8.533,8.533s8.533-3.413,8.533-8.533
				S166.253,468.333,161.133,468.333z"/>
                        <path d="M348.867,468.333c-5.12,0-8.533,3.413-8.533,8.533s3.413,8.533,8.533,8.533s8.533-3.413,8.533-8.533
				S353.987,468.333,348.867,468.333z"/>
                      </g>
                    </g>
                  </g>
                </svg>
                <div>
                  <p className="font-semibold">In-House Experts.</p>
                  <p className="text-gray-500">We know our products</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">


                <svg fill="#ffa500" height="35" width="30" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink"
                  viewBox="0 0 490.693 490.693" xmlSpace="preserve">
                  <g>
                    <g>
                      <path d="M351.173,149.227H36.4L124.827,60.8c4.053-4.267,3.947-10.987-0.213-15.04c-4.16-3.947-10.667-3.947-14.827,0
			L3.12,152.427c-4.16,4.16-4.16,10.88,0,15.04l106.667,106.667c4.267,4.053,10.987,3.947,15.04-0.213
			c3.947-4.16,3.947-10.667,0-14.827L36.4,170.56h314.773c65.173,0,118.187,57.387,118.187,128s-53.013,128-118.187,128h-94.827
			c-5.333,0-10.133,3.84-10.88,9.067c-0.96,6.613,4.16,12.267,10.56,12.267h95.147c76.907,0,139.52-66.987,139.52-149.333
			S428.08,149.227,351.173,149.227z"/>
                    </g>
                  </g>
                </svg>
                <div>
                  <p className="font-semibold">Easy Returns.</p>
                  <p className="text-gray-500">Quick & Hassle Free</p>
                </div>
              </div>
            </div>

            {/* ✅ Section: Categories */}
            <div className="mt-8 text-sm text-gray-600">
              <span className="font-medium text-black text-[14.5px]">Categories: </span>
              <span className=" text-gray-500">
                {product.categories.map((category, index) => (
                  <span key={index} className="text-gray-500">
                    {category.name}{index < product.categories.length - 1 ? ', ' : ''}
                  </span>
                ))}

              </span>
            </div>

          </div>
        </div>

        {/* ✅ Tabs for Description and Reviews */}
        <div className="mt-10 border border-gray-300 rounded-lg">
          <div className="flex border-b border-gray-300">
            <button
              className={`py-3 px-6 font-semibold text-sm border-b-2 transition ${tab === 'description' ? 'border-primary text-primary' : 'border-transparent text-gray-500'
                }`}
              onClick={() => setTab('description')}
            >
              Description
            </button>
            <button
              className={`py-3 px-6 font-semibold text-sm border-b-2 transition ${tab === 'reviews' ? 'border-primary text-primary' : 'border-transparent text-gray-500'
                }`}
              onClick={() => setTab('reviews')}
            >
              Reviews ({reviews?.length})
            </button>
          </div>

          <div className="p-6 bg-white text-gray-800 text-sm leading-relaxed">
            {tab === 'description' ? (
              <div>
                <p className="mb-4 whitespace-pre-line">{product.description}</p>
                <p className="mb-2 font-semibold">Technical Details:</p>
                <ul className="list-disc pl-5 space-y-1">
                  {/* FIXME: Change it to technical details like dimensions */}
                  {/* {product.technicalDescription.map((detail, i) => ( */}
                  <li>{product.technicalDescription}</li>
                  {/* ))} */}
                </ul>
              </div>
            ) : (
              <div className="space-y-6">
                <div className='max-h-[600px] overflow-y-auto'>
                {/* TODO: Don't let users add more than 1 review */}
                {reviews.length > 0 ? (
                  reviews.map((review: Review, i: number) => (
                    <ReviewItem key={i} review={review} />
                  ))
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    No reviews yet.
                  </p>
                )}
                </div>

                {/* ──────────────────────────────────────────────── */}
                {/* Conditional review form / messages */}
                <div className="mt-8 border-t border-gray-300 pt-6">
                  {!session && (
                    <p className="text-center text-gray-600 italic">
                      Please{' '}
                      <a
                        href="/login"
                        className="text-primary underline"
                      >
                        sign in
                      </a>{' '}
                      to write a review.
                    </p>
                  )}

                  {session && isSeller && (
                    <p className="text-center text-gray-600 italic">
                      You cannot review your own product.
                    </p>
                  )}

                  {session && !isSeller && (
                    <>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">
                        Write a Review
                      </h3>
                      {/* TODO: Fetch the new reviews on add new review */}
                      {/* TODO: Make the reviewer able to edit or delete its review */}
                      <form action={formAction} className="space-y-4">
                        {/* name & email could come from session too */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <input
                            type="text"
                            placeholder="Your Name"
                            defaultValue={session?.user.name || ""}
                            readOnly
                            className="w-full border rounded px-4 py-2 bg-gray-100 text-sm"
                          />
                          <input
                            type="email"
                            placeholder="Your Email"
                            defaultValue={session?.user.email || ""}
                            readOnly
                            className="w-full border rounded px-4 py-2 bg-gray-100 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block mb-1 text-sm font-medium text-gray-700">
                            Your Rating
                          </label>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => {
                              const fill = hoverRating >= star || (!hoverRating && rating >= star)
                              return (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setRating(star)}
                                  onMouseEnter={() => setHoverRating(star)}
                                  onMouseLeave={() => setHoverRating(0)}
                                  className="text-2xl transition-transform"
                                >
                                  <span className={fill ? 'text-primary' : 'text-gray-300'}>
                                    {fill ? '★' : '☆'}
                                  </span>
                                </button>
                              )
                            })}
                            <input type="hidden" name="rating" value={rating} />
                            <input type="hidden" name="product" value={product._id} />
                          </div>
                        </div>

                        <textarea
                          placeholder="Write your review..."
                          rows={4}
                          className="w-full border rounded px-4 py-2 text-sm focus:ring-2 focus:ring-primary"
                          name='comment'
                        />

                        <button
                          type="submit"
                          className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded font-semibold shadow"
                        >
                          {isPending ? "Submitting..." : "Submit Review"}
                        </button>
                        <div>
                        
                        </div>
                      </form>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ✅ Popup Modal */}
        {popupImage !== null && (
          <div
            className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center"
          >
            <div
              className="relative transition-all duration-300 ease-in-out h-full w-full"
            >
              {/* ❌ Close Button */}
              <button
                className="absolute top-4 right-6  text-white text-2xl font-bold z-50 cursor-pointer"
                onClick={() => {
                  setPopupImage(null);
                }}
              >
                <svg width="25" height="25" viewBox="0 0 24 24" fill="#FFA500" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 5L4.99998 19M5.00001 5L19 19" stroke="#FFA500" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {/* 🔢 Image Counter */}
              <div className="absolute top-4 left-4 text-primary text-[15px] font-semibold z-50">
                {activeIndex + 1} / {product.images.length}
              </div>

              {/* 🖥️ Fullscreen Toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFullscreen(!isFullscreen);
                }}
                className=" absolute top-4 right-14  z-50 p-1 text-white"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? (
                  <svg fill="#FFA500" width="20" height="20" viewBox="0 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg">
                    <path d="M31.707 30.282l-8.845-8.899c1.894-2.262 3.034-5.18 3.034-8.366 0-7.189-5.797-13.018-12.986-13.018s-13.017 5.828-13.017 13.017 5.828 13.017 13.017 13.017c3.282 0 6.271-1.218 8.553-3.221l8.829 8.884c0.39 0.39 1.024 0.39 1.414 0s0.391-1.024 0-1.415zM12.893 24c-6.048 0-11-4.951-11-11s4.952-11 11-11c6.048 0 11 4.952 11 11s-4.951 11-11 11zM17.893 12h-10c-0.552 0-1 0.448-1 1s0.448 1 1 1h10c0.552 0 1-0.448 1-1s-0.448-1-1-1z"></path>
                  </svg>
                ) : (
                  <svg fill="#FFA500" width="20" height="20" viewBox="0 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg">
                    <path d="M31.707 30.282l-8.845-8.899c1.894-2.262 3.034-5.18 3.034-8.366 0-7.189-5.797-13.018-12.986-13.018s-13.017 5.828-13.017 13.017 5.828 13.017 13.017 13.017c3.282 0 6.271-1.218 8.553-3.221l8.829 8.884c0.39 0.39 1.024 0.39 1.414 0s0.391-1.024 0-1.415zM12.893 24c-6.048 0-11-4.951-11-11s4.952-11 11-11c6.048 0 11 4.952 11 11s-4.951 11-11 11zM17.893 12h-4v-4c0-0.552-0.448-1-1-1s-1 0.448-1 1v4h-4c-0.552 0-1 0.448-1 1s0.448 1 1 1h4v4c0 0.552 0.448 1 1 1s1-0.448 1-1v-4h4c0.552 0 1-0.448 1-1s-0.448-1-1-1z"></path>
                  </svg>
                )}
              </button>

              {/* 🖼️ Swiper Gallery */}
              <Swiper
                slidesPerView={1}
                loop={true}
                initialSlide={activeIndex}
                onSlideChange={(swiper) => {
                  // if (popupImage !== null) {
                  //   setPopupImage(product.images[swiper.realIndex]);
                  // }
                  setActiveIndex(swiper.realIndex);
                }}
                navigation
                modules={[Navigation]}
                className="w-full h-full"
              >
                {product.images.map((img, index) => (
                  <SwiperSlide key={index}>
                    <div
                      onMouseMove={(e) => {
                        if (isFullscreen) {
                          const bounds = e.currentTarget.getBoundingClientRect();
                          const x = ((e.clientX - bounds.left) / bounds.width) * 100;
                          const y = ((e.clientY - bounds.top) / bounds.height) * 100;
                          setZoomPos({ x, y });
                        }
                      }}
                      className="relative w-full h-full flex items-center justify-center">
                      <div
                        className={`relative w-full h-full ${isFullscreen ? 'p-0' : 'p-6'
                          } flex items-center justify-center`}
                        style={{
                          backgroundImage: isFullscreen ? `url(${img})` : 'none',
                          backgroundSize: '150%',
                          backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
                        }}
                      >
                        <Image
                          src={img}
                          alt={`Image ${index + 1}`}
                          fill
                          className="object-contain"
                          style={{
                            display: isFullscreen ? "none" : "block",
                          }}
                        />
                      </div>
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>


          </div>
        )}

      </section>
      <div className="px-[75px] mt-[50px] w-[100%] flex  border-[#DEE2E6] ">
        <div className="w-[100%] flex py-6 border-b border-[#DEE2E6] justify-between">
          <div className=" w-fit flex items-center gap-[20px] ">
            <h3 className="text-[20px] font-[600] leading-[26px]">Similar Products</h3>

          </div>
          <a href="#" className="items-center  text-sm text-gray-500 hover:text-primary hover:underline">
            View All →
          </a>
        </div>
      </div>
      <SimilarProducts categoryIds={product.categories} productToExclude={product._id} />
    </main>
  )
}

export default ProductDetails
