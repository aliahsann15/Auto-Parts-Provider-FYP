import type { NextConfig } from "next";

const backendApiUrl =
  process.env.NEXT_PUBLIC_BACKEND_API_URL ||
  process.env.BACKEND_API_URL ||
  "http://localhost:4001";
const backendOrigin = backendApiUrl.replace(/\/api\/?$/, "").replace(/\/$/, "");

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    // Proxy backend uploads through the Next.js app so components can use `/uploads/...`
    // and you only change the backend host once in `NEXT_PUBLIC_BACKEND_API_URL`.
    return [
      {
        source: "/uploads/:path*",
        destination: `${backendOrigin}/uploads/:path*`,
      },
    ];
  },
  images: {
    domains: [
      "lh3.googleusercontent.com",
      "localhost",
      "127.0.0.1"
    ]
  }
};

export default nextConfig;
