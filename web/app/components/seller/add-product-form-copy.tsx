// 'use client';
// import { FC, useState, useEffect } from 'react';
// import { toast } from 'sonner';
// import { Category } from '@/types';

// interface AddProductModalProps {
//   isOpen: boolean;
//   categories: Category[];
//   onClose: () => void;
// }

// export interface CreateProductState {
//   success: boolean;
//   message?: string;
//   errors??: Record<string, string | string[]>;
// }

// const AddProductModal: FC<AddProductModalProps> = ({ isOpen, categories, onClose }) => {
//   // 1️⃣ Form state
//   const [name, setName] = useState('');
//   const [brand, setBrand] = useState('');
//   const [make, setMake] = useState('');
//   const [carModel, setCarModel] = useState('');
//   const [variant, setVariant] = useState('');
//   const [sku, setSku] = useState('');
//   const [price, setPrice] = useState('');
//   const [salePrice, setSalePrice] = useState('');
//   const [stock, setStock] = useState('');
//   const [status, setStatus] = useState<'active'|'draft'>('active');
//   const [description, setDescription] = useState('');
//   const [technicalDescription, setTechnicalDescription] = useState('');
//   const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

//   // 2️⃣ File state
//   const [featuredFile, setFeaturedFile] = useState<File | null>(null);
//   const [gallerySlots, setGallerySlots] = useState<number[]>([1]);
//   const [galleryFilesMap, setGalleryFilesMap] = useState<Record<number, File>>({});

//   // 3️⃣ Submission state
//   const [submitting, setSubmitting] = useState(false);
//   const [errors?, setErrors?] = useState<Record<string, string | string[]>>({});
//   const [message, setMessage] = useState<string | undefined>(undefined);

//   // 4️⃣ Trigger submit
//   const handleSubmit = () => {
//     setSubmitting(true);
//     setErrors?({});
//     setMessage(undefined);
//   };

//   // 5️⃣ Side-effect to send to backend
//   useEffect(() => {
//     if (!submitting) return;
//     (async () => {
//       const form = new FormData();
//       // text fields
//       form.append('name', name);
//       form.append('brand', brand);
//       form.append('make', make);
//       form.append('carModel', carModel);
//       form.append('variant', variant);
//       form.append('sku', sku);
//       form.append('price', price);
//       form.append('salePrice', salePrice);
//       form.append('stock', stock);
//       form.append('status', status);
//       form.append('description', description);
//       form.append('technicalDescription', technicalDescription);
//       selectedCategories.forEach(cat => form.append('categories', cat));
//       // files
//       if (featuredFile) form.append('featuredImage', featuredFile);
//       gallerySlots.forEach(slot => {
//         const f = galleryFilesMap[slot];
//         if (f) form.append(`galleryImage${slot}`, f);
//       });

//       try {
//         const res = await fetch(
//           `http://localhost:4001/api/products`,
//           {
//             method: 'POST',
//             headers: {
//               Authorization: `Bearer ${localStorage.getItem('token')}`
//             },
//             body: form
//           }
//         );
//         const body = await res.json();
//         if (!res.ok) {
//           setErrors?(body.errors? || {});
//           setMessage(body.msg || 'Failed to add product');
//         } else {
//           toast.success('Product added!');
//           onClose();
//         }
//       } catch (err: any) {
//         setMessage(err.message || 'Network error');
//       } finally {
//         setSubmitting(false);
//       }
//     })();
//   }, [submitting]);

//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
//       <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-auto">
//         <header className="flex justify-between mb-4">
//           <h2 className="text-xl font-bold">Add New Product</h2>
//           <button onClick={onClose} className="text-2xl">&times;</button>
//         </header>

//         {/* Global message */}
//         {message && <p className="mb-2 text-red-600">{message}</p>}

