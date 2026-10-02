import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import jwt, { Secret } from 'jsonwebtoken'
import crypto from 'crypto'
import { OAuth2Client } from 'google-auth-library'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import User, { IUser } from '../models/User'
import Store from '../models/Store'
import { sendPasswordResetEmail, sendVerificationEmail } from '../utils/mailer'
import { sendResetSms } from '../utils/sms'

const JWT_SECRET: Secret = process.env.JWT_SECRET || 'some-long-random-string-you-generate'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d'
const JWT_REMEMBER_EXPIRES_IN = process.env.JWT_REMEMBER_EXPIRES_IN || '30d'
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'http://localhost:3000'
const MOBILE_DEEP_LINK = process.env.MOBILE_DEEP_LINK || 'myapp://reset-password'
const DEFAULT_GOOGLE_CLIENT_IDS = [
  process.env.GOOGLE_OAUTH_CLIENT_ID,
  process.env.GOOGLE_WEB_CLIENT_ID,
  process.env.GOOGLE_IOS_CLIENT_ID,
  process.env.GOOGLE_ANDROID_CLIENT_ID,
  // Fallback to currently-used mobile IDs if env not set
  '610728595563-o96shqongedshofnkifg3ns15d27fmv1.apps.googleusercontent.com',
  '610728595563-b71r4oiv5rm1v9arf9drau4tst58t0r6.apps.googleusercontent.com',
  '610728595563-fr7n7o0mn5aihlg9fogjdakosrk28pt2.apps.googleusercontent.com'
].filter(Boolean) as string[]

const GOOGLE_AUDIENCES = (process.env.GOOGLE_OAUTH_AUDIENCES || '').split(',')
  .map(s => s.trim())
  .filter(Boolean)
  .concat(DEFAULT_GOOGLE_CLIENT_IDS)

const googleClient = new OAuth2Client()
const appleJwks = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'))

type TokenResponse = { token: string; expiresIn: string }

function issueToken(user: Pick<IUser, '_id' | 'email' | 'role' | 'assignedSeller'>, rememberMe?: boolean): TokenResponse {
  const expiresIn = rememberMe ? JWT_REMEMBER_EXPIRES_IN : JWT_EXPIRES_IN
  const payload: any = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role
  }
  // For Store Managers, include the sellerId they're assigned to
  if (user.role === 'StoreManager' && user.assignedSeller) {
    payload.sellerId = user.assignedSeller.toString()
  }
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions)
  return { token, expiresIn }
}

type UserWithSeller = IUser & { sellerMakes?: string[]; sellerCategories?: string[] }

function sanitizeUser(user: IUser) {
  const sanitized: any = {
    id: user._id.toString(),
    name: user.name,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    profileImage: user.profileImage,
    phoneNumber: user.phoneNumber,
    sellerMakes: user.sellerMakes || [],
    sellerCategories: user.sellerCategories || []
  }
  // For Store Managers, include the sellerId they're assigned to
  if (user.role === 'StoreManager' && user.assignedSeller) {
    sanitized.sellerId = user.assignedSeller.toString()
  }
  return sanitized
}

