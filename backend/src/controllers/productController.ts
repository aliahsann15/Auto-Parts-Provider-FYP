import { Request, RequestHandler, Response } from 'express'
import Product from '../models/Product'
import User from '../models/User'
import Make from '../models/Make'
import { AuthRequest } from '../middleware/authMiddleware';
import { UPLOADS_FOLDER } from '../utils/constants';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import { getEffectiveSellerId } from '../utils/sellerHelper';



function cleanupFiles(files: Express.Multer.File[]) {
  for (const f of files) {
    fs.unlink(path.join(UPLOADS_FOLDER, f.filename), () => {});
  }
}

const ensureMakeExists = async (name?: string) => {
  const trimmed = name?.trim();
  if (!trimmed) return;
  const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const existing = await Make.findOne({ slug }).lean();
  if (!existing) {
    // attempt to resolve a static icon if present
    const candidateIcons = [
      path.resolve(__dirname, '..', '..', 'web', 'public', 'images', 'makes', `${slug}.png`),
      path.resolve(__dirname, '..', '..', 'web', 'public', 'images', 'makes', `${slug}.jpg`),
      path.resolve(__dirname, '..', '..', 'web', 'public', 'images', 'makes', `${slug}.jpeg`),
      path.resolve(__dirname, '..', '..', 'web', 'public', 'images', 'icons', `${slug}.png`),
    ];
    let imagePath: string | undefined;
    for (const iconPath of candidateIcons) {
      if (fs.existsSync(iconPath)) {
        // serve from /images/... (web/public/images)
        const rel = iconPath.split(/web[\\/]+public/)[1];
        imagePath = `/images${rel.replace(/\\\\/g, '/').replace(/\\/g, '/')}`;
        break;
      }
    }
    await Make.create({ name: trimmed, slug, ...(imagePath ? { image: imagePath } : {}) });
  }
};

// Helper function to check if user has permission to manage product
const hasProductPermission = async (userId: string, productId: string) => {
  const product = await Product.findById(productId)
  if (!product) return false

  const user = await User.findById(userId)
  if (!user) return false

  // SuperAdmin and SubAdmin can manage all products
  if (user.role === 'SuperAdmin' || user.role === 'SubAdmin') return true

  // Seller can manage their own products
  if (user.role === 'Seller' && product.seller.toString() === userId) return true

  // StoreManager can manage products if they belong to their assigned seller
  if (user.role === 'StoreManager' && user.assignedSeller) {
    return product.seller.toString() === user.assignedSeller.toString();
  }

  return false
}

const normalizeDurationUnit = (value?: string): 'DAY' | 'MONTH' | 'YEAR' | undefined => {
  if (!value) return undefined;
  const normalized = String(value).trim().toUpperCase();
  if (!normalized) return undefined;
  if (normalized === 'DAY' || normalized === 'DAYS') return 'DAY';
  if (normalized === 'MONTH' || normalized === 'MONTHS') return 'MONTH';
  if (normalized === 'YEAR' || normalized === 'YEARS') return 'YEAR';
  return undefined;
};

const toPositiveNumber = (value: any) => {
  const normalized = Array.isArray(value) ? value[0] : value;
  if (normalized === null || typeof normalized === 'undefined') return undefined;
  const num = Number(normalized);
  return Number.isNaN(num) ? undefined : num;
};

// Multer can deliver form fields as strings or arrays; normalize to a single trimmed string
const firstString = (value: any) => {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : undefined;
  return typeof value === 'string' ? value : undefined;
};

