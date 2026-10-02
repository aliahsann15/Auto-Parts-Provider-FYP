import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'some-long-random-string-you-generate'

export interface AuthRequest extends Request {
  user?: { userId: string; email: string; role: string; sellerId?: string }
}

export function verifyToken(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) {
    res.status(401).json({ msg: 'No token provided' })
    return
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: string }
    req.user = decoded
    next()
  } catch {
    res.status(401).json({ msg: 'Invalid token' })
    return
  }
}
