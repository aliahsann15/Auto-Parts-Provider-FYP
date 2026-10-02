import { Router, Request, Response, NextFunction } from 'express'
import {
  register,
  login,
  verifyEmail,
  checkEmail,
  googleSignIn,
  facebookSignIn,
  appleSignIn,
  requestPasswordReset,
  verifyResetCode,
  resetPassword
} from '../controllers/authController'

const router = Router()


// http://localhost:4001/api/auth/login
router.post(
  '/register',
  async (req: Request, res: Response, next: NextFunction) => {
   
    try {
      await register(req, res)
    } catch (err) {
      next(err)
    }
  }
)

router.post(
  '/login',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await login(req, res)
    } catch (err) {
      next(err)
    }
  }
)

router.post("/google", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await googleSignIn(req, res)
  } catch (err) {
    next(err)
  }
})
router.post(
  '/facebook',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await facebookSignIn(req, res)
    } catch (err) {
      next(err)
    }
  }
)

router.post(
  '/apple',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await appleSignIn(req, res)
    } catch (err) {
      next(err)
    }
  }
)

router.post(
  '/verify-email',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await verifyEmail(req, res)
    } catch (err) {
      next(err)
    }
  }
)

router.get(
  '/check-email',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await checkEmail(req, res)
    } catch (err) {
      next(err)
    }
  }

)

router.post(
  '/password/forgot',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await requestPasswordReset(req, res)
    } catch (err) {
      next(err)
    }
  }
)

router.post(
  '/password/verify',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await verifyResetCode(req, res)
    } catch (err) {
      next(err)
    }
  }
)

router.post(
  '/password/reset',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await resetPassword(req, res)
    } catch (err) {
      next(err)
    }
  }
)
export default router
