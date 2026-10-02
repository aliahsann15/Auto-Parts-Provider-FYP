'use client'

import React, { useEffect, useRef, useState } from 'react'
import Image from '@/app/components/AppImage'
import { FiSearch, FiX } from 'react-icons/fi'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'

type ProductOption = {
  id: string
  name: string
  image?: string
  price?: string | number
}

type Props = {
  products: ProductOption[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  max?: number
  title?: string
}

const SellerSalesProductSelector = ({
  products,
  selectedIds,
  onChange,
  max = 12,
  title = 'Select Sales Products (Max 12)'
}: Props) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  const selectedProducts = selectedIds
    .map(id => products.find(p => p.id === id))
    .filter(Boolean) as ProductOption[]

  const handleSelect = (product: ProductOption) => {
    if (!selectedIds.includes(product.id) && selectedIds.length < max) {
      onChange([...selectedIds, product.id])
      setSearchQuery('')
      setIsDropdownOpen(false)
    }
  }

  const handleRemove = (id: string) => {
    onChange(selectedIds.filter(p => p !== id))
  }

  const handleDragEnd = (result: any) => {
    if (!result.destination) return
    const items = Array.from(selectedIds)
    const [moved] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, moved)
    onChange(items)
  }

  const filteredProducts = searchQuery
    ? products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !selectedIds.includes(p.id)
      )
    : []

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="w-full mt-12 bg-white p-6 rounded-xl shadow-md">
      <div className="w-[100%] flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
        <h2 className="w-[50% ] text-xl font-semibold text-gray-800">
          {title}
        </h2>
        <div className="relative w-[50%] " ref={dropdownRef}>
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setIsDropdownOpen(true)
            }}
            className="w-full border border-gray-300 rounded-lg py-2 px-4 pl-10 focus:outline-none focus:ring-2 focus:ring-[#ffa500]"
          />
          <FiSearch className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" size={18} />

          {isDropdownOpen && filteredProducts.length > 0 && (
            <div className="absolute z-10 bg-white w-full mt-2 border border-gray-200 rounded shadow max-h-60 overflow-y-auto">
              {filteredProducts.map(product => (
                <div
                  key={product.id}
                  onClick={() => handleSelect(product)}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 cursor-pointer"
                >
                  <Image src={product.image || '/images/tool1.png'} alt={product.name} width={40} height={40} className="rounded object-cover" />
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-800">{product.name}</span>
                    {product.price && <span className="text-xs text-gray-500">{product.price}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-2">Drag and drop to change the sequence of sales products.</p>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="selected-products" direction="horizontal">
          {(provided) => (
            <div
              className="flex flex-wrap gap-3 min-h-[150px] px-2 py-2 rounded border border-dashed border-[#ffa500] bg-orange-50"
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {selectedProducts.map((product, index) => (
                <Draggable key={product.id} draggableId={product.id} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className="flex items-center gap-2 px-3 py-1 bg-white border border-[#ffa500] rounded-lg shadow-sm cursor-move"
                    >
                      <span className="text-sm text-gray-700 whitespace-nowrap">{product.name}</span>
                      <button onClick={() => handleRemove(product.id)} className="text-[#ffa500]">
                        <FiX size={16} />
                      </button>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              {selectedProducts.length === 0 && (
                <span className="text-sm text-gray-500 px-2">No sale products selected yet.</span>
              )}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  )
}

export default SellerSalesProductSelector
