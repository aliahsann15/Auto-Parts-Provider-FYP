import { useState } from 'react'
import { FiChevronDown } from 'react-icons/fi'

const sortOptions = [
  'Best Match',
  'Price: lowest first',
  'Price: highest first',
  'Newly listed',
]

interface SortDropdownProps {
  sortBy?: string
  setSortBy?: (value: string) => void
}

const SortDropdown = ({ sortBy = 'Best Match', setSortBy }: SortDropdownProps) => {
  const [selected, setSelected] = useState(sortBy)
  const [open, setOpen] = useState(false)

  return (
    <div className="relative inline-block text-left mr-6">
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between gap-2 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:border-[#FFA500] transition-all"
      >
        Sort: {selected}
        <FiChevronDown />
      </button>

      {/* Dropdown Menu */}
      {open && (
        <ul className="absolute z-[1000000] mt-2 w-64 bg-white border border-gray-200 rounded-md shadow-lg max-h-96 overflow-y-auto">
          {sortOptions.map((option) => (
            <li
              key={option}
              onClick={() => {
                setSelected(option)
                setSortBy?.(option)
                setOpen(false)
              }}
              className={`px-4 py-2 text-sm text-gray-800 hover:bg-[#ffa500] hover:text-white cursor-pointer ${
                selected === option ? 'font-semibold bg-[#ffa500] text-white hover:text-white' : ''
              }`}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default SortDropdown
