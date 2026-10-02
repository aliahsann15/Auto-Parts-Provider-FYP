import { Request, Response } from 'express'
import Make from '../models/Make'
import { isValidObjectId } from 'mongoose'

/**
 * GET /api/Makes
 * Fetch all Makes
 */
export const getAllMakes = async (req: Request, res: Response) => {
  try {
    const Makes = await Make.find().sort({ name: 1 })
    return res.json(Makes)
  } catch (error) {
    console.error('Error fetching Makes:', error)
    return res.status(500).json({ message: 'Server error fetching Makes' })
  }
}

/**
 * POST /api/Makes
 * Create a new Make
 */
export const createMake = async (req: Request, res: Response) => {
  try {
    const { name, description, slug } = req.body
    const exists = await Make.findOne({ slug })
    if (exists) {
      return res.status(400).json({ message: 'Make slug already exists' })
    }
    const make = new Make({ name, description, slug })
    await make.save()
    return res.status(201).json(Make)
  } catch (error) {
    console.error('Error creating Make:', error)
    return res.status(500).json({ message: 'Server error creating Make' })
  }
}


/**
 * GET /api/Makes?ids=<comma-sep list of Make IDs>
 * Fetch only the Makes whose _id is in the provided list.
 */
export const getMakesByIds = async (req: Request, res: Response) => {
  try {
    const idsParam = (req.query.ids as string) || "";
    if (!idsParam) {
      // No ids provided → return empty array
      return res.json({ Makes: [] });
    }

    // Split & trim, then keep only valid ObjectIds
    const ids = idsParam
      .split(",")
      .map((s) => s.trim())
      .filter((s) => isValidObjectId(s));

    if (ids.length === 0) {
      return res.json({ Makes: [] });
    }

    const Makes = await Make.find({ _id: { $in: ids } })
      .sort({ name: 1 })
      .lean()
      .exec();

    return res.json({ Makes });
  } catch (error) {
    console.error("Error fetching Makes by IDs:", error);
    return res
      .status(500)
      .json({ message: "Server error fetching Makes" });
  }
};