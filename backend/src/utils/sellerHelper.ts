import { AuthRequest } from '../middleware/authMiddleware';

/**
 * Get the effective seller ID for the current request.
 * For Store Managers, returns their assigned seller ID.
 * For Sellers, returns their own user ID.
 * 
 * @param req - The authenticated request object
 * @returns The seller ID to use for queries
 */
export function getEffectiveSellerId(req: AuthRequest): string | undefined {
  if (!req.user?.userId) {
    return undefined;
  }

  // If user is a Store Manager, use their assigned seller's ID
  if (req.user.role === 'StoreManager' && req.user.sellerId) {
    return req.user.sellerId;
  }

  // Otherwise, use their own ID (for Sellers)
  return req.user.userId;
}
