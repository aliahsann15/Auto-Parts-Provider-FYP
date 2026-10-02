import { Request, Response } from 'express'
import Category from '../models/Category'
import { isValidObjectId } from 'mongoose'

/**
 * GET /api/categories
 * Fetch all categories
 */
export const getAllCategories = async (req: Request, res: Response) => {
  try {
    const categories = await Category.find().sort({ name: 1 })
    return res.json(categories)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return res.status(500).json({ message: 'Server error fetching categories' })
  }
}

/**
 * POST /api/categories
 * Create a new category
 */
export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, description, slug } = req.body
    const exists = await Category.findOne({ slug })
    if (exists) {
      return res.status(400).json({ message: 'Category slug already exists' })
    }
    const category = new Category({ name, description, slug })
    await category.save()
    return res.status(201).json(category)
  } catch (error) {
    console.error('Error creating category:', error)
    return res.status(500).json({ message: 'Server error creating category' })
  }
}


/**
 * GET /api/categories?ids=<comma-sep list of category IDs>
 * Fetch only the categories whose _id is in the provided list.
 */
export const getCategoriesByIds = async (req: Request, res: Response) => {
  try {
    const idsParam = (req.query.ids as string) || "";
    if (!idsParam) {
      // No ids provided → return empty array
      return res.json({ categories: [] });
    }

    // Split & trim, then keep only valid ObjectIds
    const ids = idsParam
      .split(",")
      .map((s) => s.trim())
      .filter((s) => isValidObjectId(s));

    if (ids.length === 0) {
      return res.json({ categories: [] });
    }

    const categories = await Category.find({ _id: { $in: ids } })
      .sort({ name: 1 })
      .lean()
      .exec();

    return res.json({ categories });
  } catch (error) {
    console.error("Error fetching categories by IDs:", error);
    return res
      .status(500)
      .json({ message: "Server error fetching categories" });
  }
};