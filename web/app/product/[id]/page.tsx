
import ProductDetails from "../../components/product/product-detail"
import { notFound } from "next/navigation";
import { Product } from "@/app/home-client";

type PageProps = {
  params: { id: string }
}

export default async function ProductPage({ params }: PageProps) {
  const { id } = await params;

  const res = await fetch(
    `${process.env.BACKEND_API_URL}/api/public/products/${id}`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    return notFound();
  }

  const { product } = (await res.json()) as {
    product: Product;
  };


  return (
      <ProductDetails product={product} itemsSold={product.itemsSold} reviews={product.reviews} />      
  )
}