function buildResetLinks(token: string) {
  const webLink = `${FRONTEND_BASE_URL.replace(/\/$/, '')}/reset-password?token=${token}`
  const mobileLink = `${MOBILE_DEEP_LINK.includes('://') ? MOBILE_DEEP_LINK : `myapp://${MOBILE_DEEP_LINK}`}?token=${token}`
  return { webLink, mobileLink }
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function hash(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

export async function register(req: Request, res: Response) {
  try {
    const {
      name,
      email,
      password,
      role,
      phoneNumber,
      rememberMe,
      // Seller specific fields
      cnic,
      businessName,
      businessType,
      licenseNumber,
      bankAccountNumber,
      accountTitle,
      branchCode,
      cnicImages,
      // Store address fields
      businessStreet,
      businessCity,
      businessProvince,
      businessPostalCode,
      businessCountry,
      sellerMakes,
      sellerCategories,
      // Buyer specific fields
      interests
    } = req.body

    const trimmedEmail = typeof email === 'string' ? email.trim() : ''

    if (!trimmedEmail || !password) {
      return res.status(400).json({ msg: 'Email and password are required' })
    }

    const normalizedEmail = trimmedEmail.toLowerCase()

    if (await User.findOne({ email: normalizedEmail }).lean()) {
      return res.status(400).json({ msg: 'Email already in use' })
    }
    
    const finalName = (name && name.trim()) || normalizedEmail.split('@')[0] || 'User'
    const normalizedPhone = typeof phoneNumber === 'string' ? phoneNumber.trim() : undefined

    // Validate required fields based on role
    if (role === 'Seller') {
      const requiredSellerFields = [
        // 'phoneNumber',
        'cnic',
        'businessName',
        'businessType',
        'licenseNumber',
        'cnicImages',
        'businessStreet',
        'businessCity',
        'businessProvince'
      ]

      const missingFields = requiredSellerFields.filter(field => !req.body[field])
      if (missingFields.length > 0) {
        return res.status(400).json({
          msg: 'Missing required seller fields',
          missingFields
        })
      }
    }

    const salt = await bcrypt.genSalt(10)
    const hashPassword = await bcrypt.hash(password, salt)

    // Generate email verification code
    const emailVerificationCode = Math.floor(100000 + Math.random() * 900000).toString()
    const normalizeStringArray = (value: any): string[] => {
      if (!value) return []
      if (Array.isArray(value)) return value.map(v => String(v)).filter(Boolean)
      if (typeof value === 'string') {
        return value
          .split(',')
          .map(v => v.trim())
          .filter(Boolean)
      }
      return []
    }
    const normalizedSellerMakes = normalizeStringArray(sellerMakes)
    const normalizedSellerCategories = normalizeStringArray(sellerCategories)

      const newUser = new User({
        name: finalName,
        email: normalizedEmail,
        password: hashPassword,
        phoneNumber: normalizedPhone,
        role: role || 'Buyer',
        isEmailVerified: false,
        emailVerificationCode,
        // Seller specific fields
        ...(role === 'Seller' && {
          cnic,
          businessName,
          businessType,
          licenseNumber,
          cnicImages,
          sellerMakes: normalizedSellerMakes,
          sellerCategories: normalizedSellerCategories
        }),
      // Buyer specific fields
      ...(role === 'Buyer' && {
        interests: interests || []
      })
    })

    await newUser.save()

    const verificationEmail = await sendVerificationEmail(trimmedEmail, emailVerificationCode)
    const { token, expiresIn } = issueToken(newUser, rememberMe)

    // Create/seed store document for seller with provided address
    if (role === 'Seller') {
      const storeAddress = {
        street: businessStreet,
        city: businessCity,
        province: businessProvince,
        postalCode: businessPostalCode,
        country: businessCountry,
      };
      const cleanedAddress = Object.values(storeAddress).some(v => !!v)
        ? storeAddress
        : null;
      await Store.findOneAndUpdate(
        { user: newUser._id },
        {
          $setOnInsert: {
            user: newUser._id,
            storeName: newUser.businessName || newUser.name || 'My Store',
          },
          ...(cleanedAddress ? { $set: { addresses: [storeAddress] } } : {}),
        },
        { upsert: true, new: true }
      );
    }

    res.status(201).json({
      token,
      expiresIn,
      user: sanitizeUser(newUser),
      verificationURL: verificationEmail?.previewUrl
    })
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err })
  }
}

