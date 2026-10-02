"use client";

import { useState, useMemo } from "react";
import ProductsWithTab from "@/app/components/shop/products-with-tab";
import { Product } from "@/app/home-client";

export default function ToolsClient({
  products,
  categories,
  tabs,
}: {
  products: Product[];
  categories: { _id: string; name: string }[];
  tabs: string[];
}) {
  // selectedCategory holds either "All" or a category _id
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Extract unique makes (company names) from products
  const makes = useMemo(() => {
    const uniqueMakes = new Set<string>();
    products?.forEach((p) => {
      if (p.make) uniqueMakes.add(p.make);
    });
    return Array.from(uniqueMakes).sort();
  }, [products]);
  console.log("Products: ", products);
  // Extract unique models from products
  const models = useMemo(() => {
    const uniqueModels = new Set<string>();
    products?.forEach((p) => {
      if (p.carModel) uniqueModels.add(p.carModel);
    });
    return Array.from(uniqueModels).sort();
  }, [products]);

  return (
    <ProductsWithTab
      products={products || []}
      categories={categories || []}
      tabs={tabs || ["All"]}
      selectedCategory={selectedCategory}
      setSelectedCategory={setSelectedCategory}
      isFilterOpen={isFilterOpen}
      setIsFilterOpen={setIsFilterOpen}
      parts={makes}
      models={models}
    />
  );
}

// "use client";

// import React, { useState } from "react";
// import ProductsWithTab from "../shop/products-with-tab";
// import FilterPopup from "../shop/product-filter";
// import { Product as RawProduct } from "@/app/home-client";
// import PromoBanner from "./promo-banner";

// // Props from the server component
// interface Props {
//   products: RawProduct[];
//   tabs: string[];       // ["All", "Safety", "Wheels", …]
// }

// const parts = ["Headlight", "Speaker", "Battery"];
// const models = ["Etron GT", "Civic", "Corolla"];

// export default function ToolsClient({ products, tabs }: Props) {
//   const [selectedCategory, setSelectedCategory] = useState<string>("All");
//   const [isFilterOpen, setIsFilterOpen] = useState(false);

//   // Filter in-memory by whether the product’s category‐IDs include the selected tab name
//   // (You may need a mapping of name→ID if they don’t match exactly; adjust as needed)
//   const filtered =
//     selectedCategory === "All"
//       ? products
//       : products.filter((p) =>
//           // assume `p.categories` was already converted to names server side,
//           // otherwise you’d need to map IDs→names here
//           (p.categories as string[]).includes(selectedCategory)
//         );

//   return (
//     <section className={`${isFilterOpen ? "overflow-hidden" : ""} px-[75px]`}>
//       {/* Banner omitted for brevity… */}

//       <div className="relative bg-white">
//         <FilterPopup
//           isOpen={isFilterOpen}
//           onClose={() => setIsFilterOpen(false)}
//           onApply={() => setIsFilterOpen(false)}
//           categories={tabs}
//           parts={parts}
//           models={models}
//         />

//         <ProductsWithTab
//           categories={tabs}
//           products={products}
//           filtered={filtered}
//           selectedCategory={selectedCategory}
//           setSelectedCategory={setSelectedCategory}
//           isFilterOpen={isFilterOpen}
//           setIsFilterOpen={setIsFilterOpen}
//           parts={parts}
//           models={models}
//         />
//       </div>

//     <PromoBanner />
//     </section>
//   );
// }
