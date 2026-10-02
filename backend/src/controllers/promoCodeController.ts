import { Response } from 'express';
import PromoCode from '../models/PromoCode';
import Product from '../models/Product';
import { AuthRequest } from '../middleware/authMiddleware';
import mongoose from 'mongoose';
import Category from '../models/Category';

const isSellerOrAdmin = (role?: string) => role === 'Seller' || role === 'SuperAdmin' || role === 'SubAdmin';

const validatePayload = (body: any) => {
  const errors: Record<string, string> = {};
  if (!body.code?.toString().trim()) errors.code = 'Code is required';
  if (!body.type || !['percentage', 'amount'].includes(body.type)) errors.type = 'Invalid type';
  if (typeof body.value === 'undefined' || Number(body.value) <= 0) errors.value = 'Value must be greater than zero';
  if (!body.scope || !['all', 'product', 'category'].includes(body.scope)) errors.scope = 'Invalid scope';
  if (body.scope === 'product' && (!Array.isArray(body.products) || body.products.length === 0)) errors.product = 'At least one product is required for product scope';
  if (body.scope === 'category' && (!Array.isArray(body.categories) || body.categories.length === 0)) errors.category = 'At least one category is required for category scope';
  return errors;
};

export const createPromoCode = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !isSellerOrAdmin(req.user.role)) {
      return res.status(401).json({ msg: 'Not authorized' });
    }
    const errors = validatePayload(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ msg: 'Validation failed', errors });

    const sellerId = req.user.userId; // Always bind to the authenticated user
    const promo = await PromoCode.create({
      code: req.body.code.toString().trim().toUpperCase(),
      seller: sellerId,
      scope: req.body.scope,
      type: req.body.type,
      value: Number(req.body.value),
      products: req.body.scope === 'product' ? req.body.products : undefined,
      categories: req.body.scope === 'category' ? req.body.categories : undefined,
      durationType: req.body.durationType,
      durationDays: req.body.durationType === 'days' ? Number(req.body.durationDays || 0) : undefined,
      startDate: req.body.durationType === 'custom' && req.body.startDate ? new Date(req.body.startDate) : undefined,
      endDate: req.body.durationType === 'custom' && req.body.endDate ? new Date(req.body.endDate) : undefined,
      active: req.body.active !== false,
    });
    res.status(201).json({ promo });
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(400).json({ msg: 'Promo code already exists for this seller' });
    }
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

export const getPromoCodes = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !isSellerOrAdmin(req.user.role)) {
      return res.status(401).json({ msg: 'Not authorized' });
    }
    const sellerId = req.user.role === 'Seller' ? req.user.userId : (req.query.seller as string) || req.user.userId;
    const promos = await PromoCode.find({ seller: sellerId }).sort({ createdAt: -1 }).lean();
    res.json({ promos });
  } catch (err: any) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

export const updatePromoCode = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !isSellerOrAdmin(req.user.role)) {
      return res.status(401).json({ msg: 'Not authorized' });
    }
    const errors = validatePayload(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ msg: 'Validation failed', errors });

    const sellerId = req.user.userId; // Always bind to the authenticated user
    const promo = await PromoCode.findOneAndUpdate(
      { _id: req.params.id, seller: sellerId },
      {
        code: req.body.code.toString().trim().toUpperCase(),
        scope: req.body.scope,
        type: req.body.type,
        value: Number(req.body.value),
        products: req.body.scope === 'product' ? req.body.products : undefined,
        categories: req.body.scope === 'category' ? req.body.categories : undefined,
        durationType: req.body.durationType,
        durationDays: req.body.durationType === 'days' ? Number(req.body.durationDays || 0) : undefined,
        startDate: req.body.durationType === 'custom' && req.body.startDate ? new Date(req.body.startDate) : undefined,
        endDate: req.body.durationType === 'custom' && req.body.endDate ? new Date(req.body.endDate) : undefined,
        active: req.body.active !== false,
      },
      { new: true }
    );
    if (!promo) return res.status(404).json({ msg: 'Promo code not found' });
    res.json({ promo });
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(400).json({ msg: 'Promo code already exists for this seller' });
    }
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

