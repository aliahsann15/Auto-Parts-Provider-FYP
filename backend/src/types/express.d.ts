import { Request } from 'express'
// Extend Express Request interface to include user property
declare global {
  namespace Express {
    // Extend the Request interface
    interface Request {
      user?: {
        userId: string
        email: string
        role: string
      }
    }
  }
} 