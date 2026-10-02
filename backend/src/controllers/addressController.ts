import { RequestHandler, Response } from 'express'
import User from '../models/User'

// GET /api/addresses
export const listAddresses: RequestHandler = async (req: any, res: Response): Promise<void> => {
  const userId = req.user?.userId
  if (!userId) {
    res.status(401).json({ ok: false, msg: 'Authentication required' })
    return
  }
  const user = await User.findById(userId, { addresses: 1, address: 1 }).lean()
  const addresses = (user as any)?.addresses?.length
    ? (user as any).addresses
    : (user as any)?.address
      ? [(user as any).address]
      : []
  res.json({ ok: true, addresses })
}

// POST /api/addresses
export const addAddress: RequestHandler = async (req: any, res: Response): Promise<void> => {
  const userId = req.user?.userId
  if (!userId) {
    res.status(401).json({ ok: false, msg: 'Authentication required' })
    return
  }

  const payload = req.body
  const user = await User.findById(userId)
  if (!user) {
    res.status(404).json({ ok: false, msg: 'User not found' })
    return
  }

  const addresses: any[] = (user as any).addresses || []

  // If this address is set as default, clear other defaults
  if (payload?.isDefault) {
    const normalized = addresses.map(addr => ({ ...addr, isDefault: false }))
    normalized.push({ ...payload, isDefault: true })
    ;(user as any).addresses = normalized
  } else {
    const makeDefault = addresses.length === 0
    addresses.push({ ...payload, isDefault: makeDefault ? true : payload?.isDefault })
    ;(user as any).addresses = addresses
  }

  await user.save()
  res.status(201).json({ ok: true, addresses: (user as any).addresses || [] })
}

// PUT /api/addresses/:index
export const updateAddress: RequestHandler = async (req: any, res: Response): Promise<void> => {
  const userId = req.user?.userId
  if (!userId) {
    res.status(401).json({ ok: false, msg: 'Authentication required' })
    return
  }
  const idx = Number(req.params.index)
  if (Number.isNaN(idx)) {
    res.status(400).json({ ok: false, msg: 'Invalid index' })
    return
  }

  const user = await User.findById(userId)
  if (!user) {
    res.status(404).json({ ok: false, msg: 'User not found' })
    return
  }

  const addresses: any[] = (user as any).addresses || []
  if (!addresses[idx]) {
    res.status(404).json({ ok: false, msg: 'Address not found' })
    return
  }
  if (req.body?.setDefault || req.body?.isDefault) {
    (user as any).addresses = addresses.map((addr, i) => ({
      ...addr,
      isDefault: i === idx,
    }))
  } else {
    addresses[idx] = { ...addresses[idx], ...req.body }
    ;(user as any).addresses = addresses
  }
  await user.save()
  res.json({ ok: true, addresses })
}

// DELETE /api/addresses/:index
export const deleteAddress: RequestHandler = async (req: any, res: Response): Promise<void> => {
  const userId = req.user?.userId
  if (!userId) {
    res.status(401).json({ ok: false, msg: 'Authentication required' })
    return
  }
  const idx = Number(req.params.index)
  if (Number.isNaN(idx)) {
    res.status(400).json({ ok: false, msg: 'Invalid index' })
    return
  }

  const user = await User.findById(userId)
  if (!user) {
    res.status(404).json({ ok: false, msg: 'User not found' })
    return
  }

  const addresses: any[] = (user as any).addresses || []
  if (!addresses[idx]) {
    res.status(404).json({ ok: false, msg: 'Address not found' })
    return
  }
  addresses.splice(idx, 1)
  ;(user as any).addresses = addresses
  await user.save()
  res.json({ ok: true, addresses })
}
