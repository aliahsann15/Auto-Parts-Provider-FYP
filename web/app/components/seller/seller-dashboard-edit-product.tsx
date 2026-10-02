'use client'

import { Category, Product } from '@/types' // Assuming Product.categories is string[] (IDs)
import Image from '@/app/components/AppImage'
import React, { FC, useState, useEffect, ChangeEvent, DragEvent } from 'react'
import { FiPlus } from 'react-icons/fi'
import { Navigation } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'
import 'swiper/css' // Basic Swiper styles
import 'swiper/css/navigation' // Navigation module styles

export interface EditProductModalProps {
  isOpen: boolean
  product: Product | null
  categories: Category[] // List of all available categories
  onClose: () => void
  onSave: (updatedProduct: Product) => void
}

const EditProductModal: FC<EditProductModalProps> = ({
  isOpen,
  product,
  categories,
  onClose,
  onSave,
}) => {
  const initialFormProductState: Product = {
    _id: '',
    images: [],
    name: '',
    brand: '',
    carModel: '',
    make: '',
    variant: '',
    sku: "",
    status: 'active',
    price: 0,
    salePrice: 0,
    stock: 0,
    categories: [], // Expecting string[] (category IDs)
    description: '',
    technicalDescription: '',
  }

  const [formProduct, setFormProduct] = useState<Product>(initialFormProductState)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [currentSlide, setCurrentSlide] = useState<number>(0)

  // Populate form when product prop changes
  useEffect(() => {
    if (product) {
      setFormProduct(product)
    } else {
      // Optionally reset to initial state if product becomes null while modal is open
      // setFormProduct(initialFormProductState);
    }
  }, [product])

  const handleFieldChange = (
    field: keyof Omit<Product, 'categories' | 'images'>, // Fields other than categories and images
    value: string | number
  ) => {
    setFormProduct(prev => ({ ...prev, [field]: value }))
  }

  const handleCategoryToggle = (categoryIdToToggle: string) => {
    setFormProduct(prevFormProduct => {
      const isAlreadySelected = prevFormProduct.categories?.includes(categoryIdToToggle)
      let updatedCategories: string[]

      if (isAlreadySelected) {
        updatedCategories = prevFormProduct.categories.filter(
          selectedCatId => selectedCatId !== categoryIdToToggle
        )
      } else {
        updatedCategories = [...prevFormProduct.categories, categoryIdToToggle]
      }

      return {
        ...prevFormProduct,
        categories: updatedCategories, // Corrected key from 'category' to 'categories'
      }
    })
  }

  const handleAddImages = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const newImageFiles = Array.from(e.target.files)
    const newImageUrls = newImageFiles.map(file => URL.createObjectURL(file))
    // TODO: Consider managing actual File objects if direct upload is needed later,
    // as object URLs are temporary.
    setFormProduct(prev => ({
      ...prev,
      images: [...prev.images, ...newImageUrls],
    }))
  }

  const handleDeleteImage = (indexToDelete: number) => {
    // Revoke object URL if it was created by createObjectURL to free memory
    const imageUrlToDelete = formProduct.images[indexToDelete];
    if (imageUrlToDelete && imageUrlToDelete.startsWith('blob:')) {
      URL.revokeObjectURL(imageUrlToDelete);
    }

    setFormProduct(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== indexToDelete),
    }))
  }

  const handleFeaturedUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const newFeaturedImageUrl = URL.createObjectURL(file)
    const oldFeaturedImageUrl = formProduct.images[0]

    // Revoke old featured image URL if it exists and was an object URL
    if (oldFeaturedImageUrl && oldFeaturedImageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(oldFeaturedImageUrl);
    }

    setFormProduct(prev => ({
      ...prev,
      images: [newFeaturedImageUrl, ...prev.images.slice(1)],
    }))
  }

  const handleSave = () => {
    // Note: `formProduct.categories` is assumed to be string[] (IDs).
    // If `Product` type expects `Category[]`, map IDs to Category objects here.
    // Example for mapping if Product.categories was Category[]:
    // const resolvedCategories = formProduct.categories
    //   .map(id => categories.find(cat => cat._id === id))
    //   .filter(Boolean) as Category[];

    onSave({
      ...formProduct,
      // categories: resolvedCategories, // if mapping is needed
      status: formProduct.status as 'active' | 'draft', // Type assertion
    })
    onClose()
  }

  // Drag and Drop handlers for gallery images
  const handleDragStart = (index: number) => {
    setDragIndex(index) // index is the absolute index in formProduct.images
  }

  const handleDragEnter = (newIndex: number) => {
    if (dragIndex === null || dragIndex === newIndex || newIndex === 0 || dragIndex === 0) return // Prevent dragging featured or into featured slot this way

    setFormProduct(prev => {
      const reorderedImages = [...prev.images]
      const [draggedItem] = reorderedImages.splice(dragIndex, 1)
      reorderedImages.splice(newIndex, 0, draggedItem)
      return { ...prev, images: reorderedImages }
    })
    setDragIndex(newIndex)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault() // Necessary to allow dropping
  }

  const handleDrop = () => {
    setDragIndex(null)
  }

  // Cleanup object URLs when component unmounts or product changes
  useEffect(() => {
    const currentImageUrls = formProduct.images;
    return () => {
      currentImageUrls.forEach(url => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]); // Rerun if the product (and its initial images) changes


  if (!isOpen || !product) return null

  const allImages = formProduct.images.filter(Boolean); // For Swiper and preview logic

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-xl shadow-xl p-6 sm:p-8 w-full max-w-3xl mx-4 overflow-y-auto max-h-[90vh]">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Edit Product</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-4xl leading-none"
            aria-label="Close Modal"
          >
            &times;
          </button>
        </div>

        <form
          onSubmit={e => e.preventDefault()} // Prevent default form submission
          onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }} // Prevent submit on Enter
          className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5"
        >
          {/* Featured Image Upload */}
          <div className="flex flex-col items-start">
            <label htmlFor="featured-image-upload" className="block text-sm font-medium text-gray-700 mb-2">
              Featured Image
            </label>
            <div className="relative w-40 h-40 rounded-lg overflow-hidden border-2 border-orange-500 group">
              {formProduct.images[0] ? (
                <Image
                  width={160} // ควรตรงกับ w-40 (10rem = 160px)
                  height={160} // ควรตรงกับ h-40
                  src={formProduct.images[0]}
                  alt="Featured product image"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                  No Image
                </div>
              )}
              <div className="absolute inset-0 group-hover:bg-black/40 flex flex-col items-center justify-center space-y-1 transition-all duration-200">
                <label htmlFor="featured-image-upload-input" className="opacity-0 group-hover:opacity-100 text-white text-xs font-bold cursor-pointer transition-opacity duration-200">
                  Change Image
                  <input id="featured-image-upload-input" type="file" accept="image/*" className="hidden" onChange={handleFeaturedUpload} />
                </label>
                {formProduct.images[0] && (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation()
                      setPreviewImage(formProduct.images[0])
                      setCurrentSlide(0)
                    }}
                    className="opacity-0 group-hover:opacity-100 text-white text-xs font-bold cursor-pointer transition-opacity duration-200"
                  >
                    View Image
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Gallery Manager */}
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mt-1 mb-2.5">
              Gallery Images ({formProduct.images.slice(1).length})
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2 max-h-48 overflow-y-auto p-1 rounded-md">
              {formProduct.images.slice(1).map((path, i) => {
                const galleryImageIndex = i + 1 // Actual index in formProduct.images
                return (
                  <div
                    key={path || `gallery-img-${galleryImageIndex}`} // Use path or index for key
                    draggable
                    onDragStart={() => handleDragStart(galleryImageIndex)}
                    onDragEnter={() => handleDragEnter(galleryImageIndex)}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className={`w-20 h-20 border-2 ${dragIndex === galleryImageIndex ? 'border-blue-500 opacity-50' : 'border-orange-500'} relative group rounded-lg overflow-hidden cursor-grab`}
                  >
                    <Image
                        width={80}
                        height={80}
                        src={path}
                        alt={`Gallery image ${i + 1}`}
                        className="w-full h-full object-cover"
                        onClick={() => {
                            setPreviewImage(path)
                            // Find index in the combined list for Swiper
                            const overallIndex = allImages.findIndex(img => img === path);
                            setCurrentSlide(overallIndex !== -1 ? overallIndex : 0);
                        }}
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(galleryImageIndex)}
                      className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full p-0.5 shadow-md opacity-80 group-hover:opacity-100"
                      aria-label={`Delete gallery image ${i + 1}`}
                    >
                      {/* Simplified SVG or use an icon library */}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>
                )
              })}
              {formProduct.images.slice(1).length < 8 && <label htmlFor="add-gallery-images-input" className="relative group rounded-lg flex items-center justify-center w-20 h-20 border-2 border-dashed border-gray-300 hover:border-orange-500 cursor-pointer transition-colors">
                <FiPlus className="text-2xl text-gray-400 group-hover:text-orange-500 transition-colors" />
                <input
                  id="add-gallery-images-input"
                  type="file"
                  multiple
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handleAddImages}
                />
              </label>}
            </div>
          </div>

          {/* Text Fields: Product Name, SKU, etc. */}
          {[
            { label: 'Product Name', field: 'name', type: 'text' },
            { label: 'SKU', field: 'sku', type: 'text' }, // SKU might be string or number based on needs
            { label: 'Company', field: 'brand', type: 'text' },
            { label: 'Make', field: 'make', type: 'text' },
            { label: 'Model', field: 'carModel', type: 'text' },
            { label: 'Stock', field: 'stock', type: 'number' },
            { label: 'Original Price', field: 'price', type: 'number' },
            { label: 'Sale Price', field: 'salePrice', type: 'number' },
          ].map(({ label, field, type }) => (
            <div key={field}>
              <label htmlFor={field} className="block text-sm font-medium text-gray-700 mb-1.5">
                {label}
              </label>
              <input
                id={field}
                type={type}
                value={formProduct[field as keyof Product]}
                onChange={e => handleFieldChange(field as keyof Omit<Product, 'categories' | 'images'>, type === 'number' ? Number(e.target.value) : e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-sm"
              />
            </div>
          ))}

          {/* Categories */}
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Categories
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto border-gray-200 rounded-md p-2">
              {categories.map(cat => (
                <label key={cat._id} className="flex items-center space-x-2 text-sm hover:bg-gray-50 p-1 rounded">
                  <input
                    type="checkbox"
                    checked={formProduct.categories?.includes(cat._id)}
                    onChange={() => handleCategoryToggle(cat._id)}
                    className="form-checkbox h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                    style={{ accentColor: '#FFA500' }} // For better cross-browser check color
                  />
                  <span className="text-gray-700">{cat.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="md:col-span-1">
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1.5">
              Status
            </label>
            <select
              id="status"
              value={formProduct.status}
              onChange={e => handleFieldChange('status', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-sm"
            >
              <option value="active">Active</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1.5">
              Description
            </label>
            <textarea
              id="description"
              rows={6}
              value={formProduct.description}
              onChange={e => handleFieldChange('description', e.target.value)}
              className="text-sm w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          {/* Technical Description */}
          <div className="md:col-span-2">
            <label htmlFor="technicalDescription" className="block text-sm font-medium text-gray-700 mb-1.5">
              Technical Description
            </label>
            <textarea
              id="technicalDescription"
              rows={6}
              value={formProduct.technicalDescription}
              onChange={e => handleFieldChange('technicalDescription', e.target.value)}
              className="text-sm w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        </form>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-600"
          >
            Save Changes
          </button>
        </div>
      </div>

      {/* Image Preview Modal (Swiper) */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80" // Ensure this z-index is higher than main modal's overlay but allows main modal interaction if needed
          onClick={() => setPreviewImage(null)} // Click on backdrop to close preview
        >
          <div
            className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/70 px-3 py-1 rounded-md text-white text-sm z-10"
          >
            {currentSlide + 1} / {allImages.length}
          </div>
          <button
            onClick={e => { e.stopPropagation(); setPreviewImage(null); }}
            className="absolute top-4 right-4 text-white z-10 p-2 rounded-full hover:bg-black/50"
            aria-label="Close Preview"
          >
             {/* Using a simpler SVG for close */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>

          <div className="w-full max-w-3xl p-4" onClick={e => e.stopPropagation()}> {/* Prevent click inside Swiper from closing */}
            <Swiper
              modules={[Navigation]}
              navigation
              spaceBetween={20}
              slidesPerView={1}
              className="h-full"
              initialSlide={allImages.findIndex(src => src === previewImage)}
              onSlideChange={(swiper) => setCurrentSlide(swiper.realIndex)}
            >
              {allImages.map((src, idx) => (
                <SwiperSlide key={src || idx} className="flex items-center justify-center">
                  <img
                    src={src}
                    alt={`Product image preview ${idx + 1}`}
                    className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-xl"
                  />
                </SwiperSlide>
              ))}
            </Swiper>
            {/* Global styles for Swiper navigation buttons if needed, or style via CSS modules/Tailwind config */}
             <style jsx global>{`
                .swiper-button-prev,
                .swiper-button-next {
                  color: #ffffff; // White arrows
                  background-color: rgba(0,0,0,0.3);
                  border-radius: 50%;
                  width: 2.75rem; // Adjusted size
                  height: 2.75rem;
                  top: 50%;
                  transform: translateY(-50%);
                  transition: background-color 0.2s;
                }
                .swiper-button-prev:hover,
                .swiper-button-next:hover {
                  background-color: rgba(0,0,0,0.5);
                }
                .swiper-button-prev::after,
                .swiper-button-next::after {
                  font-size: 1rem; // Smaller arrow icons
                  font-weight: bold;
                }
                .swiper-button-prev {
                  left: 1rem;
                }
                .swiper-button-next {
                  right: 1rem;
                }
            `}</style>
          </div>
        </div>
      )}
    </div>
  )
}

export default EditProductModal
