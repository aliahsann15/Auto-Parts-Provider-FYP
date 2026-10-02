"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import SortDropdown from "./sort-dropdown";
import FilterPopup from "./product-filter";
import ProductCard from "../product/product-card";
import { Product } from "@/app/home-client";

type Category = { _id: string; name: string };

interface Props {
  products: Product[];
  categories: Category[]; // now category objects with id + name
  tabs: string[]; // still useful for rendering name tabs if needed
  selectedCategory: string; // "All" or category _id
  setSelectedCategory: (c: string) => void;
  isFilterOpen: boolean;
  setIsFilterOpen: React.Dispatch<React.SetStateAction<boolean>>;
  parts: string[];
  models: string[];
}

const ProductsWithTab: React.FC<Props> = ({
  products,
  categories,
  selectedCategory,
  setSelectedCategory,
  isFilterOpen,
  setIsFilterOpen,
  parts,
  models,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [filters, setFilters] = useState({ category: '', part: '', model: '', price: [0, 999999] });
  const [sortBy, setSortBy] = useState('Best Match');

  useEffect(() => {
    document.body.style.overflow = isFilterOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isFilterOpen]);

  const handleApplyFilter = (appliedFilters: any) => {
    setFilters(appliedFilters);
    setIsFilterOpen(false);
  };

  const filteredProducts = useMemo(() => {
    let results = products || [];

    // Filter by selected category tab (using _id)
    if (selectedCategory && selectedCategory !== 'All') {
      results = results.filter((p: Product) => {
        const prodCat = p?.categories;
        if (!prodCat) return false;
        if (Array.isArray(prodCat))
          return prodCat.includes(String(categories.find((cat) => cat._id === selectedCategory)?._id));
        return String(prodCat) === String(categories.find((cat) => cat._id === selectedCategory)?._id);
      });
    }

    // Filter by modal category selection (if any)
    if (filters.category) {
      const categoryId = categories.find((c) => c.name === filters.category)?._id;
      if (categoryId) {
        results = results.filter((p: Product) => {
          const prodCat = p?.categories;
          if (!prodCat) return false;
          if (Array.isArray(prodCat)) return prodCat.includes(String(categoryId));
          return String(prodCat) === String(categoryId);
        });
      }
    }

    // Apply price filter
    if (filters.price && filters.price.length === 2) {
      results = results.filter((p: Product) => {
        const price = p.price || 0;
        return price >= filters.price[0] && price <= filters.price[1];
      });
    }

    // Apply make (company) filter if selected
    if (filters.part) {
      results = results.filter((p: Product) => {
        return (p.make || '').toLowerCase() === filters.part.toLowerCase();
      });
    }

    // Apply model filter if selected
    if (filters.model) {
      results = results.filter((p: Product) => {
        return (p.carModel || '').toLowerCase() === filters.model.toLowerCase();
      });
    }

    // Apply sorting
    const sorted = [...results];
    switch (sortBy) {
      case 'Price: lowest first':
        sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'Price: highest first':
        sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      // case 'Newly listed':
      //   sorted.sort((a, b) => {
      //     const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      //     const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      //     return bDate - aDate;
      //   });
        break;
      case 'Best Match':
      default:
        // Keep original order for best match
        break;
    }

    return sorted;
  }, [products, selectedCategory, categories, filters, sortBy]);

  return (
    <section className="p-6 mt-25">
      <div className="flex justify-between flex-wrap gap-3 mb-17.5">
        <button
          type="button"
          onClick={() => setIsFilterOpen(true)}
          className="flex justify-center gap-1 align-middle bg-[#ffa500] text-white px-4 py-1.5 rounded-md shadow hover:bg-orange-600"
        >
          Filter
        </button>

        <FilterPopup
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          onApply={handleApplyFilter}
          categories={categories.map((c) => c.name)}
          parts={parts}
          models={models}
        />

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setSelectedCategory("All")}
            className={`px-4 py-2 rounded-full font-semibold text-sm cursor-pointer ${selectedCategory === "All" ? "bg-[#FFA500] text-white" : "bg-gray-200 text-gray-800"
              }`}
          >
            All
          </button>

          {(categories || []).map((cat) => (
            <button
              key={cat._id}
              type="button"
              onClick={() => setSelectedCategory(cat._id)}
              className={`px-4 py-2 rounded-full font-semibold text-sm cursor-pointer ${selectedCategory === cat._id ? "bg-[#FFA500] text-white" : "bg-gray-200 text-gray-800"
                }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <SortDropdown sortBy={sortBy} setSortBy={setSortBy} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 ">
        {filteredProducts.map((p) => (
          <ProductCard key={p._id} p={p} hoveredId={hoveredId} setHoveredId={setHoveredId} />
        ))}
      </div>
    </section>
  );
};

export default ProductsWithTab;