//         {/* Form fields */}
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           <div>
//             <label>Name</label>
//             <input value={name} onChange={e => setName(e.target.value)} className="w-full" />
//             {errors?.name && <p className="text-red-600 text-xs">{errors?.name}</p>}
//           </div>
//           <div>
//             <label>Brand</label>
//             <input value={brand} onChange={e => setBrand(e.target.value)} className="w-full" />
//             {errors?.brand && <p className="text-red-600 text-xs">{errors?.brand}</p>}
//           </div>
//           <div>
//             <label>Make</label>
//             <input value={make} onChange={e => setMake(e.target.value)} className="w-full" />
//             {errors?.make && <p className="text-red-600 text-xs">{errors?.make}</p>}
//           </div>
//           <div>
//             <label>Model</label>
//             <input value={carModel} onChange={e => setCarModel(e.target.value)} className="w-full" />
//             {errors?.carModel && <p className="text-red-600 text-xs">{errors?.carModel}</p>}
//           </div>
//           <div>
//             <label>Variant</label>
//             <input value={variant} onChange={e => setVariant(e.target.value)} className="w-full" />
//           </div>
//           <div>
//             <label>SKU</label>
//             <input value={sku} onChange={e => setSku(e.target.value)} className="w-full" />
//             {errors?.sku && <p className="text-red-600 text-xs">{errors?.sku}</p>}
//           </div>
//           <div>
//             <label>Price</label>
//             <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full" />
//             {errors?.price && <p className="text-red-600 text-xs">{errors?.price}</p>}
//           </div>
//           <div>
//             <label>Sale Price</label>
//             <input type="number" value={salePrice} onChange={e => setSalePrice(e.target.value)} className="w-full" />
//           </div>
//           <div>
//             <label>Stock</label>
//             <input type="number" value={stock} onChange={e => setStock(e.target.value)} className="w-full" />
//             {errors?.stock && <p className="text-red-600 text-xs">{errors?.stock}</p>}
//           </div>
//           <div>
//             <label>Status</label>
//             <select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full">
//               <option value="active">Active</option>
//               <option value="draft">Draft</option>
//             </select>
//           </div>
//           <div className="md:col-span-2">
//             <label>Description</label>
//             <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full" />
//             {errors?.description && <p className="text-red-600 text-xs">{errors?.description}</p>}
//           </div>
//           <div className="md:col-span-2">
//             <label>Technical Description</label>
//             <textarea value={technicalDescription} onChange={e => setTechnicalDescription(e.target.value)} className="w-full" />
//             {errors?.technicalDescription && <p className="text-red-600 text-xs">{errors?.technicalDescription}</p>}
//           </div>
//           <div className="md:col-span-2">
//             <label>Categories</label>
//             <div className="flex flex-wrap gap-2">
//               {categories.map(c => (
//                 <label key={c._id} className="inline-flex items-center space-x-1">
//                   <input
//                     type="checkbox"
//                     checked={selectedCategories.includes(c._id)}
//                     onChange={e => {
//                       if (e.target.checked) setSelectedCategories(s => [...s, c._id]);
//                       else setSelectedCategories(s => s.filter(x => x !== c._id));
//                     }}
//                   />
//                   <span>{c.name}</span>
//                 </label>
//               ))}
//             </div>
//             {errors?.categories && <p className="text-red-600 text-xs">{(errors?.categories as string[]).join(', ')}</p>}
//           </div>

//           {/* Featured Image */}
//           <div>
//             <label>Featured Image</label>
//             <input
//               type="file"
//               accept="image/*"
//               onChange={e => setFeaturedFile(e.target.files?.[0] || null)}
//             />
//             {errors?.images && <p className="text-red-600 text-xs">{errors?.images}</p>}
//           </div>