// Create a new product
export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    
    if (!req.user) {
      return res.status(401).json({ msg: 'Not authenticated' });
    }

    const files = (req as any).files as {
      [fieldName: string]: Express.Multer.File[];
    } || {};

    const featured = files?.featuredImage?.[0]
    const gallery  = files?.galleryImages || []


    if (!featured && gallery.length === 0) {
      return res.status(400).json({
        msg: 'Missing required product fields.',
        errors: { images: 'At least one image is required.' }
      })
    }

    const allFiles = featured ? [featured, ...gallery] : gallery

    const baseUrl = `${req.protocol}://${req.get('host')}/${path.basename(UPLOADS_FOLDER)}`;
    const imageUrls = allFiles.map(f => `${baseUrl}/${f.filename}`)

    const {
      name,
      description,
      price,
      brand,
      stock,
      technicalDescription,
      categories,
      sku,
      carModel,
      make,
      variant,
      status,
      salePrice,
      width,
      length,
      height,
      warrantyDurationValue,
      warrantyDurationUnit,
      year,
      returnDays,
    } = req.body;

    // For Store Managers, use their assigned seller ID; otherwise use their own ID
    const sellerId = req.user.role === 'StoreManager' && req.user.sellerId 
      ? req.user.sellerId 
      : req.user.userId;

    // Parse categories - FormData sends multiple values for same key as an array
    let parsedCategories = categories;
    if (typeof categories === 'string') {
      parsedCategories = [categories];
    } else if (!Array.isArray(categories)) {
      parsedCategories = [];
    }

    

    const sName   = firstString(name);
    const sDesc   = firstString(description);
    const sBrand  = firstString(brand);
    const sSku    = firstString(sku);
    const sModel  = firstString(carModel);
    const sMake   = firstString(make);
    const sVariant= firstString(variant);
    const sStatus = firstString(status);
    const sTech   = firstString(technicalDescription);
    const sYear   = firstString(year);

    const errors: { [key: string]: string } = {};
    if (!sName) errors.name = 'Name is required.';
    if (!price) errors.price = 'Price is required.';
    if (!sSku) errors.sku = 'SKU is required.';
    if (!sModel) errors.carModel = 'Model is required.';
    if (!sMake) errors.make = 'Maker is required.';
    if (!parsedCategories || parsedCategories.length === 0) {
      errors.categories = 'At least one category is required.';
    }

    if (Object.keys(errors).length > 0) {
  
      cleanupFiles(allFiles);
      return res.status(400).json({
        msg: 'Missing required product fields.',
        errors
      });
    }


    const parsedDimensions = {
      width: toPositiveNumber(width),
      length: toPositiveNumber(length),
      height: toPositiveNumber(height),
    };
    const hasDimensions = parsedDimensions.width !== undefined || parsedDimensions.length !== undefined || parsedDimensions.height !== undefined;
    const parsedWarrantyDurationValue = toPositiveNumber(warrantyDurationValue);
    const parsedWarrantyDurationUnit = normalizeDurationUnit(warrantyDurationUnit);
    const parsedReturnDays = toPositiveNumber(returnDays);

    const cleanedYear = year ? String(year).trim() : undefined;

    const product = new Product({
      name: sName,
      description: sDesc,
      price,
      categories: parsedCategories,
      brand: sBrand,
      make: sMake,
      carModel: sModel,
      variant: sVariant,
      year: cleanedYear ?? sYear,
      sku: sSku,
      stock: stock || 0,
      images: imageUrls, 
      technicalDescription: sTech,
      seller: sellerId,
      status: sStatus || 'active',
      salePrice,
      ...(hasDimensions ? { dimensions: parsedDimensions } : {}),
      ...(parsedWarrantyDurationValue !== undefined
        ? { warrantyDurationValue: parsedWarrantyDurationValue }
        : {}),
      ...(parsedWarrantyDurationUnit
        ? { warrantyDurationUnit: parsedWarrantyDurationUnit }
        : {}),
      ...(parsedReturnDays !== undefined ? { returnDays: parsedReturnDays } : {}),
    });

    // Save the product to the database
    await product.save();

    await ensureMakeExists(make);

   

    // Send success response
    res.status(201).json({ msg: 'Product created successfully', product });

  } catch (err: any) {
    console.error('❌ Backend Server Error:', err);

    // Check if it's a Mongoose validation error
    if (err.name === 'ValidationError') {
        const errors: { [key: string]: string | string[] } = {};
        for (const field in err.errors) {
            errors[field] = err.errors[field].message;
        }
        console.error('❌ Validation Error:', errors);
        return res.status(400).json({ msg: 'Product validation failed', errors });
    }

    // Duplicate key error (unique constraint)
    if (err.code === 11000) {
      console.error('❌ Duplicate key error:', err.keyPattern);
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({
        msg: 'Duplicate entry',
        errors: { [field]: `${field} already exists.` }
      });
    }

    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) 
      return res.status(401).json({ msg: 'Not authenticated' });

    const canEdit = await hasProductPermission(req.user.userId, req.params.id);
    if (!canEdit) 
      return res.status(403).json({ msg: 'Not authorized to update this product' });

    const rawFiles = (req as any).files;
    const files = Array.isArray(rawFiles)
      ? rawFiles.reduce<Record<string, Express.Multer.File[]>>((acc, file) => {
          const arr = acc[file.fieldname] || [];
          arr.push(file);
          acc[file.fieldname] = arr;
          return acc;
        }, {})
      : (rawFiles as { [fieldName: string]: Express.Multer.File[] }) || {};

    const originalProduct = await Product.findById({_id: req.params.id}).lean();
    if (!originalProduct) {
      return res.status(404).json({ msg: "Product not found." });
    }

    const featured = files?.featuredImage?.[0];
    const gallery  = files?.galleryImages || [];


    // if (!featured && gallery.length === 0) {
    //   return res.status(400).json({
    //     msg: 'Missing required product fields.',
    //     errors: { images: 'At least one image is required.' }
    //   })
    // }
    let updateImageUrls = false;
    let imageUrls = originalProduct.images || [];

    // Parse existing images client wants to keep (passed as JSON string or array)
    const existingImagesRaw = (req.body as any).existingImages;
    let hasExistingImagesField = typeof existingImagesRaw !== 'undefined';
    let existingImages: string[] = [];
    if (Array.isArray(existingImagesRaw)) {
      existingImages = existingImagesRaw;
    } else if (typeof existingImagesRaw === 'string') {
      try {
        existingImages = JSON.parse(existingImagesRaw);
        if (!Array.isArray(existingImages)) existingImages = [];
      } catch {
        existingImages = [];
      }
    }
    existingImages = existingImages.filter((u) => typeof u === 'string' && u.trim());

    // only replace images if new files are sent or client provided explicit image list
    const hasNewFeatured = featured && featured.originalname !== 'undefined';
    const hasNewGallery = (gallery || []).some(f => f?.originalname !== 'undefined');
    const shouldUpdateImages = hasNewFeatured || hasNewGallery || hasExistingImagesField;

    let newUploadedFeatured: string | undefined;
    let newUploadedGallery: string[] = [];
    if (hasNewFeatured || hasNewGallery) {
      const allFiles = hasNewFeatured ? [featured!, ...gallery] : gallery;
      const baseUrl = `${req.protocol}://${req.get('host')}/${path.basename(UPLOADS_FOLDER)}`;
      const uploadedUrls = allFiles.map(f => `${baseUrl}/${f.filename}`);
      if (hasNewFeatured) {
        newUploadedFeatured = uploadedUrls[0];
        newUploadedGallery = uploadedUrls.slice(1);
      } else {
        newUploadedGallery = uploadedUrls;
      }
    }

    // build final image list preserving order: featured first, then remaining existing, then new gallery uploads
    if (shouldUpdateImages) {
      const baseOrder = hasExistingImagesField ? existingImages : imageUrls;
      if (hasNewFeatured) {
        imageUrls = [
          newUploadedFeatured!,
          ...baseOrder.filter(u => u !== newUploadedFeatured),
          ...newUploadedGallery,
        ];
      } else if (hasNewGallery) {
        imageUrls = [...baseOrder, ...newUploadedGallery];
      } else {
        imageUrls = baseOrder;
      }
      // ensure uniqueness and truthy values
      imageUrls = Array.from(new Set(imageUrls.filter(Boolean)));
      updateImageUrls = true;
      if (imageUrls.length === 0) {
        return res.status(400).json({
          msg: 'Missing required product fields.',
          errors: { images: 'At least one image is required.' }
        });
      }
    }

    // if(featured.originalname !== "undefined" || gallery[0].originalname !== "undefined") {
    //   const allFiles = [featured, ...gallery]
  
    //   const baseUrl = `${req.protocol}://${req.get('host')}/${path.basename(UPLOADS_FOLDER)}`;
    //   imageUrls = allFiles.map(f => `${baseUrl}/${f.filename}`)
    //   updateImageUrls = true;
    // }

    // ③ Validate incoming fields
    const {
      name,
      description,
      price,
      brand,
      make,
      carModel,
      variant,
      sku,
      stock,
      technicalDescription,
      status,
      salePrice,
      width,
      length,
      height,
      warrantyDurationValue,
      warrantyDurationUnit,
      year,
      returnDays,
    } = req.body;

    // normalize categories
    let categories: string[] = [];
    if (Array.isArray(req.body.categories)) {
      categories = req.body.categories;
    } else if (typeof req.body.categories === 'string') {
      categories = req.body.categories
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);
    }

    const sName    = firstString(name);
    const sDesc    = firstString(description);
    const sBrand   = firstString(brand);
    const sMake    = firstString(make);
    const sModel   = firstString(carModel);
    const sVariant = firstString(variant);
    const sSku     = firstString(sku);
    const sStatus  = firstString(status);
    const sTech    = firstString(technicalDescription);
    const sYear    = firstString(year);

    const errors: Record<string, string> = {};
    if (!sName?.trim())      errors.name       = 'Name is required.';
    if (!price?.toString().trim())     errors.price      = 'Price is required.';
    if (!sSku?.trim())       errors.sku        = 'SKU is required.';
    if (!sMake?.trim())      errors.make       = 'Maker is required.';
    if (!sModel?.trim())  errors.carModel   = 'Model is required.';
    if (categories.length === 0) {
      errors.categories = 'At least one category is required.';
    }

    // ⑤ Prepare update payload
    const updateData: any = {
      name: sName?.trim(),
      description: sDesc?.trim(),
      price: Number(price),
      brand: sBrand?.trim(),
      make: sMake?.trim(),
      carModel: sModel?.trim(),
      variant: sVariant?.trim(),
      year: sYear?.trim(),
      sku: sSku?.trim(),
      stock: Number(stock),
      technicalDescription: sTech?.trim(),
      categories,
    };
    if (sStatus) updateData.status = sStatus.trim();
    if (salePrice) updateData.salePrice = Number(salePrice);
    if (updateImageUrls) {
      updateData.images = imageUrls;
    }

    const parsedDimensions = {
      width: toPositiveNumber(width),
      length: toPositiveNumber(length),
      height: toPositiveNumber(height),
    };
    if (parsedDimensions.width !== undefined || parsedDimensions.length !== undefined || parsedDimensions.height !== undefined) {
      updateData.dimensions = parsedDimensions;
    }
    const parsedWarrantyDurationValue = toPositiveNumber(warrantyDurationValue);
    const parsedWarrantyDurationUnit = normalizeDurationUnit(warrantyDurationUnit);
    const parsedReturnDays = toPositiveNumber(returnDays);
    if (parsedWarrantyDurationValue !== undefined) updateData.warrantyDurationValue = parsedWarrantyDurationValue;
    if (parsedWarrantyDurationUnit) updateData.warrantyDurationUnit = parsedWarrantyDurationUnit;
    if (parsedReturnDays !== undefined) updateData.returnDays = parsedReturnDays;

    // Remove undefined fields so we don't overwrite existing values unintentionally
    Object.keys(updateData).forEach(key => {
      if (typeof updateData[key] === 'undefined') {
        delete updateData[key];
      }
    });

    // ⑥ Persist
    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ msg: 'Product not found after update' });
    }

    await ensureMakeExists(updateData.make);

    res.status(200).json({ msg: 'Product updated successfully', product: updated });

  } catch (err: any) {
    console.error('Error in updateProduct:', err);
    // Optionally clean new files on unexpected errors:
    // const allNew = featuredFile ? [featuredFile] : [];
    // cleanupFiles(allNew.concat(galleryFiles));
    return res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

/**
 * GET /api/products?page=1&limit=10
 */
export const getProducts: RequestHandler = async (req, res, next) => {
  const authReq = req as AuthRequest;

  try {
    if (!authReq.user) {
      res.status(401).json({ msg: 'Not authenticated' });
      return;
    }

    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '10', 10);
    const skip = (page - 1) * limit;
    const statusFilter = (req.query.status as string)?.trim();

    // restrict by seller if needed
    const userRecord = await User.findById(authReq.user.userId);
    const filter: any = {};
    if (userRecord?.role === 'Seller') {
      filter.seller = userRecord._id;
    } else if (userRecord?.role === 'StoreManager') {
      // For StoreManager, use their assigned seller's ID
      const sellerId = getEffectiveSellerId(authReq);
      if (sellerId) {
        filter.seller = new mongoose.Types.ObjectId(sellerId);
      } else {
        res.status(403).json({ msg: 'Store Manager not assigned to a seller' });
        return;
      }
    }
    if (statusFilter) {
      filter.status = statusFilter;
    } else {
      filter.status = { $ne: 'deleted' };
    }

    // total count & page slice
    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    const totalPages = Math.ceil(total / limit);

    res.json({
      products,
      pagination: { total, totalPages, page, limit },
    });
  } catch (err) {
    next(err);
  }
};

