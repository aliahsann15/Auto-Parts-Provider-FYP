// ✅ FilterPopup.tsx - Reusable Filter Component
'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useState } from 'react'
import { X } from 'lucide-react'

// ✅ Define Props Interface
interface FilterPopupProps {
  isOpen: boolean
  onClose: () => void
  onApply: (filters: any) => void
  categories: string[]
  parts: string[]
  models: string[]
}

const FilterPopup: React.FC<FilterPopupProps> = ({ isOpen, onClose, onApply, categories, parts, models }) => {
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedPart, setSelectedPart] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 999999])
  const [shouldRender, setShouldRender] = useState(isOpen) // Track whether the component should remain mounted

  const handleReset = () => {
    setSelectedCategory('')
    setSelectedPart('')
    setSelectedModel('')
    setPriceRange([0, 999999])
  }

  const handleApply = () => {
    onApply({ category: selectedCategory, part: selectedPart, model: selectedModel, price: priceRange })
  }
// ✨ Add this state for animation
const [animateClass, setAnimateClass] = useState('opacity-0 scale-95 translate-y-[-700px]')

// ✅ useEffect to trigger entrance animation
useEffect(() => {
    if (isOpen) {
      setShouldRender(true) // Ensure the component is mounted
      setTimeout(() => {
        setAnimateClass('opacity-100 translate-y-0') // Trigger opening animation
      }, 50)
    } else {
      setAnimateClass('opacity-0 translate-y-[700px]') // Trigger closing animation
      setTimeout(() => {
        setShouldRender(false) // Unmount the component after the animation
      }, 300) // Match the duration of the animation
    }
  }, [isOpen])

 if (!shouldRender) return null 

  return (
    // ✅ Modal Overlay
<div className="fixed inset-0 z-5000 bg-[#00000095] flex justify-center items-center">
  <div
    className={`bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative transform transition-all duration-500 ease-in-out ${animateClass}`}
  >
        {/* ✅ Header */}
        <div className="flex justify-between items-center mb-7">
          <button onClick={handleReset} className="text-sm font-semibold underline text-[#ffa500]">Reset</button>
          <h3 className="text-lg font-bold text-center flex-grow -ml-8">Search Filter</h3>
          <button onClick={onClose} className="text-black hover:text-[#ffa500]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ✅ Category Filter */}
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Tool category</label>
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-[2px]"
          >
            <option value="">Select</option>
            {categories.map((cat, i) => <option key={i} value={cat}>{cat}</option>)}
          </select>
        </div>

        {/* ✅ Make Filter */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Make (Company)</label>
          <select
            value={selectedPart}
            onChange={(e) => setSelectedPart(e.target.value)}
            className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-[2px]"
          >
            <option value="">Select make</option>
            {parts.map((p, i) => <option key={i} value={p}>{p}</option>)}
          </select>
        </div>

        {/* ✅ Model Filter */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Model</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-[2px]"
          >
            <option value="">Select model</option>
            {models.map((m, i) => <option key={i} value={m}>{m}</option>)}
          </select>
        </div>

        {/* ✅ Price Filter */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Price (PKR)</label>
          <div className="flex justify-between text-sm text-gray-600 mb-3">
            <span className="block text-sm font-medium text-gray-600">PKR {priceRange[0].toLocaleString()}</span>
            <span className="block text-sm font-medium text-gray-600">PKR {priceRange[1].toLocaleString()}</span>
          </div>
          <div className="flex gap-3 mb-3">
            <input
              type="number"
              min="0"
              max={priceRange[1]}
              value={priceRange[0]}
              onChange={(e) => setPriceRange([+e.target.value, priceRange[1]])}
              className="w-1/2 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#FFA500]"
              placeholder="Min price"
            />
            <input
              type="number"
              min={priceRange[0]}
              max="999999"
              value={priceRange[1]}
              onChange={(e) => setPriceRange([priceRange[0], +e.target.value])}
              className="w-1/2 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#FFA500]"
              placeholder="Max price"
            />
          </div>
          <input
            type="range"
            min="0"
            max="999999"
            value={priceRange[0]}
            onChange={(e) => setPriceRange([+e.target.value, priceRange[1]])}
            className="w-full accent-[#ffa500]"
          />
        </div>

        {/* ✅ Apply Button */}
        <button
          onClick={handleApply}
          className="w-full bg-[#ffa500] text-white text-sm font-semibold py-2 rounded hover:bg-orange-500"
        >
          Apply Filter
        </button>
      </div>
    </div>
  )
}

export default FilterPopup