//           {/* Gallery Images */}
//           <div className="md:col-span-2">
//             <label>Gallery Images</label>
//             <div className="flex flex-wrap gap-2">
//               {gallerySlots.map(slot => (
//                 <label
//                   key={slot}
//                   className="relative w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-[#FFA500] cursor-pointer"
//                 >
//                   <svg width="12" height="12" viewBox="0 -0.5 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
//                       <path d="M6.96967 16.4697C6.67678 16.7626 6.67678 17.2374 6.96967 17.5303C7.26256 17.8232 7.73744 17.8232 8.03033 17.5303L6.96967 16.4697ZM13.0303 12.5303C13.3232 12.2374 13.3232 11.7626 13.0303 11.4697C12.7374 11.1768 12.2626 11.1768 11.9697 11.4697L13.0303 12.5303ZM11.9697 11.4697C11.6768 11.7626 11.6768 12.2374 11.9697 12.5303C12.2626 12.8232 12.7374 12.8232 13.0303 12.5303L11.9697 11.4697ZM18.0303 7.53033C18.3232 7.23744 18.3232 6.76256 18.0303 6.46967C17.7374 6.17678 17.2626 6.17678 16.9697 6.46967L18.0303 7.53033ZM13.0303 11.4697C12.7374 11.1768 12.2626 11.1768 11.9697 11.4697C11.6768 11.7626 11.6768 12.2374 11.9697 12.5303L13.0303 11.4697ZM16.9697 17.5303C17.2626 17.8232 17.7374 17.8232 18.0303 17.5303C18.3232 17.2374 18.3232 16.7626 18.0303 16.4697L16.9697 17.5303ZM11.9697 12.5303C12.2626 12.8232 12.7374 12.8232 13.0303 12.5303C13.3232 12.2374 13.3232 11.7626 13.0303 11.4697L11.9697 12.5303ZM8.03033 6.46967C7.73744 6.17678 7.26256 6.17678 6.96967 6.46967C6.67678 6.76256 6.67678 7.23744 6.96967 7.53033L8.03033 6.46967ZM8.03033 17.5303L13.0303 12.5303L11.9697 11.4697L6.96967 16.4697L8.03033 17.5303ZM13.0303 12.5303L18.0303 7.53033L16.9697 6.46967L11.9697 11.4697L13.0303 12.5303ZM11.9697 12.5303L16.9697 17.5303L18.0303 16.4697L13.0303 11.4697L11.9697 12.5303ZM13.0303 11.4697L8.03033 6.46967L6.96967 7.53033L11.9697 12.5303L13.0303 11.4697Z" fill="#ffffff"></path>
//                     </svg>
//                   <input
//                     type="file"
//                     accept="image/*"
//                     className="absolute inset-0 opacity-0"
//                     onChange={e => {
//                       const f = e.target.files?.[0];
//                       if (f) {
//                         setGalleryFilesMap(m => ({ ...m, [slot]: f }));
//                         if (slot === gallerySlots.length && gallerySlots.length < 8) {
//                           setGallerySlots(s => [...s, s.length + 1]);
//                         }
//                       }
//                     }}
//                   />
//                 </label>
//               ))}
//             </div>
//             {errors?.galleryImages && <p className="text-red-600 text-xs">{(errors?.galleryImages as string[]).join(', ')}</p>}
//           </div>
//         </div>

//         {/* Actions */}
//         <div className="mt-4 flex justify-end gap-2">
//           <button
//             onClick={onClose}
//             className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
//           >
//             Cancel
//           </button>
//           <button
//             onClick={handleSubmit}
//             disabled={submitting}
//             className="px-4 py-2 bg-[#FFA500] text-white rounded hover:bg-[#e59400]"
//           >
//             {submitting ? 'Adding…' : 'Add Product'}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default AddProductModal;

'use client';
import { FC, useState, useEffect, ChangeEvent } from 'react';
import { toast } from 'sonner';
import { Category } from '@/types';

interface AddProductModalProps {
  isOpen: boolean;
  categories: Category[];
  onClose: () => void;
}

export interface CreateProductState {
  success: boolean;
  message?: string;
  errors?: Record<string, string | string[]>;
}

