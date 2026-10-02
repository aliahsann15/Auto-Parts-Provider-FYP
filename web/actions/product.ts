'use server';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { Product as RawProduct } from '@/app/home-client';
import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
interface UpdateProductState {
  success: boolean
  message?: string
  errors?: { [key: string]: string | string[] }
}

const API_BASE = process.env.BACKEND_API_URL

export async function createProduct(
  _prevState: any,
  formData: FormData
) {
  const session = await getServerSession(authOptions);
  const token = session?.backendToken || session?.accessToken;

  if (!session || !token) {
    return {
      success: false,
      message: 'Not logged in',
      errors: {},
    };
  }

  // forward the raw FormData (with files) to your Express server
  const forward = new FormData();
  for (const [k, v] of formData.entries()) forward.append(k, v);

  console.log('Creating product with data:', Array.from(forward.entries()).map(([k, v]) => [k, v instanceof File ? v.name : v]));
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    console.log('Sending request to backend...');
    const res = await fetch(
      `${process.env.BACKEND_API_URL}/api/products`,
      {
        method: 'POST',
        headers: {
          // Do not set Content-Type header when sending FormData
          "Authorization": `Bearer ${token}`,
        },
        body: forward,
        signal: controller.signal,
      }
    );
    console.log('Request sent to backend, awaiting response...');

    clearTimeout(timeoutId);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('Product creation failed:', { status: res.status, error: err });
      return {
        success: false,
        message: err.msg || 'Upload failed',
        errors: err.errors || {},
      };
    }

    const responseData = await res.json();
    console.log('Product created successfully:', responseData);
    
    // Revalidate the product list
    revalidatePath('/seller/products');
    revalidatePath('/seller/dashboard');
    
    return {
      success: true,
      message: 'Product added!',
      errors: {},
    };
  } catch (error: any) {
    console.error('Product creation error:', error);
    
    if (error.name === 'AbortError') {
      return {
        success: false,
        message: 'Request timed out. Please try again.',
        errors: {},
      };
    }

    return {
      success: false,
      message: error.message || 'An error occurred while uploading the product.',
      errors: {},
    };
  }
}

export async function deleteProduct(id: string) {
  const session = await getServerSession(authOptions);
  const token = session?.backendToken || session?.accessToken;
  // 1. Ensure user is signed in
  if (!session || !token) {
    throw new Error('You must be logged in to delete a product.');
  }

  // 2. Call your Express API
  const res = await fetch(
    `${process.env.BACKEND_API_URL}/api/products/${id}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      cache: 'no-store',
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.msg || `Failed to delete product ${id}`);
  }

  // 3. Re-render the seller products page
  revalidatePath('/seller/products');

  return true;
}

export async function updateProduct(
  _prevState: any,
  formData: FormData
): Promise<UpdateProductState> {
  try {

    const session = await getServerSession(authOptions);
    const token = session?.backendToken || session?.accessToken;
    if (!session || !token) {
      console.error('Server Action (Update): Unauthorized - No session or token');
      return { success: false, message: 'Not logged in', errors: {} };
    }

    const name = formData.get('name')?.toString().trim();
    const price = formData.get('price'); // Price can be 0, check for null/undefined or invalid number
    const sku = formData.get('sku')?.toString().trim();
    const carModel = formData.get('carModel')?.toString().trim();
    const make = formData.get('make')?.toString().trim();
    // formData.getAll('categories') always returns an array, even if empty
    const categories = formData.getAll('categories') as string[];

    const errors: Record<string, string> = {}; // Use Record<string, string> for simple string errors
    if (!name) errors.name = 'Name is required.';
    // Validate price as a number > 0 if required
    const parsedPrice = parseFloat(price?.toString() || '');
    if (isNaN(parsedPrice) || parsedPrice <= 0) errors.price = 'Valid price is required.';

    if (!sku) errors.sku = 'SKU is required.';
    if (!carModel) errors.carModel = 'Model is required.';
    if (!make) errors.make = 'Maker is required.';
    if (!categories || categories.length === 0) {
      errors.categories = 'At least one category is required.';
    }


    if (Object.keys(errors).length > 0) {
      console.error('Server Action (Update): Basic Validation Failed:', errors);
      return {
        success: false,
        message: 'Validation failed.',
        errors,
      };
    }



    const id = formData.get('id')?.toString();
    const backendApiUrl = process.env.BACKEND_API_URL;
    if (!id || !backendApiUrl) {
      return {
        success: false,
        message: 'Configuration error.',
        errors: {}
      };
    }

    const res = await fetch(
      `${backendApiUrl}/api/products/${id}`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return {
        success: false,
        message: err.msg || 'Upload failed',
        errors: err.errors || {}
      };
    }

    return { success: true, message: 'Product updated!', errors: {} };

  } catch (err: any) {
    console.error('updateProduct threw:', err);
    return {
      success: false,
      message: 'Server error',
      errors: {}
    };
  }
}

export async function createReview(
  _prevState: any,
  formData: FormData
): Promise<{ success: boolean; message: string; errors: any }> {
  // grab session + token
  const session = await getServerSession(authOptions);
    const token = session?.backendToken || session?.accessToken;
    if (!session || !token) {
      console.error('Server Action (Update): Unauthorized - No session or token');
      return { success: false, message: 'Not logged in', errors: {} };
    }

  // pull out fields
  const product = formData.get("product")?.toString() || "";
  const rating  = Number(formData.get("rating") || 0);
  const comment = formData.get("comment")?.toString() || "";

  // POST as JSON
  const res = await fetch(
    `${process.env.BACKEND_API_URL}/api/reviews`,
    {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ product, rating, comment }),
    }
  );

  if (!res.ok) {
    // Log status and full JSON body to console for debugging
    console.error("createReview failed:", res.status, res.statusText);
    let errBody: any = {};
    try {
      errBody = await res.json();
    } catch {
      console.error("Failed to parse error JSON");
    }
    console.error("Error body:", errBody);
    revalidatePath(`/product/${product}`);
    return {
      success: false,
      // prefer `message` field if your API sends it, else show status
      message: errBody.message || `HTTP ${res.status} ${res.statusText}`,
      errors: errBody.errors || errBody,
    };
  }

  return {
    success: true,
    message: "Review added!",
    errors: {},
  };
}

export async function getProductsWithCategories() {

  const prodRes = await fetch(`${API_BASE}/api/public/products`);
  const { products: rawProducts }: { products: RawProduct[] } = await prodRes.json();

  // 2️⃣ Derive unique category IDs
  const allCategoryIds = Array.from(
    new Set(rawProducts.flatMap((p) => p.categories as string[]))
  );
  const idsParam = allCategoryIds.join(",");

  // 3️⃣ Fetch only those category docs
  const catRes = await fetch(`${API_BASE}/api/categories/by-ids?ids=${idsParam}`);
  const { categories: catDocs }: { categories: { _id: string; name: string }[] } =
    await catRes.json();

  // 4️⃣ Build an ID→name map
  const idToName = new Map<string, string>();
  catDocs.forEach((c) => idToName.set(c._id, c.name));
  const productsData = rawProducts.map((p) => ({
    ...p,
    categories: (p.categories as string[]).map((id) => idToName.get(id) || id),
  }))
  const tabs = ["All", ...catDocs.map((c) => c.name)];

  // 5️⃣ Rewrite each product’s categories to names
  return {products: productsData, tabs}
}

