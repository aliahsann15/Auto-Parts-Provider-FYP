import { Response, NextFunction, Request, RequestHandler } from 'express'
import { AuthRequest } from './authMiddleware'

export const checkRole = (allowedRoles: string[]): RequestHandler => {
  const middleware: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest
    if (!authReq.user) {
      res.status(401).json({ msg: 'Not authenticated' })
      return
    }

    if (!allowedRoles.includes(authReq.user.role)) {
      res.status(403).json({ msg: 'Not authorized' })
      return
    }

    next()
  }

  return middleware
}