// — LOGIN —
export async function login(req: Request, res: Response) {
  console.log("hit login")
  try {
    const { email, password, rememberMe } = req.body
    const identifierSource =
      (typeof req.body.identifier === 'string' && req.body.identifier.trim()) ||
      (typeof req.body.username === 'string' && req.body.username.trim()) ||
      (typeof email === 'string' && email.trim())
    const trimmedIdentifier = identifierSource ? identifierSource.trim() : ''

    if (!trimmedIdentifier || !password) {
      return res.status(400).json({ msg: 'Email/username and password are required' })
    }

    const normalizedEmail = trimmedIdentifier.toLowerCase()
    const nicknameRegex = new RegExp(`^${escapeRegex(trimmedIdentifier)}$`, 'i')
    const digitsOnly = trimmedIdentifier.replace(/\D+/g, '')
    const phoneQueries = [{ phoneNumber: trimmedIdentifier }] as { phoneNumber: string }[]
    if (digitsOnly && digitsOnly !== trimmedIdentifier) {
      phoneQueries.push({ phoneNumber: digitsOnly })
    }

    const user = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { nickname: nicknameRegex },
        ...phoneQueries
      ]
    }).lean()
    if (!user || !user.password) {
      return res.status(400).json({ msg: 'Invalid credentials' })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' })
    }

    const { token, expiresIn } = issueToken(user, rememberMe)

    await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } })

    res.json({
      token,
      expiresIn,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        sellerId: user.role === 'StoreManager' && user.assignedSeller ? user.assignedSeller.toString() : undefined,
        isEmailVerified: user.isEmailVerified,
        phoneNumber: user.phoneNumber,
        sellerMakes: user.sellerMakes || [],
        sellerCategories: user.sellerCategories || []
      }
    })
  } catch (err) {
    console.error('Login handler error:', err)
    res.status(500).json({ msg: 'Server error', error: err })
  }
}

export async function googleSignIn(req: Request, res: Response) {
  try {
    const { idToken, rememberMe } = req.body

    if (!idToken) {
      return res.status(400).json({ msg: 'idToken is required for Google Sign-In' })
    }
    if (!GOOGLE_AUDIENCES.length) {
      return res.status(500).json({ msg: 'GOOGLE_OAUTH_CLIENT_ID not configured' })
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_AUDIENCES
    })
    const payload = ticket.getPayload()
    const email = payload?.email
    const googleId = payload?.sub

    if (!email || !googleId) {
      return res.status(400).json({ msg: 'Unable to verify Google identity' })
    }

    let user = await User.findOne({ $or: [{ googleId }, { email }] })
    let isNewUser = false

    if (user) {
      user.googleId = user.googleId || googleId
      user.profileImage = payload?.picture || user.profileImage
      user.isEmailVerified = true
    } else {
      isNewUser = true
      user = new User({
        name: payload?.name || email.split('@')[0],
        email,
        googleId,
        role: 'Buyer',
        isEmailVerified: true,
        profileImage: payload?.picture
      })
    }

    await user.save()
    const { token, expiresIn } = issueToken(user, rememberMe)

    res.json({
      user: sanitizeUser(user),
      token,
      expiresIn,
      newUser: isNewUser
    })
  } catch (err) {
    console.error('Google Sign-In error:', err)
    res.status(500).json({ msg: 'Server error during Google sign-in', error: err })
  }
}

