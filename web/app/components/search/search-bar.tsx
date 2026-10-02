// components/SearchOverlay.tsx
'use client'

import React, { useState, useRef, useEffect } from 'react'
import { FiSearch, FiX } from 'react-icons/fi'

/**
 * SearchOverlay
 *
 * - Renders a search icon button
 * - On click, slides down a 20vh overlay from the top
 * - Overlay contains a centered, styled search input
 * - Click outside the overlay or on the ❌ closes it
 */
const SearchOverlay: React.FC = () => {
  // open/closed state
  const [isOpen, setIsOpen] = useState(false)
  // wrap both icon + overlay so we can detect outside clicks
  const wrapperRef = useRef<HTMLDivElement>(null)

  // close when clicking outside wrapperRef
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={wrapperRef} className="relative ">
      {/* 🔍 Search icon trigger */}
      <button
        onClick={() => setIsOpen(v => !v)}
        aria-label="Toggle search"
        className="cursor-pointer relative focus:outline-none"
      >
        <FiSearch className="text-2xl" />
      </button>

      {/* 🔳 Sliding overlay */}
      <div
        className={`
          fixed top-0 left-0 w-full h-[23vh] bg-white shadow-lg
          transform transition-transform duration-300 ease-out flex items-center justify-center z-[999999]
          ${isOpen ? 'translate-y-0' : '-translate-y-full'}
        `}
      >
      

        {/* 🔎 Centered input */}
        <div className="flex w-[80%] justify-center items-center h-full px-4">
          <input
            type="text"
            placeholder="Search..."
            className="
              text-xl  w-full 
              pb-4 border-b border-gray-400 
              focus:outline-none focus:border-b-2  focus:border-[#ffa500] 
              placeholder-gray-400
            "
          />
        </div>
          {/* ❌ Close button */}
          <div className="flex justify-end  ml-[-55px] top-0 right-0 pb-3">
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close search"
            className="cursor-pointer focus:outline-none"
          >
            <FiX className="text-2xl text-gray-700 hover:text-[#ffa500]" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default SearchOverlay
