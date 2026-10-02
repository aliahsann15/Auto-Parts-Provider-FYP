// middleware.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { withAuth } from "next-auth/middleware"
import type { NextRequest } from "next/server"

export default withAuth({
  // This runs on every request matched below
  callbacks: {
    authorized({ token, req }: { token: any; req: NextRequest }) {
      if (req.nextUrl.pathname === "/seller/register") {
        return true;
      }
      // If no session → block
      if (!token?.user) return false

      // Only allow if path is /seller/* AND user.role is "Seller" or "StoreManager"
      if (req.nextUrl.pathname.startsWith("/seller")) {
        const role = token.user.role?.toLowerCase();
        return role === "seller" || role === "storemanager"
      }

      // All other paths: allow through
      return true
    },
  },
})

// Apply this middleware only to /seller routes
export const config = {
  matcher: ["/seller/:path*"],
}