export async function facebookSignIn(req: Request, res: Response) {
  try {
    const { accessToken, rememberMe } = req.body
    if (!accessToken) {
      return res.status(400).json({ msg: 'accessToken is required for Facebook Sign-In' })
    }
    const appId = process.env.FACEBOOK_APP_ID
    const appSecret = process.env.FACEBOOK_APP_SECRET
    if (!appId || !appSecret) {
      return res.status(500).json({ msg: 'FACEBOOK_APP_ID/SECRET not configured' })
    }

    const appAccessToken = `${appId}|${appSecret}`
    const debugResp = await fetch(
      `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${appAccessToken}`
    )
    const debugJson = await debugResp.json()

    if (!debugJson?.data?.is_valid) {
      return res.status(400).json({ msg: 'Invalid Facebook token' })
    }

    const profileResp = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${accessToken}`
    )
    const profile = await profileResp.json()

    const facebookId = profile?.id
    const email = profile?.email || req.body.email
    if (!facebookId || !email) {
      return res.status(400).json({ msg: 'Facebook account missing id/email consent' })
    }

    let user = await User.findOne({ $or: [{ facebookId }, { email }] })
    if (user) {
      user.facebookId = user.facebookId || facebookId
      user.profileImage = profile?.picture?.data?.url || user.profileImage
      user.isEmailVerified = true
    } else {
      user = new User({
        name: profile?.name || email.split('@')[0],
        email,
        facebookId,
        profileImage: profile?.picture?.data?.url,
        isEmailVerified: true,
        role: 'Buyer'
      })
    }

    await user.save()
    const { token, expiresIn } = issueToken(user, rememberMe)

    res.json({
      user: sanitizeUser(user),
      token,
      expiresIn
    })
  } catch (err) {
    console.error('Facebook Sign-In error:', err)
    res.status(500).json({ msg: 'Server error during Facebook sign-in', error: err })
  }
}

export async function appleSignIn(req: Request, res: Response) {
  try {
    const { identityToken, email: fallbackEmail, name, rememberMe } = req.body
    if (!identityToken) {
      return res.status(400).json({ msg: 'identityToken is required for Apple Sign-In' })
    }
    if (!process.env.APPLE_CLIENT_ID) {
      return res.status(500).json({ msg: 'APPLE_CLIENT_ID is not configured' })
    }

    const { payload } = await jwtVerify(identityToken, appleJwks, {
      issuer: 'https://appleid.apple.com',
      audience: process.env.APPLE_CLIENT_ID
    })

    const appleSub = payload.sub as string | undefined
    const email = (payload.email as string) || fallbackEmail
    if (!appleSub || !email) {
      return res.status(400).json({ msg: 'Unable to verify Apple identity' })
    }

    let user = await User.findOne({ $or: [{ appleSub }, { email }] })
    if (user) {
      user.appleSub = user.appleSub || appleSub
      user.name = user.name || name || email.split('@')[0]
      user.isEmailVerified = true
    } else {
      user = new User({
        name: name || email.split('@')[0],
        email,
        appleSub,
        role: 'Buyer',
        isEmailVerified: true
      })
    }

    await user.save()
    const { token, expiresIn } = issueToken(user, rememberMe)

    res.json({
      user: sanitizeUser(user),
      token,
      expiresIn
    })
  } catch (err) {
    console.error('Apple Sign-In error:', err)
    res.status(500).json({ msg: 'Server error during Apple sign-in', error: err })
  }
}

export async function verifyEmail(req: Request, res: Response) {
  const { email, code } = req.body

  const user = await User.findOne({ email })
  if (!user) return res.status(400).json({ msg: 'User not found' })

  if (user.emailVerificationCode !== code) {
    return res.status(400).json({ msg: 'Invalid or expired code' })
  }

  user.isEmailVerified = true
  user.emailVerificationCode = ''
  await user.save()

  const payload = { userId: user._id.toString(), email: user.email, role: user.role }
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' } as jwt.SignOptions)

  return res.json({ token })
}

export async function checkEmail(req: Request, res: Response) {
  const { email } = req.query
  if (typeof email !== 'string') {
    return res.status(400).json({ msg: 'Email is required' })
  }
  const exists = !!(await User.findOne({ email }))
  res.json({ exists })
}

export async function requestPasswordReset(req: Request, res: Response) {
  try {
    const { email, phoneNumber } = req.body
    const normalizedEmail = typeof email === 'string' ? email.toLowerCase() : undefined
    const lookups: any[] = []
    if (normalizedEmail) lookups.push({ email: normalizedEmail })
    if (phoneNumber) lookups.push({ phoneNumber })

    if (!lookups.length) {
      return res.status(400).json({ msg: 'Email or phoneNumber is required' })
    }

    const user = await User.findOne({ $or: lookups })

    if (!user) {
      return res.status(404).json({ msg: 'User not found' })
    }

    const resetToken = crypto.randomBytes(32).toString('hex')
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 1 * 60 * 1000) // 1 minute expiry

    user.resetPasswordTokenHash = hash(resetToken)
    user.resetPasswordOtpHash = hash(otpCode)
    user.resetPasswordExpiresAt = expiresAt

    await user.save()

    const { webLink, mobileLink } = buildResetLinks(resetToken)

    let emailResult: any = null
    let smsResult: any = null

    const type = req.body?.type
    const sendOtpOnly = type === 'otp'

    try {
      emailResult = await sendPasswordResetEmail(
        user.email,
        sendOtpOnly ? '' : webLink,
        otpCode,
        sendOtpOnly ? '' : mobileLink
      )
    } catch (err) {
      console.error('sendPasswordResetEmail failed', err)
    }
    if (user.phoneNumber) {
      try {
        smsResult = await sendResetSms(user.phoneNumber, mobileLink, otpCode)
      } catch (err) {
        console.error('sendResetSms failed', err)
      }
    }

    res.json({
      msg: 'Reset instructions sent',
      expiresAt,
      otp: process.env.NODE_ENV === 'production' ? undefined : otpCode,
      emailPreviewUrl: emailResult?.previewUrl,
      sms: smsResult
    })
  } catch (err) {
    console.error('Password reset request error:', err)
    res.status(500).json({ msg: 'Server error sending reset link', error: err })
  }
}

export async function verifyResetCode(req: Request, res: Response) {
  try {
    const { email, phoneNumber, code } = req.body
    if ((!email && !phoneNumber) || !code) {
      return res.status(400).json({ msg: 'Email or phoneNumber and code are required' })
    }

    const user = await User.findOne(email ? { email } : { phoneNumber })
    if (
      !user ||
      !user.resetPasswordOtpHash ||
      !user.resetPasswordExpiresAt ||
      user.resetPasswordExpiresAt < new Date()
    ) {
      return res.status(400).json({ msg: 'Invalid or expired code' })
    }

    const incomingHash = hash(code)
    if (incomingHash !== user.resetPasswordOtpHash) {
      return res.status(400).json({ msg: 'Invalid code' })
    }

    // Rotate the reset token when OTP is confirmed so the next step uses the new token.
    const resetToken = crypto.randomBytes(32).toString('hex')
    user.resetPasswordTokenHash = hash(resetToken)
    user.resetPasswordExpiresAt = new Date(Date.now() + 15 * 60 * 1000)
    await user.save()

    const { webLink, mobileLink } = buildResetLinks(resetToken)

    res.json({ ok: true, resetToken, webLink, mobileLink, expiresAt: user.resetPasswordExpiresAt })
  } catch (err) {
    console.error('verifyResetCode error:', err)
    res.status(500).json({ msg: 'Server error verifying code', error: err })
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const { token, code, password } = req.body
    if (!password) {
      return res.status(400).json({ msg: 'New password is required' })
    }

    const now = new Date()
    let user: IUser | null = null

    if (token) {
      user = await User.findOne({
        resetPasswordTokenHash: hash(token),
        resetPasswordExpiresAt: { $gt: now }
      })
    } else if (code) {
      user = await User.findOne({
        resetPasswordOtpHash: hash(code),
        resetPasswordExpiresAt: { $gt: now }
      })
    }

    if (!user) {
      return res.status(400).json({ msg: 'Invalid or expired reset token' })
    }

    const salt = await bcrypt.genSalt(10)
    user.password = await bcrypt.hash(password, salt)
    user.resetPasswordTokenHash = undefined
    user.resetPasswordOtpHash = undefined
    user.resetPasswordExpiresAt = undefined
    await user.save()

    res.json({ msg: 'Password reset successful' })
  } catch (err) {
    console.error('resetPassword error:', err)
    res.status(500).json({ msg: 'Server error resetting password', error: err })
  }
}
