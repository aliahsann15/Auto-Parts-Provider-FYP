'use client';
import { FC, useState, useEffect, ChangeEvent, useRef, startTransition } from 'react';
import Image from '@/app/components/AppImage';
import { FiPlus } from 'react-icons/fi';
import { Navigation } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import { useRouter } from 'next/navigation';

import { Category, Product } from '@/types';
import { useActionState } from 'react';
import { updateProduct } from '@/actions/product';
import { toast } from 'sonner';

interface UpdateProductState {
  success: boolean;
  message?: string;
  errors?: { [key: string]: string | string[] };
}

const initialState: UpdateProductState = { success: false, message: '', errors: {} };

export interface EditProductModalProps {
  isOpen: boolean;
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSave: (updated: Product) => void;
}

const EditProductModal: FC<EditProductModalProps> = ({ isOpen, product, categories, onClose, onSave }) => {
  const [state, dispatchServerAction, isPending] = useActionState<UpdateProductState, FormData>(
    updateProduct,
    initialState
  );

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); 
    const formData = new FormData(event.currentTarget);
  
    formData.delete('galleryImages');
    if (galleryFiles.length > 0) {
      galleryFiles.forEach((file, index) => {
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

  const [featuredFile, setFeaturedFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  // Initialize previews from product.images
  useEffect(() => {
    if (product) {
      setPreviewUrls(product.images);
      setFeaturedFile(null);
      setGalleryFiles([]);
    }
  }, [product]);

  // On successful update
  useEffect(() => {
    if (state.success) {
      toast('Product updated successfully');
      router.refresh();
      if (product) onSave({ ...product });
      onClose();
    }
  }, [state.success]);

  if (!isOpen || !product) return null;

  // Handlers for images
  const uploadFeaturedImage = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFeaturedFile(file);
    setPreviewUrls(prev => [URL.createObjectURL(file), ...prev.slice(1)]);
  };

  const addGalleryImages = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    setGalleryFiles(prev => [...prev, ...files]);
    setPreviewUrls(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
  };

  const deletePreview = (index: number) => {
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    if (index === 0) setFeaturedFile(null);
    else setGalleryFiles(prev => prev.filter((_, i) => i !== index - 1));
  };

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragEnter = (index: number) => {
    if (dragIndex === null || dragIndex === index) return;
    setGalleryFiles(prevFiles => {
      const files = [...prevFiles];
      const [moved] = files.splice(dragIndex - (featuredFile ? 1 : 0), 1);
      files.splice(index - (featuredFile ? 1 : 0), 0, moved);
      return files;
    });
    setPreviewUrls(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(dragIndex, 1);
      arr.splice(index, 0, moved);
      return arr;
    });
    setDragIndex(index);
  };
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = () => setDragIndex(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#00000090]">
      <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-3xl mx-4 overflow-y-auto max-h-[90vh]">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-black">Edit Product</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-4xl">&times;</button>
        </div>
        <form ref={formRef} onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <input type="hidden" name="id" value={product._id} />
          {!state.success && state.message && Object.keys(state.errors || {}).length === 0 && (
            <p className="md:col-span-2 text-red-600">{state.message}</p>
          )}

          {/* Featured Image */}
          <div className="flex flex-col items-start">
            <label htmlFor="featuredImageInput" className="block text-sm font-medium mb-2">Featured Image</label>
            {state.errors?.images && <p className="text-red-600 text-xs">{state.errors.images}</p>}
            <div className="relative w-40 h-40 rounded-lg overflow-hidden border-2 border-[#FFA500] group">
              {previewUrls[0] ? (
                <Image src={previewUrls[0]} alt="Featured" fill className="object-cover cursor-pointer" onClick={() => {}} unoptimized />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <span className="text-gray-400 text-sm">No Image</span>
                </div>
              )}
              <div className="absolute inset-0 bg-[#FFA500] bg-opacity-50 flex flex-col items-center justify-center space-y-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <label className="text-white text-xs font-bold cursor-pointer">
                  {previewUrls[0] ? 'Change Image' : 'Add Image'}
                  <input type="file" name="featuredImage" id="featuredImageInput" accept="image/*" className="hidden" onChange={uploadFeaturedImage} />
                </label>
                {previewUrls[0] && (
                  <button type="button" onClick={() => deletePreview(0)} className="text-white text-xs font-bold cursor-pointer">Remove</button>
                )}
              </div>
            </div>
          </div>

          {/* Gallery Images */}
          <div className="flex flex-col">
            <label className="block text-sm font-medium mb-2">Gallery Images</label>
            {state.errors?.galleryImages && Array.isArray(state.errors.galleryImages) && state.errors.galleryImages.map((err,i) => (
              <p key={i} className="text-red-600 text-xs">{err}</p>
            ))}
            <div className="grid grid-cols-4 gap-2 mb-2 h-44 overflow-y-auto">
              {previewUrls.slice(1).map((url, i) => (
                <div key={url+i} draggable onDragStart={() => handleDragStart(i+1)} onDragEnter={() => handleDragEnter(i+1)} onDragOver={handleDragOver} onDrop={handleDrop} className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-[#FFA500] cursor-pointer">
                  <img src={url} alt={`Gallery ${i+1}`} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => deletePreview(i+1)} className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center">×</button>
                </div>
              ))}
              {previewUrls.length-1 + galleryFiles.length < 8 && (
                <label className="relative flex items-center justify-center w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#FFA500]">
                  <FiPlus className="text-2xl text-gray-400 hover:text-[#FFA500]" />
                  <input type="file" multiple name="galleryImages" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={addGalleryImages} />
                </label>
              )}
            </div>
          </div>

          {/* Text, Number Inputs */}
          {([
            ['Product Name','name','text',product.name],
            ['Company','brand','text',product.brand],
            ['Maker','make','text',product.make],
            ['Model','carModel','text',product.carModel],
            ['Variant','variant','text',product.variant],
            ['SKU','sku','text',String(product.sku)],
            ['Original Price','price','number',String(product.price)],
            ['Sale Price','salePrice','number',String(product.salePrice||'')],
            ['Stock','stock','number',String(product.stock)]
          ] as const).map(([label,key,type,value])=> (
            <div key={key}>
              <label htmlFor={`${key}Input`} className="block text-sm font-medium mb-2">{label}</label>
              <input type={type} id={`${key}Input`} name={key} defaultValue={value} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-2" step={type==='number'?'1':undefined} />
              {state.errors?.[key] && <p className="text-red-600 text-xs">{state.errors[key]}</p>}
            </div>
          ))}

          {/* Categories */}
          <div className="md:col-span-1">
            <label className="block text-sm font-medium mb-2">Categories</label>
            <div className="grid grid-cols-2 gap-2">
              {categories.map(c => (
                <label key={c._id} className="inline-flex items-center space-x-2">
                  <input type="checkbox" name="categories" value={c._id} defaultChecked={product.categories.includes(c._id)} style={{accentColor:'#FFA500'}} className="h-4 w-4" />
                  <span className="text-gray-700 text-sm">{c.name}</span>
                </label>
              ))}
            </div>
            {state.errors?.categories && Array.isArray(state.errors.categories) && state.errors.categories.map((e,i)=>(<p key={i} className="text-red-600 text-xs">{e}</p>))}
          </div>

          {/* Status */}
          <div className="md:col-span-1">
            <label htmlFor="statusInput" className="block text-sm font-medium mb-2">Status</label>
            <select id="statusInput" name="status" defaultValue={product.status} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-2">
              <option value="active">Active</option>
              <option value="draft">Draft</option>
            </select>
            {state.errors?.status && <p className="text-red-600 text-xs">{state.errors.status}</p>}
          </div>

          {/* Descriptions */}
          <div className="md:col-span-2">
            <label htmlFor="descriptionInput" className="block text-sm font-medium mb-2">Description</label>
            <textarea rows={4} id="descriptionInput" name="description" defaultValue={product.description} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-2" />
            {state.errors?.description && <p className="text-red-600 text-xs">{state.errors.description}</p>}
          </div>

          <div className="md:col-span-2">
            <label htmlFor="technicalDescriptionInput" className="block text-sm font-medium mb-2">Technical Description</label>
            <textarea rows={4} id="technicalDescriptionInput" name="technicalDescription" defaultValue={product.technicalDescription} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-2" />
            {state.errors?.technicalDescription && <p className="text-red-600 text-xs">{state.errors.technicalDescription}</p>}
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end space-x-3 md:col-span-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={isPending} className="px-4 py-2 rounded-lg bg-[#FFA500] text-white hover:bg-[#e59400] disabled:opacity-50">{isPending?'Updating...':'Update Product'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProductModal;
