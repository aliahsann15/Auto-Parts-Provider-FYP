import { getProductsWithCategories } from "@/actions/product";
import Home from "./home-client";

export default async function Page() {

 const {products, tabs} = await getProductsWithCategories();
  
  // 4. Destructure the response
  // const { products } = prodRes as {
  //   products: Product[];
  //   pagination: { total: number; totalPages: number; page: number; limit: number };
  // };


  return <Home products={products} tabs={tabs} />;
}


