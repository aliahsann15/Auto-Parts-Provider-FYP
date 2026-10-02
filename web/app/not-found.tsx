import React from 'react';
import Link from 'next/link';

// Custom 404 Page Component
// Save this file under `pages/404.tsx` (Pages Router)
// or as `app/not-found.tsx` (App Router) to have Next.js pick it up automatically.

const Custom404: React.FC = () => {
  return (
    <div className="py-50 flex flex-col items-center justify-center bg-white px-4">
      {/* Oops! title with galaxy fill effect (replace with SVG or gradient if desired) */}
      <h1 className="text-9xl font-black text-[#ffa500] mb-5">
        Oops!
      </h1>

      {/* 404 message */}
      <h2 className="mt-4 text-2xl font-semibold text-gray-800">404 - PAGE NOT FOUND</h2>

      {/* Description text */}
      <p className="mt-2 text-center text-gray-600 leading-[25px]">
        The page you are looking for might have been removed,
        <br /> had its name changed, or is temporarily unavailable.
      </p>

      {/* Go to Homepage button */}
    
        <Link href="/" className="mt-6 inline-block bg-[#ffa500] text-white font-medium px-6 py-3 rounded-lg shadow">
          GO TO HOMEPAGE
        </Link>
    
    </div>
  );
};

export default Custom404;
