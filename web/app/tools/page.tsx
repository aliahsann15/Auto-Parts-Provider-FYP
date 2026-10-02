import { Product as RawProduct } from "@/app/home-client"; // your raw Product type
import ToolsClient from "../components/shop/tools-client";

export default async function ToolsPage() {
  const API_BASE = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "http://localhost:4001";

  // 1️⃣ Fetch products
  const prodRes = await fetch(`${API_BASE}/api/public/products`);
  const { products: rawProducts }: { products: RawProduct[] } = await prodRes.json();

  // 3️⃣ Fetch only those category docs
  // const catRes = await fetch(`${API_BASE}/api/categories/by-ids?ids=${idsParam}`);
  const catRes = await fetch(`${API_BASE}/api/categories/`);
  const catJson = await catRes.json();
  // normalize categories response (API may return array or { categories: [...] })
  const categories: { _id: string; name: string }[] =
    Array.isArray(catJson) ? catJson : catJson?.categories || [];

  // 6️⃣ Build your tabs list
  const catNames = categories.map((c: { _id: string; name: string }) => c.name);
  const tabs = ["All", ...catNames];

  return <ToolsClient products={rawProducts} categories={categories} tabs={tabs} />;
}
