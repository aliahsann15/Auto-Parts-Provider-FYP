'use client';

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import ProductsWithoutCarouselTab from "./products-carousel-without-tab";
import { Product } from "@/app/home-client";

type Props = {
  categoryIds: { id: string; name: string }[] | null;
  productToExclude: string;
};

export default function SimilarProducts({
  categoryIds,
  productToExclude,
}: Props) {
  // our fetched list of similar products
  const [products, setProducts] = useState<Product[]>([]);
  // still used for the image‐swap on hover in the child carousel
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSimilar() {
      if (!categoryIds || categoryIds.length === 0) {
        setProducts([]);
        return;
      }

      // build the query string
      const params = new URLSearchParams();
      categoryIds.forEach(({ id }) => params.append("categoryIds", id));
      // **always** exclude the current product
      params.append("excludeId", productToExclude);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:4001'}/api/public/products/related?${params.toString()}`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        notFound();
        return;
      }

      const { products: similar } = (await res.json()) as {
        products: Product[];
      };
      setProducts(similar);
    }

    // refetch only when categories OR the productToExclude change
    fetchSimilar();
  }, [categoryIds, productToExclude]);

  return (
    <ProductsWithoutCarouselTab
      products={products}
      hoveredId={hoveredId}
      setHoveredId={setHoveredId}
    />
  );
}
