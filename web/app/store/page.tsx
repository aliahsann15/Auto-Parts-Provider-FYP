'use client'

import React, { useState } from 'react'
import Image from '@/app/components/AppImage'
import ProductCard from '../components/product/product-card'
import { FiMessageCircle, FiUserPlus } from 'react-icons/fi'
import ReviewCarousel2 from '../components/review/review-carousel-2'
import ProductsWithTab from '../components/shop/products-with-tab'

const StorePreviewPage = () => {
  const mockData = {
    storeName: 'Ahmed Auto Parts',
    followers: '1.8K followers',
    itemsSold: 500,
    reviews: 100,
    rating: 5,
    description: `At Ahmed Auto Parts, we take pride in being your trusted destination for premium automotive parts and accessories. With years of experience in the industry, we offer a curated selection of high-quality products tailored for car enthusiasts, professional mechanics, and everyday drivers alike. From performance upgrades and safety gear to essential maintenance items, our inventory is constantly updated to ensure reliability, durability, and value.`,
    cover: '/images/tool1.png',
    logo: '/images/logo-white.png',
    banner: '/images/salesbanner.jpeg',
    salesBanner: '/images/salesbanner.jpeg',
    products: [

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
      {
        id: 7,
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
        id: 8,
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
        id: 9,
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
        id: 10,
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
        id: 11,
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
        id: 12,
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

    ],
    categories: [
      "Auto Safety & Security" as const,
      "Interior Accessories" as const,
      "Tires & Wheels" as const,
      "Tools & Equipment" as const,
      "All" as const,
    ],
    parts: ['Headlight', 'Speaker', 'Battery'],
    models: ['Etron GT', 'Civic', 'Corolla'],
    testimonials: [
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
    ],

    sections: [
      { key: 'banner', visible: true },
      { key: 'featured', visible: true },
      { key: 'salesbanner', visible: true },
      { key: 'sale', visible: true },
      { key: 'best', visible: true },
      { key: 'reviews', visible: true }
    ]
  }

  const tabs = ['Store', 'Products', 'Sale']
  const [selectedTab, setSelectedTab] = useState('Store')
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  type Category = "All" | "Auto Safety & Security" | "Interior Accessories" | "Tires & Wheels" | "Tools & Equipment";
  const [selectedCategory, setSelectedCategory] = useState<Category>("All");
  const filtered = mockData.products.filter((p) =>
    selectedCategory === "All" ? true : p.category === selectedCategory
  );
  const [isFilterOpen, setIsFilterOpen] = useState(false);


  return (
    <div className="bg-gray-50">
      <main className="p-6">
        <div className="rounded-xl bg-white shadow">
          {/* Cover */}
          <div className="relative w-full h-[300px] rounded-t-xl overflow-hidden">
            <Image src={mockData.cover} alt="Store Cover" fill className="object-cover" />
          </div>

          {/* Info */}
          <div className="px-6 pb-8 bg-white rounded-b-xl">
            <div className="flex flex-row gap-4 -mt-20">
              <div className="relative w-36 h-36 border-4 border-[#ffa500] rounded-full overflow-hidden bg-black">
                <Image src={mockData.logo} alt="Store Logo" fill className="object-contain" />
              </div>
              <div className="w-[85%] flex flex-row justify-between mt-24">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{mockData.storeName}</h2>
                  <div className="flex gap-3 text-gray-500">
                    <p>{mockData.itemsSold} Items sold</p>
                    <p>{mockData.followers}</p>
                  </div>
                  <span className="text-[#FFA500]">
                    {'★'.repeat(mockData.rating) + '☆'.repeat(5 - mockData.rating)} (Out of {mockData.reviews} Reviews)
                  </span>
                </div>
                <div className="flex flex-col gap-4">
                  <button className="flex items-center justify-center gap-2 px-4 py-2 text-sm text-white bg-[#ffa500] rounded">
                    <FiUserPlus size={16} /> Follow
                  </button>
                  <button className="flex items-center justify-center gap-2 px-4 py-2 text-sm text-[#ffa500] border border-[#ffa500] rounded hover:bg-orange-50">
                    <FiMessageCircle size={16} /> Chat Now
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-2 p-6">
              <label className="block  font-[800] text-gray-800 mb-2 tracking-wide">Store Bio:</label>
              <p className="text-gray-600 text-md  leading-[30px] text-justify">{mockData.description}</p>
            </div>

            <div className="mt-10 text-sm flex items-center">
              <div className="w-fit rounded-lg shadow flex gap-4 p-2 bg-gray-100">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSelectedTab(tab)}
                    className={`px-4 py-1 rounded ${selectedTab === tab ? 'bg-[#FFA500] text-white' : ''}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
            {selectedTab === 'Store' && (
              <>
                {/* Sections */}
                <div className="mt-10 space-y-10">
                  {mockData.sections.map((section) => {
                    if (!section.visible) return null;

                    if (section.key === 'banner') {
                      return (
                        <div key={section.key} className="h-[400px] bg-gray-100 overflow-hidden rounded-lg relative">
                          <Image src={mockData.banner} alt="Banner" fill className="object-cover" />
                        </div>
                      );
                    }

                    if (section.key === 'featured') {
                      return (
                        <div key={section.key}>
                          {/* Section Heading */}
                          <div className="w-[100%] flex py-6 border-b border-[#DEE2E6] justify-between">
                            <div className="w-fit flex items-center gap-[20px]">
                              <h3 className="text-[20px] font-[700] leading-[26px]">Featured Products</h3>
                            </div>
                            <a href="#" className="items-center text-sm text-gray-500 hover:text-gray-700">
                              View All →
                            </a>
                          </div>

                          {/* Product Cards */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                            {mockData.products.map((p) => (
                              <ProductCard
                                key={p.id}
                                p={p}
                                hoveredId={hoveredId}
                                setHoveredId={setHoveredId}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    }

                    if (section.key === 'salesbanner') {
                      return (
                        <div key={section.key} className="h-[400px] bg-gray-100 overflow-hidden rounded-lg relative">
                          <Image src={mockData.salesBanner} alt="Sales Banner" fill className="object-cover" />
                        </div>
                      );
                    }

                    if (section.key === 'sale') {
                      return (
                        <div key={section.key}>
                          <div className="w-[100%] flex py-6 border-b border-[#DEE2E6] justify-between">
                            <div className="w-fit flex items-center gap-[20px]">
                              <h3 className="text-[20px] font-[700] leading-[26px]">On Sale</h3>
                            </div>
                            <a href="#" className="items-center text-sm text-gray-500 hover:text-gray-700">
                              View All →
                            </a>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                            {mockData.products.map((p) => (
                              <ProductCard
                                key={p.id}
                                p={p}
                                hoveredId={hoveredId}
                                setHoveredId={setHoveredId}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    }

                    if (section.key === 'best') {
                      return (
                        <div key={section.key}>
                          <div className="w-[100%] flex py-6 border-b border-[#DEE2E6] justify-between">
                            <div className="w-fit flex items-center gap-[20px]">
                              <h3 className="text-[20px] font-[700] leading-[26px]">Best Selling Products</h3>
                            </div>
                            <a href="#" className="items-center text-sm text-gray-500 hover:text-gray-700">
                              View All →
                            </a>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                            {mockData.products.map((p) => (
                              <ProductCard
                                key={p.id}
                                p={p}
                                hoveredId={hoveredId}
                                setHoveredId={setHoveredId}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    }

                    if (section.key === 'reviews') {
                      return (
                        <ReviewCarousel2
                          key="reviews-carousel"
                          testimonials={mockData.testimonials}
                        />
                      );
                    }

                    return null;
                  })}
                </div>
              </>
            )}

            {selectedTab === 'Products' && (
              <>
                <section className={`${isFilterOpen ? "overflow-hidden" : ""}`}>
                  <div className="relative bg-white">
                    <ProductsWithTab
                      products={mockData.products}
                      categories={mockData.categories}
                      filtered={filtered}
                      selectedCategory={selectedCategory}
                      setSelectedCategory={setSelectedCategory}
                      hoveredId={hoveredId}
                      setHoveredId={setHoveredId}
                      isFilterOpen={isFilterOpen}
                      setIsFilterOpen={setIsFilterOpen}
                      parts={mockData.parts}
                      models={mockData.models}
                    /></div>
                </section>
              </>
            )}
            {selectedTab === 'Sale' && (
              <>
                <section className={`${isFilterOpen ? "overflow-hidden" : ""}`}>
                  <div className="relative bg-white">
                    <ProductsWithTab
                      products={mockData.products}
                      categories={mockData.categories}
                      filtered={filtered}
                      selectedCategory={selectedCategory}
                      setSelectedCategory={setSelectedCategory}
                      hoveredId={hoveredId}
                      setHoveredId={setHoveredId}
                      isFilterOpen={isFilterOpen}
                      setIsFilterOpen={setIsFilterOpen}
                      parts={mockData.parts}
                      models={mockData.models}
                    />
                  </div>
                </section>
              </>
            )}

          </div>
        </div>
      </main>
    </div>
  )
}

export default StorePreviewPage