const AddProductModal: FC<AddProductModalProps> = ({ isOpen, categories, onClose }) => {
  // ─── Form fields ─────────────────────────────────
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  // … other text/number fields …

  const [status, setStatus] = useState<'active' | 'draft'>('active');
  const [description, setDescription] = useState('');
  const [technicalDescription, setTechnicalDescription] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // ─── File state ─────────────────────────────────
  const [featuredFile, setFeaturedFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);

  // ─── Submission state ────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<CreateProductState['errors']>({});
  const [message, setMessage] = useState<string | undefined>();

  // When user presses the “Add Product” button:
  const handleSubmit = () => {
    setSubmitting(true);
    setErrors({});
    setMessage(undefined);
  };

  // Build & send FormData when `submitting` flips to true
  useEffect(() => {
    if (!submitting) return;
    (async () => {
      const form = new FormData();

      // ── text/number fields ─────────────────────────
      form.append('name', name);
      form.append('brand', brand);
      // … append your other fields …
      form.append('status', status);
      form.append('description', description);
      form.append('technicalDescription', technicalDescription);
      selectedCategories.forEach((c) => form.append('categories', c));

      // ── files ───────────────────────────────────────
      if (featuredFile) form.append('featuredImage', featuredFile);
      galleryFiles.forEach((f) => form.append('galleryImages', f));

      try {
        const res = await fetch(`${process.env.BACKEND_API_URL}/api/products`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: form,
        });
        const body = await res.json();
        if (!res.ok) {
          setErrors(body.errors || {});
          setMessage(body.msg || 'Failed to add product');
          return;
        } else {
          toast.success('Product added!');
          onClose();
        }
      } catch (err: any) {
        setMessage(err.message || 'Network error');
      } finally {
        setSubmitting(false);
      }
    })();
  }, [submitting]);

  if (!isOpen) return null;

  // ─── gallery file selector ───────────────────────
  const addGalleryImages = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;                        // guard null
    const newImageFiles = Array.from(files);   // now `files` is a FileList
    setGalleryFiles(prev => [...prev, ...newImageFiles]);
  };

  console.log(galleryFiles)
  

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-auto">
        <header className="flex justify-between mb-4">
          <h2 className="text-xl font-bold">Add New Product</h2>
          <button onClick={onClose} className="text-2xl">&times;</button>
        </header>

        {/* Global message */}
        {message && <p className="mb-2 text-red-600">{message}</p>}

        {/* Form grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label>Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full" />
            {errors?.name && <p className="text-red-600 text-xs">{errors?.name}</p>}
          </div>
          <div>
            <label>Brand</label>
            <input value={brand} onChange={e => setBrand(e.target.value)} className="w-full" />
            {errors?.brand && <p className="text-red-600 text-xs">{errors?.brand}</p>}
          </div>
          {/* ... other inputs ... */}
          <div>
            <label>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full">
              <option value="active">Active</option>
              <option value="draft">Draft</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="md:col-span-2">
            <label>Technical Description</label>
            <textarea
              value={technicalDescription}
              onChange={e => setTechnicalDescription(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="md:col-span-2">
            <label>Categories</label>
            <div className="flex flex-wrap gap-2">
              {categories.map(c => (
                <label key={c._id} className="inline-flex items-center space-x-1">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(c._id)}
                    onChange={e => {
                      if (e.target.checked) setSelectedCategories(s => [...s, c._id]);
                      else setSelectedCategories(s => s.filter(x => x !== c._id));
                    }}
                  />
                  <span>{c.name}</span>
                </label>
              ))}
            </div>
            {errors?.categories && (
              <p className="text-red-600 text-xs">
                {(errors?.categories as string[]).join(', ')}
              </p>
            )}
          </div>

          {/* Featured Image */}
          <div>
            <label>Featured Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={e => setFeaturedFile(e.target.files?.[0] || null)}
            />
            {errors?.images && <p className="text-red-600 text-xs">{errors?.images}</p>}
          </div>

          {/* Gallery Images */}
          <div className="md:col-span-2">
            <label>Gallery Images</label>
            <div className="flex flex-wrap gap-2">
              {galleryFiles.map((f, idx) => (
                <div key={idx} className="relative w-20 h-20">
                  <img
                    src={URL.createObjectURL(f)}
                    className="object-cover w-full h-full rounded"
                    alt={`Gallery ${idx + 1}`}
                  />
                </div>
              ))}
              {galleryFiles.length < 8 && (
                <label className="relative flex items-center justify-center w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#FFA500] cursor-pointer">
                  {/* add svg here */}
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={addGalleryImages}
                  />
                </label>
              )}
            </div>
            {errors?.galleryImages && (
              <p className="text-red-600 text-xs">
                {(errors?.galleryImages as string[]).join(', ')}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 bg-[#FFA500] text-white rounded hover:bg-[#e59400]"
          >
            {submitting ? 'Adding…' : 'Add Product'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddProductModal;
