'use client';
import { FC, useState, useEffect, ChangeEvent, useRef, startTransition } from 'react';
import Image from '@/app/components/AppImage';
import { FiPlus } from 'react-icons/fi';
import { Navigation } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import { useRouter } from 'next/navigation';

import { Category } from '@/types'; // Assuming types are defined
import { useActionState } from 'react';
import { createProduct } from '@/actions/product'; // Import the server action
import { toast } from 'sonner';

// Define the state shape returned by the server action
interface CreateProductState {
  success: boolean;
  message?: string;
  errors?: {
    [key: string]: string | string[];
  };
}

const initialState: CreateProductState = {
  success: false,
  message: '',
  errors: {},
};

export interface AddProductModalProps {
  isOpen: boolean;
  categories: Category[];
  onClose: () => void;
}

const AddProductModal: FC<AddProductModalProps> = ({
  isOpen,
  categories,
  onClose,
}) => {

  const [state, dispatchServerAction, isPending] = useActionState<CreateProductState, FormData>(
    createProduct,
    initialState
  );

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); 
    const formData = new FormData(event.currentTarget);
  
    formData.delete('galleryImages');
    if (galleryFiles.length > 0) {
      galleryFiles.forEach((file) => {
        formData.append('galleryImages', file); 
      });
    } 

    if (!featuredFile && formData.has('featuredImage')) {
        const currentFeaturedImage = formData.get('featuredImage');
        if (currentFeaturedImage instanceof File && currentFeaturedImage.size === 0) {
            formData.delete('featuredImage');
        }
    }
    startTransition(() => {
      dispatchServerAction(formData);
    })
  };

  // Client-side state is now minimal, mainly for UI concerns like previews and file management before submission
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [featuredFile, setFeaturedFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);

  // Drag state for gallery reorder (still needed for client-side sorting before submitting files)
  const [dragIndex, setDragIndex] = useState<number | null>(null);


  // Ref for the form to manually reset it after success
  const formRef = useRef<HTMLFormElement>(null);

  const router = useRouter();

  // Effect to handle modal open/close and action state changes
  useEffect(() => {
    if (state.success) {
      // clear all client state
      // clear all client state
      setFeaturedFile(null);
      setGalleryFiles([]);
      setPreviewImage(null);
      setCurrentSlide(0);
      formRef.current?.reset();
      router.refresh()
    }
  }, [state.success, onClose]);

  // 2️⃣ Handle the action result separately
  useEffect(() => {
    if (state.success && isOpen) {
      toast.success("Product added successfully");
      onClose();
    }

    if (!state.success && state.message && state.message.length > 0) {
      console.error(
        "Form submission failed:",
        state.message,
        state.errors
      );
    }
  }, [state.success, state.message, state.errors, isOpen, onClose]);



  const uploadFeaturedImage = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFeaturedFile(file);
    // Update preview immediately for featured image
    setCurrentSlide(0);
  };

  const addGalleryImages = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
  
    const filesToAdd = Array.from(e.target.files);
    const totalAfter = galleryFiles.length + filesToAdd.length;
  
    // Block if we’d go over 8
    if (totalAfter > 8) {
      const slotsLeft = 8 - galleryFiles.length;
      toast.error(
        slotsLeft > 0
          ? `You can only add ${slotsLeft} more image${slotsLeft > 1 ? 's' : ''}.`
          : `You cannot add any more images.`
      );
      return;
    }
  
    setGalleryFiles(prev => [...prev, ...filesToAdd]);
  
    // Clear the input so the same file(s) can be re-selected if needed
    e.target.value = '';
  };

  const deleteImage = (fileToDelete: File, isFeatured: boolean) => {
    if (isFeatured) {
      // Revoke the old preview URL to free up memory
      if (featuredFile) URL.revokeObjectURL(URL.createObjectURL(featuredFile));
      setFeaturedFile(null);
      // If the deleted image was in preview, clear preview
      if (previewImage === URL.createObjectURL(fileToDelete)) {
        setPreviewImage(null);
        setCurrentSlide(0);
      }
    } else {
      // Revoke the old preview URL
      URL.revokeObjectURL(URL.createObjectURL(fileToDelete));
      setGalleryFiles(prevFiles => prevFiles.filter(file => file !== fileToDelete));

      // If the deleted image was in preview, adjust the preview
      if (previewImage === URL.createObjectURL(fileToDelete)) {
        const remainingFiles = galleryFiles.filter(file => file !== fileToDelete);
        const allFilesForPreviewAfterDelete = featuredFile ? [featuredFile, ...remainingFiles] : remainingFiles;

        if (allFilesForPreviewAfterDelete.length > 0) {
          // Find the closest file's index and set preview
          const newIndex = Math.min(currentSlide, allFilesForPreviewAfterDelete.length - 1);
          setCurrentSlide(newIndex);
        } else {
          setCurrentSlide(0);
        }
      }
    }
  };

  // Combine featured and gallery files for preview
  const allFilesForPreview = featuredFile ? [featuredFile, ...galleryFiles] : [...galleryFiles];
  const allPreviewUrls = allFilesForPreview.map(file => URL.createObjectURL(file));

  // Drag handlers for gallery reorder (operate on galleryFiles array)
  const handleDragStart = (index: number) => {
    setDragIndex(index); // Index within galleryFiles array
  };

  const handleDragEnter = (index: number) => {
    if (dragIndex === null || dragIndex === index) return;
    setGalleryFiles(prevFiles => {
      const files = [...prevFiles];
      const [moved] = files.splice(dragIndex, 1);
      files.splice(index, 0, moved);
      return files;
    });
    setDragIndex(index); // Update dragIndex as the item's position changes
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = () => {
    setDragIndex(null);
  };


  // If modal is not open, return null
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#00000090]">
      <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-3xl mx-4 overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-black">Add New Product</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-4xl">
            &times;
          </button>
        </div>
        {/* Removed the id attribute as the button is inside the form */}
        <form 
          ref={formRef} onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Display general error message if any */}
          {!state.success && state.message && Object.keys(state.errors || {}).length === 0 && (
            <p className="md:col-span-2 text-red-600">{state.message}</p>
          )}


          {/* Featured Image */}
          <div className="flex flex-col items-start">
            <label htmlFor="featuredImageInput" className="block text-sm font-medium mb-2">Featured Image</label>
            {/* Display field-specific error for featured image */}
            {state.errors?.images && <p className="text-red-600 text-xs">{state.errors.images}</p>}
            <div className="relative w-40 h-40 rounded-lg overflow-hidden border-2 border-[#FFA500] group">
              {featuredFile ? (
                <Image
                  src={URL.createObjectURL(featuredFile)} // Use URL for client preview
                  alt="Featured"
                  fill
                  className="object-cover cursor-pointer"
                  // Set preview state on click
                  onClick={() => {
                    // setPreviewImage(URL.createObjectURL(featuredFile))
                    setCurrentSlide(0); // Featured image is index 0 in preview
                  }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <span className="text-gray-400 text-sm">No Image</span>
                </div>
              )}
              <div className="absolute inset-0 bg-[#FFA500] bg-opacity-50 flex flex-col items-center justify-center space-y-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {/* Input for file upload - Must have a 'name' */}
                <label className="text-white text-xs font-bold cursor-pointer">
                  {featuredFile ? 'Change Image' : 'Add Image'}
                  <input
                    type="file"
                    name="featuredImage" // Important for FormData
                    id="featuredImageInput"
                    accept="image/*"
                    className="hidden"
                    onChange={uploadFeaturedImage}
                  />
                </label>
                {featuredFile && (
                  <button
                    type="button" // Prevent form submission
                    onClick={(e) => {
                      setPreviewImage(featuredFile.name)
                      e.stopPropagation();
                      setCurrentSlide(0);
                    }}
                    className="text-white text-xs font-bold cursor-pointer"
                  >
                    View Image
                  </button>
                )}
                {featuredFile && (
                  <button
                    type="button" // Prevent form submission
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteImage(featuredFile, true); // Delete featured image file
                    }}
                    className="text-white text-xs font-bold cursor-pointer"
                  >
                    Remove Image
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Gallery */}
          <div className="flex flex-col">
            <label className="block text-sm font-medium mt-1 mb-2.5">Gallery Images</label>
            {/* Display field-specific error for gallery images */}
            {state.errors?.galleryImages && Array.isArray(state.errors.galleryImages) && state.errors.galleryImages.map((error, i) => (
              <p key={i} className="text-red-600 text-xs">{error}</p>
            ))}
            <div className="grid grid-cols-4 gap-2 mb-2 h-44 overflow-y-auto">
              {/* Map over galleryFiles for display and drag/drop */}
              {galleryFiles.map((file, i) => (
                <div
                  key={file.name + i} // Use a combination for a potentially more unique key
                  draggable
                  onDragStart={() => handleDragStart(i)} // Index within galleryFiles
                  onDragEnter={() => handleDragEnter(i)}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-[#FFA500]"
                >
                  {/* Use Image component for optimized gallery display */}
                  <Image
                    src={URL.createObjectURL(file)} // Use URL for client preview
                    alt={`Gallery ${i + 1}`}
                    fill
                    className="object-cover cursor-pointer"
                    onClick={() => {
                      // Adjust index for preview based on whether a featured image exists
                      setCurrentSlide(featuredFile ? allFilesForPreview.findIndex(f => f === file) : i);
                      setPreviewImage(file.name)
                    }}
                  />
                  <button
                    type="button" // Prevent form submission
                    onClick={e => { e.stopPropagation(); deleteImage(file, false); }} // Indicate it's a gallery image file
                    className="absolute top-[0px] right-[0px] bg-red-600 text-white rounded-full shadow-md w-5 h-5 flex items-center justify-center" // Added size and centering
                    aria-label={`Delete image ${i + 1}`}
                  >
                    <svg width="12" height="12" viewBox="0 -0.5 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6.96967 16.4697C6.67678 16.7626 6.67678 17.2374 6.96967 17.5303C7.26256 17.8232 7.73744 17.8232 8.03033 17.5303L6.96967 16.4697ZM13.0303 12.5303C13.3232 12.2374 13.3232 11.7626 13.0303 11.4697C12.7374 11.1768 12.2626 11.1768 11.9697 11.4697L13.0303 12.5303ZM11.9697 11.4697C11.6768 11.7626 11.6768 12.2374 11.9697 12.5303C12.2626 12.8232 12.7374 12.8232 13.0303 12.5303L11.9697 11.4697ZM18.0303 7.53033C18.3232 7.23744 18.3232 6.76256 18.0303 6.46967C17.7374 6.17678 17.2626 6.17678 16.9697 6.46967L18.0303 7.53033ZM13.0303 11.4697C12.7374 11.1768 12.2626 11.1768 11.9697 11.4697C11.6768 11.7626 11.6768 12.2374 11.9697 12.5303L13.0303 11.4697ZM16.9697 17.5303C17.2626 17.8232 17.7374 17.8232 18.0303 17.5303C18.3232 17.2374 18.3232 16.7626 18.0303 16.4697L16.9697 17.5303ZM11.9697 12.5303C12.2626 12.8232 12.7374 12.8232 13.0303 12.5303C13.3232 12.2374 13.3232 11.7626 13.0303 11.4697L11.9697 12.5303ZM8.03033 6.46967C7.73744 6.17678 7.26256 6.17678 6.96967 6.46967C6.67678 6.76256 6.67678 7.23744 6.96967 7.53033L8.03033 6.46967ZM8.03033 17.5303L13.0303 12.5303L11.9697 11.4697L6.96967 16.4697L8.03033 17.5303ZM13.0303 12.5303L18.0303 7.53033L16.9697 6.46967L11.9697 11.4697L13.0303 12.5303ZM11.9697 12.5303L16.9697 17.5303L18.0303 16.4697L13.0303 11.4697L11.9697 12.5303ZM13.0303 11.4697L8.03033 6.46967L6.96967 7.53033L11.9697 12.5303L13.0303 11.4697Z" fill="#ffffff"></path>
                    </svg>
                  </button>
                </div>
              ))}
              {/* Input for adding multiple gallery files - Must have a 'name' */}
              {galleryFiles.length < 8 && (<label className="relative flex items-center justify-center w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#FFA500]">
                <FiPlus className="text-2xl text-gray-400 hover:text-[#FFA500]" />
                <input
                  type="file"
                  multiple
                  name="galleryImages" // Important for FormData (will be an array of files)
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={addGalleryImages} // Use client-side handler to add files to state
                />
              </label>)}
            </div>
          </div>

          {/* Text, Number Inputs */}
          {/* TODO: add min 0 in stock field */}
          {/* TODO: check if stock is unique */}
          {(
            [
              ['Product Name', 'name', 'text'],
              ['Company', 'brand', 'text'],
              ['Maker', 'make', 'text'],
              ['Model', 'carModel', 'text'],
              ['Variant', 'variant', 'text'],
              ['SKU', 'sku', 'text'], // SKU can contain letters, so text is safer
              ['Original Price', 'price', 'number'],
              ['Sale Price', 'salePrice', 'number'],
              ['Stock', 'stock', 'number']
            ] as const
          ).map(([label, key, type]) => (
            <div key={key}>
              <label htmlFor={`${key}Input`} className="block text-sm font-medium mb-2">{label}</label>
              <input
                type={type}
                id={`${key}Input`}
                name={key}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-2"
                step={type === 'number' ? '1' : undefined}
              />
              {state.errors?.[key] && <p className="text-red-600 text-xs">{state.errors[key]}</p>}
            </div>
          ))}

          {/* Categories Checkboxes */}
          <div className="md:col-span-1">
            <label className="block text-sm font-medium mb-2">Categories</label>
            {/* Display field-specific error */}
            <div className="grid grid-cols-2 gap-2">
              {categories.map((c: Category) => (
                // Checkboxes for categories - Must have same 'name' and a 'value'
                <label key={c._id} className="inline-flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="categories" // Important: Same name for all checkboxes in this group
                    value={c._id} // Important: The value to send in FormData
                    // checked prop is now harder to manage without client-side form state.
                    // If you need to pre-select categories (e.g., for editing),
                    // you'd need to handle this differently, perhaps with defaultValue on the form
                    // or initial state passed to useActionState if it included form values (less common).
                    // For a simple "add" form, default is unchecked.
                    style={{ accentColor: '#FFA500' }}
                    className="custom-checkbox h-4 w-4"
                  />
                  <span className="text-gray-700 text-sm">{c.name}</span>
                </label>
              ))}
            </div>
            {state.errors?.categories && Array.isArray(state.errors.categories) && state.errors.categories.map((error, i) => (
              <p key={i} className="text-red-600 text-xs">{error}</p>
            ))}
          </div>

          {/* Status Select */}
          <div className="md:col-span-1">
            <label htmlFor="statusInput" className="block text-sm font-medium mb-2">Status</label>
            {/* Display field-specific error */}
            <select
              id="statusInput" // Add ID for label
              name="status" // Important for FormData
              // Remove value and onChange
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-2"
              // Add defaultValue if you need a default option selected
              defaultValue="active"
            >
              <option value="active">Active</option>
              <option value="draft">Draft</option>
            </select>
            {state.errors?.status && <p className="text-red-600 text-xs">{state.errors.status}</p>}

          </div>

          {/* Descriptions Textareas */}
          <div className="md:col-span-2">
            <label htmlFor="descriptionInput" className="block text-sm font-medium mb-2">Description</label>
            {/* Display field-specific error */}
            <textarea
              rows={8}
              id="descriptionInput" // Add ID for label
              name="description" // Important for FormData
              // Remove value and onChange
              className="text-xs w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-2"
            />
            {state.errors?.description && <p className="text-red-600 text-xs">{state.errors.description}</p>}

          </div>

          <div className="md:col-span-2">
            <label htmlFor="technicalDescriptionInput" className="block text-sm font-medium mb-2">Technical Description</label>
            {/* Display field-specific error */}
            <textarea
              rows={8}
              id="technicalDescriptionInput" // Add ID for label
              name="technicalDescription" // Important for FormData
              // Remove value and onChange
              className="text-xs w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-2"
            />
            {state.errors?.technicalDescription && <p className="text-red-600 text-xs">{state.errors.technicalDescription}</p>}
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end space-x-3 md:col-span-2"> {/* Ensure buttons span both columns */}
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">
              Cancel
            </button>
            {/* The submit button. type="submit" inside a form with action calls the action */}
            {/* REMOVED form="your-form-id" as the button is inside the form */}
            {/* Use the isPending state to disable the button while the action runs */}
            <button
              type="submit"
              className="cursor-pointer px-4 py-2 rounded-lg bg-[#FFA500] text-white hover:bg-[#e59400]"
              disabled={isPending} // Disable while action is pending
            >
              {isPending ? 'Adding Product...' : 'Add Product'}
            </button>
          </div>
        </form>

      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="z-[100000000] fixed inset-0 flex items-center justify-center bg-black bg-opacity-80"
          onClick={() => setPreviewImage(null)} // Close preview on backdrop click
        >
          {/* Slide counter */}
          {allPreviewUrls.length > 0 && ( // Only show counter if there are images
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-60 px-3 py-1 rounded text-white text-l z-20">
              {currentSlide + 1}/{allPreviewUrls.length}
            </div>
          )}


          <div onClick={e => e.stopPropagation()} className="relative w-full max-w-3xl h-full max-h-[90vh] flex items-center justify-center">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 text-white z-10 text-3xl"
              aria-label="Close Preview"
            >
              &times;
            </button>

            {allPreviewUrls.length > 0 ? ( // Only render Swiper if there are images
              <Swiper
                modules={[Navigation]}
                navigation
                spaceBetween={20}
                slidesPerView={1}
                className="w-full h-full"
                // Find the index of the currently previewed image URL
                initialSlide={allPreviewUrls.findIndex(url => url === previewImage)}
                onSlideChange={(swiper) => {
                  const activeIndex = swiper.realIndex;
                  setCurrentSlide(activeIndex);
                  // Update previewImage state based on the URL of the file at the new index
                  setPreviewImage(allPreviewUrls[activeIndex] || null);
                }}
              >
                {allPreviewUrls.map((src, idx) => (
                  <SwiperSlide key={src + idx} className="flex items-center justify-center">
                    {/* Use img tag for object URLs in preview */}
                    <Image
                        src={src}
                        alt={`Preview ${idx}`}
                        fill
                        className="object-contain rounded-lg shadow-lg cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      />
                  </SwiperSlide>
                ))}
              </Swiper>
            ) : (
              <div className="text-white">No images to preview</div>
            )}


            <style jsx global>{`
              .swiper-button-prev,
              .swiper-button-next {
                color: #fff !important;
                top: 50% !important;
                transform: translateY(-50%) !important;
                width: 2.5rem !important;
                height: 2.5rem !important;
              }
              .swiper-button-prev {
                left: 1rem !important;
              }
              .swiper-button-next {
                right: 1rem !important;
              }
              .swiper-button-prev::after,
              .swiper-button-next::after {
                font-size: 1.5rem !important;
              }
            `}</style>
          </div>
        </div>
      )}

    </div>
  );
};

export default AddProductModal;
