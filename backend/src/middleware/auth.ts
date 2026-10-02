import { Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { AuthRequest } from './authMiddleware'

export const JWT_SECRET = process.env.JWT_SECRET || 'some-long-random-string-you-generate'

// warn in dev if secret is not set
if (!process.env.JWT_SECRET) {
  // eslint-disable-next-line no-console
  console.warn(
    'JWT_SECRET not set — using development default. Set JWT_SECRET in environment for production.'
  )
}

/**
 * Middleware: authenticateToken
 * - Extracts bearer token from Authorization header
 * - Verifies JWT and attaches decoded payload to req.user (AuthRequest.user)
 * - Returns 401/403 on missing/invalid/expired token
 */
export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = (req.headers['authorization'] as string) || ''
    if (!authHeader) {
      return res.status(401).json({ msg: 'No token, authorization denied' })
    }

    // Support "Bearer <token>" and raw token in header
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim()
    if (!token) {
      return res.status(401).json({ msg: 'No token provided' })
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as { userId?: string; email?: string; role?: string; sellerId?: string; [k: string]: any }
    req.user = {
      userId: decoded.userId || decoded.id || decoded.userId,
      email: decoded.email,
      role: decoded.role,
      sellerId: decoded.sellerId // For Store Managers - their assigned seller ID
    } as any

    return next()
  } catch (err: any) {
    // Detailed logging for debugging (safe to remove in production)
    console.error('JWT Verification Failed:', err?.message || err)

    if (err?.name === 'TokenExpiredError') {
      return res.status(401).json({ msg: 'Token expired' })
    }

    return res.status(403).json({ msg: 'Token is not valid' })
  }
}

export default authenticateToken