export const deletePromoCode = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !isSellerOrAdmin(req.user.role)) {
      return res.status(401).json({ msg: 'Not authorized' });
    }
    const sellerId = req.user.role === 'Seller' ? req.user.userId : req.user.userId;
    const promo = await PromoCode.findOneAndDelete({ _id: req.params.id, seller: sellerId });
    if (!promo) return res.status(404).json({ msg: 'Promo code not found' });
    res.json({ msg: 'Promo code deleted' });
  } catch (err: any) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

export const applyPromoCode = async (req: AuthRequest, res: Response) => {
  try {
    const codeInput = (req.body.code || '').toString().trim().toUpperCase();
    const rawItems = Array.isArray(req.body.items) ? req.body.items : [];
    if (!codeInput || !rawItems.length) {
      return res.status(400).json({ msg: 'Code and items are required' });
    }
    const normalizedItems = rawItems
      .map((item: any) => ({
        productId: item.productId ? String(item.productId) : '',
        quantity: Number(item.quantity || 1),
        sellerId: item.sellerId ? String(item.sellerId) : '',
        price: Number(item.price ?? item.salePrice ?? 0) || 0,
        categories: Array.isArray(item.categories) ? item.categories : [],
      }))
      .filter((item: any) => !!item.productId);
    if (!normalizedItems.length) {
      return res.status(400).json({ msg: 'Code and items are required' });
    }

    const promo = await PromoCode.findOne({ code: codeInput, active: true }).lean();
    const promoSellerId =
      (promo as any)?.seller?._id?.toString?.() ||
      (promo as any)?.seller?.toString?.() ||
      (promo as any)?.seller ||
      '';
    const itemIds = normalizedItems.map((i: any) => i.productId);
   
    if (!promo) {
      return res.status(404).json({ msg: 'Invalid or inactive promo code' });
    }

    // Duration checks
    const now = Date.now();
    if (promo.durationType === 'days' && promo.durationDays && promo.createdAt) {
      const expiresAt = new Date(promo.createdAt).getTime() + Number(promo.durationDays) * 24 * 60 * 60 * 1000;
      if (now > expiresAt) return res.status(400).json({ msg: 'Promo code expired' });
    }
    if (promo.durationType === 'custom') {
      if (promo.startDate && now < new Date(promo.startDate).getTime()) {
        return res.status(400).json({ msg: 'Promo code not active yet' });
      }
      if (promo.endDate && now > new Date(promo.endDate).getTime()) {
        return res.status(400).json({ msg: 'Promo code expired' });
      }
    }

    const productIds = Array.from(new Set(itemIds))
      .filter((id: any) => mongoose.Types.ObjectId.isValid(id));

    if (!productIds.length) {
      return res.status(400).json({ msg: 'No valid products provided' });
    }

    const products = await Product.find({ _id: { $in: productIds } }).lean();
  

    // Prepare category name map to handle ObjectId vs. name mismatches
    const rawProductCatIds = products.flatMap((p: any) =>
      (Array.isArray(p.categories) ? p.categories : []).filter(Boolean)
    );
    const rawPromoCatIds = Array.isArray(promo.categories) ? promo.categories : [];
    const catIdCandidates = [...rawProductCatIds, ...rawPromoCatIds]
      .map((c: any) => {
        if (!c) return null;
        const str = c.toString?.() || c;
        return mongoose.Types.ObjectId.isValid(str) ? new mongoose.Types.ObjectId(str) : null;
      })
      .filter(Boolean) as mongoose.Types.ObjectId[];
    const catNameMap: Record<string, string> = {};
    if (catIdCandidates.length) {
      const catDocs = await Category.find({ _id: { $in: catIdCandidates } }, { name: 1 }).lean();
      catDocs.forEach(c => {
        catNameMap[c._id.toString()] = (c.name || '').toString().trim().toLowerCase();
      });
    }
  

    const buildCategoryTokens = (values: any[] | undefined): string[] => {
      if (!Array.isArray(values)) return [];
      const tokenSet = new Set<string>();
      values.forEach((c: any) => {
        if (!c) return;
        const candidates: any[] =
          typeof c === 'string'
            ? [c]
            : [c._id, c.id, c.slug, c.name, c.toString?.()].filter(Boolean);
        candidates.forEach(value => {
          if (!value) return;
          const key = String(value).trim().toLowerCase();
          if (key) tokenSet.add(key);
          const mapped = catNameMap[value?.toString?.() || value];
          if (mapped) tokenSet.add(mapped.toString().trim().toLowerCase());
        });
        const fallbackKey =
          typeof c === 'object' ? (c._id?.toString?.() || c.id || c.slug || c.name || c.toString?.()) : String(c);
        if (fallbackKey && catNameMap[fallbackKey]) {
          tokenSet.add(catNameMap[fallbackKey]);
        }
      });
      return Array.from(tokenSet);
    };

    const promoCatTokens = Array.from(
      new Set([
        ...buildCategoryTokens(promo.categories),
        ...(Array.isArray(promo.categories)
          ? promo.categories
              .map((c: any) => {
                const key = c?.toString?.() || c;
                return key && catNameMap[key.toString?.() || key];
              })
              .filter(Boolean) as string[]
          : []),
      ])
    );

    const productMap = new Map<string, any>();
    products.forEach(p => {
      if (p._id) {
        productMap.set(p._id.toString(), p);
      }
    });

    let applicableTotal = 0;
    let matchedItems = 0;

    for (const item of normalizedItems) {
      const product = productMap.get(item.productId);
      const productSellerId =
        (product as any)?.seller?._id?.toString?.() ||
        (product as any)?.seller?.toString?.() ||
        (product as any)?.seller ||
        '';
      const resolvedSellerId = productSellerId || item.sellerId || '';
      if (resolvedSellerId && promoSellerId && String(resolvedSellerId) !== String(promoSellerId)) {
       
        continue;
      }

      if (promo.scope === 'product' && Array.isArray(promo.products) && promo.products.length) {
        const productMatch = promo.products
          .map((p: any) => String(p))
          .includes(product?._id?.toString?.() || item.productId);
        if (!productMatch) continue;
      }

      if (promo.scope === 'category' && Array.isArray(promo.categories) && promo.categories.length) {
        const productCatTokens = product ? buildCategoryTokens(product.categories) : [];
        const fallbackCatTokens = buildCategoryTokens(item.categories);
        const allCatTokens = Array.from(new Set([...productCatTokens, ...fallbackCatTokens]));
      
        if (!allCatTokens.some(tok => promoCatTokens.includes(tok))) {
        
          continue;
        }
      }

      const price = item.price || (product ? (product.salePrice ?? product.price ?? 0) : 0);
      const qty = Number(item.quantity || 1);
      applicableTotal += price * qty;
      matchedItems += 1;
    
    }

    if (applicableTotal <= 0) {
     
      return res.status(400).json({ msg: 'Promo code not applicable to these items' });
    }

    let discount = 0;
    if (promo.type === 'percentage') {
      discount = applicableTotal * (promo.value / 100);
    } else {
      discount = Math.min(promo.value, applicableTotal);
    }

    res.json({
      valid: true,
      discount,
      applicableTotal,
      promo: {
        code: promo.code,
        scope: promo.scope,
        type: promo.type,
        value: promo.value,
        seller: promo.seller,
        products: promo.products,
        categories: promo.categories,
      },
    });
  } catch (err: any) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};