// Get single product
export const getProduct = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ msg: 'Not authenticated' })
    const product = await Product.findById(req.params.id)
    if (!product) {
      return res.status(404).json({ msg: 'Product not found' })
    }

    const user = await User.findById(req.user.userId)
    if (user?.role === 'Buyer') {
      // Return limited information for buyers
      const { name, description, price, categories, brand, images, specifications } = product
      return res.json({ name, description, price, categories, brand, images, specifications })
    }

    res.json(product)
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err })
  }
}


// Delete product
export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ msg: 'Not authenticated' })
    const hasPermission = await hasProductPermission(req.user.userId, req.params.id)
    if (!hasPermission) {
      return res.status(403).json({ msg: 'Not authorized to delete this product' })
    }

    const permanent = String(req.query.permanent || '').toLowerCase() === 'true';
    let product;

    if (permanent) {
      product = await Product.findByIdAndDelete(req.params.id);
      if (!product) return res.status(404).json({ msg: 'Product not found' });
      return res.json({ msg: 'Product permanently deleted' });
    } else {
      product = await Product.findByIdAndUpdate(
        req.params.id,
        { $set: { status: 'deleted' } },
        { new: true }
      );
      if (!product) return res.status(404).json({ msg: 'Product not found' });
      return res.json({ msg: 'Product deleted', product });
    }

  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err })
  }
}

export const restoreProduct = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ msg: 'Not authenticated' })
    const hasPermission = await hasProductPermission(req.user.userId, req.params.id)
    if (!hasPermission) {
      return res.status(403).json({ msg: 'Not authorized to restore this product' })
    }
    const status = (req.body?.status as string)?.trim() || 'draft';
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true }
    );
    if (!product) return res.status(404).json({ msg: 'Product not found' });
    res.json({ msg: 'Product restored', product });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err })
  }
}
