'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useMemo, ChangeEvent, useEffect, useTransition } from 'react'
import Link from 'next/link'
import Image from '@/app/components/AppImage'
import { FiSearch, FiEdit, FiTrash2 } from 'react-icons/fi'
import EditProductModal from './edit-product-form';
import AddProductModal from './add-product-form';
import { Product, Category } from '@/types'
import SellerDashboardAside from './seller-dasboard-aside'
import { deleteProduct } from '@/actions/product'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "../ui/alert-dialog";

interface Props {
  products: Product[]
  categories: Category[],
  pagination: {total: number, totalPages: number, page: number, limit: number}
}

export default function SellerProductClient({ products: initialProducts, categories, pagination }: Props) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [searchQuery, setSearchQuery] = useState('')
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPending, startDelete] = useTransition();


  // Build lookup for category names
  const categoriesMap = useMemo(() => {
    const m: Record<string,string> = {}
    categories.forEach(cat => { 
      const key = (cat as any)._id 
      m[key] = cat.name
    })
    return m
  }, [categories])

  // Filter products by search
  const filtered = useMemo(
    () => products?.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [products, searchQuery]
  )

  // Handlers
  const handleSearch = (e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)
  const openEdit = (prod: Product) => { setEditingProduct(prod); setIsEditOpen(true) }
  const closeEdit = () => { setIsEditOpen(false); setEditingProduct(null) }
  const saveEdit = (updated: Product) => {
    setProducts(prev => prev.map(p => p._id === updated._id ? updated : p))
    closeEdit()
  }
  const openAdd = () => setIsAddOpen(true)
  const closeAdd = () => setIsAddOpen(false)

  useEffect(() => {
    setProducts(initialProducts)
  }, [initialProducts]);

  const handleDelete = (id: string) => {

    startDelete(() => {
      deleteProduct(id)
        .then(() => setProducts(prev => prev.filter(p => p._id !== id)))
        .catch(err => alert(err.message))
    })
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <SellerDashboardAside />
      <div className="flex-1 p-6">
        <header className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold text-black">Manage Products</h1>
          <div className="flex gap-4 w-full md:w-auto">
            <div className="relative flex-grow md:flex-none">
              <FiSearch className="absolute top-1/2 left-3 transform -translate-y-1/2 text-[#FFA500] text-xl" />
              <input
                type="text"
                placeholder="Search products"
                value={searchQuery}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-[#FFA500] focus:outline-none"
              />
            </div>
            <button
              onClick={openAdd}
              className="bg-[#FFA500] text-white px-6 py-2 rounded-lg font-semibold hover:bg-orange-600 transition"
            >+ Add Product</button>
          </div>
        </header>

        <div className="bg-white rounded-lg shadow-md overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-[#FFA500]">
              <tr>
                {['Image','Name','SKU','Status','Orig. Price','Sale Price','Stock','Categories','Actions']
                  .map(h => <th key={h} className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">{h}</th>)}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered?.length > 0 ? filtered.map(p => (
                <tr key={p._id} className="hover:bg-gray-50">
                  <td className="py-4 px-6 flex justify-center">
                    <Image
                      src={p.images?.[0] || '/images/placeholder-product.png'}
                      alt={p.name}
                      width={48}
                      height={48}
                      className="object-cover rounded"
                    />
                 </td>
                  <td className="py-4 px-6 text-center text-black text-xs">{p.name}</td>
                  <td className="py-4 px-6 text-center text-black text-xs">{p.sku}</td>
                  <td className="py-4 px-6 text-center">
                    <span className={`capitalize px-2 inline-flex text-xs font-semibold rounded-full ${p.status==='draft'? 'bg-yellow-100 text-yellow-800':'bg-green-100 text-green-800'}`}>{p.status}</span>
                  </td>
                  <td className="py-4 px-6 text-center text-black text-xs">Rs.{p.price}</td>
                  <td className="py-4 px-6 text-center text-black text-xs">{p.salePrice? `Rs.${p.salePrice}`:'—'}</td>
                  <td className="py-4 px-6 text-center text-black text-xs">{p.stock}</td>
                  <td className="py-4 px-6 text-center text-black text-xs">
                  {p.categories?.length ? p.categories.map(id => categoriesMap[id] ?? '—').join(', ') : '—'}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <button onClick={()=>openEdit(p)} className="cursor-pointer mx-1 text-[#FFA500] hover:underline"><FiEdit/></button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="cursor-pointer mx-1 text-red-500 hover:underline" disabled={isPending}>
                          <FiTrash2 />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction className='cursor-pointer' onClick={()=>handleDelete(p._id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={9} className="p-4 text-center">No products found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {pagination?.page > 1 && <div className="flex items-center justify-center space-x-4 mt-6">
          {pagination?.page > 1 && (
            <Link
              href={`?page=${pagination?.page - 1}&limit=${pagination?.limit}`}
              className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
            >
              Previous
            </Link>
          )}
          <span>
            Page {pagination?.page} of {pagination?.totalPages}
          </span>
          {pagination?.page < pagination?.totalPages && (
            <Link
              href={`?page=${pagination?.page + 1}&limit=${pagination?.limit}`}
              className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
            >
              Next
            </Link>
          )}
        </div>}

        <EditProductModal
          isOpen={isEditOpen}
          product={editingProduct}
          categories={categories}
          onClose={closeEdit}
          onSave={saveEdit}
        />

        <AddProductModal
          isOpen={isAddOpen}
          categories={categories}
          onClose={closeAdd}
          // token={token}
        />
      </div>
    </div>
  )
}
