import { RequestHandler } from "express";
import Product, { IProduct } from "../models/Product";
import Review, { IReview } from "../models/Review";  
import mongoose, { Types } from "mongoose";
import Order from "../models/Order";
import Category, { ICategory } from "../models/Category";
import User, { IUser } from "../models/User";

type ReviewWithUser = {
  _id: Types.ObjectId;
  rating: number;
comment?: string;
  createdAt: Date;
  user: {
    _id: Types.ObjectId;
    name: string;
    profileImage?: string;
  };
};

export const publicGetProducts: RequestHandler = async (req, res, next) => {
  try {
    // 1️⃣ Read pagination params
    const pageParam = req.query.page as string | undefined;
    const limitParam = req.query.limit as string | undefined;
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const limit = limitParam ? parseInt(limitParam, 10) : 10;
    const skip = (page - 1) * limit;

    // Build query (supports filtering by make, q, categories, price range, seller)
    const query: any = {};
    const sellerParam = (req.query.seller as string) || (req.query.sellerId as string) || undefined;
    if (sellerParam && Types.ObjectId.isValid(sellerParam)) {
      query.seller = new Types.ObjectId(sellerParam);
    }
    const makeQuery = req.query.make as string | undefined;
    if (makeQuery) {
      const parts = makeQuery.split(',').map(s => s.trim()).filter(Boolean);
      const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
      if (parts.length > 1) {
        query.make = { $in: parts.map(p => new RegExp(`^${escapeRegExp(p)}$`, 'i')) };
      } else {
        query.make = { $regex: `^${escapeRegExp(parts[0])}$`, $options: 'i' };
      }
    }
    const carModelQuery = req.query.carModel as string | undefined;
    if (carModelQuery) {
      const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
      query.carModel = { $regex: escapeRegExp(carModelQuery), $options: 'i' };
    }
    const variantQuery = req.query.variant as string | undefined;
    if (variantQuery) {
      const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
      query.variant = { $regex: escapeRegExp(variantQuery), $options: 'i' };
    }

    const q = (req.query.q as string) || (req.query.search as string) || undefined;
    if (q) {
      const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
      const regex = { $regex: escapeRegExp(q), $options: 'i' };
      query.$or = [
        { name: regex },
        { description: regex },
        { make: regex },
        { carModel: regex },
        { variant: regex },
      ];
    }

    const categoriesRaw = req.query.categories as string | undefined;
    if (categoriesRaw) {
      const catParts = categoriesRaw.split(',').map(s => s.trim()).filter(Boolean);
      const catObjIds = catParts.filter(p => Types.ObjectId.isValid(p)).map(p => new Types.ObjectId(p));
      if (catObjIds.length) {
        query.categories = { $in: catObjIds };
      } else if (catParts.length) {
        query.categories = { $in: catParts };
      }
    }

    const minPriceRaw = req.query.minPrice as string | undefined;
    const maxPriceRaw = req.query.maxPrice as string | undefined;
    if (minPriceRaw || maxPriceRaw) {
      query.price = {};
      if (minPriceRaw) query.price.$gte = parseFloat(minPriceRaw as string) || 0;
      if (maxPriceRaw) query.price.$lte = parseFloat(maxPriceRaw as string) || Number.MAX_SAFE_INTEGER;
    }

    // sorting
    const sortParam = (req.query.sort as string) || undefined;
    let sortObj: any = { };
    if (sortParam && sortParam !== 'rating_asc' && sortParam !== 'rating_desc') {
      if (sortParam === 'price_asc') sortObj.price = 1;
      else if (sortParam === 'price_desc') sortObj.price = -1;
      else if (sortParam === 'newest') sortObj.createdAt = -1;
      else if (sortParam === 'popular') sortObj.createdAt = -1; // Default sort by newest
    }

    // 2️⃣ Build aggregation pipeline for efficient filtering/sorting with ratings
    const minRatingRaw = req.query.minRating as string | undefined;
    const maxRatingRaw = req.query.maxRating as string | undefined;
    const minRatingParsed = minRatingRaw !== undefined ? parseFloat(minRatingRaw) : undefined;
    const maxRatingParsed = maxRatingRaw !== undefined ? parseFloat(maxRatingRaw) : undefined;
    const minRating = Number.isFinite(minRatingParsed) ? minRatingParsed : undefined;
    const maxRating = Number.isFinite(maxRatingParsed) ? maxRatingParsed : undefined;
    const useAggregation = sortParam === 'rating_desc' || sortParam === 'rating_asc' || minRating !== undefined || maxRating !== undefined;

    if (useAggregation) {
      // Use aggregation pipeline for rating-based filtering and sorting
      const pipeline: any[] = [
        { $match: query },
        {
          $lookup: {
            from: 'reviews',
            localField: '_id',
            foreignField: 'product',
            as: 'reviews',
          },
        },
        {
          $addFields: {
            avgRating: {
              $cond: [
                { $gt: [{ $size: '$reviews' }, 0] },
                { $avg: '$reviews.rating' },
                { $ifNull: ['$averageRating', 0] },
              ],
            },
            totalReviewsComputed: {
              $cond: [
                { $gt: [{ $size: '$reviews' }, 0] },
                { $size: '$reviews' },
                { $ifNull: ['$totalReviews', 0] },
              ],
            },
          },
        },
      ];

      // Filter by rating range if specified
      const ratingMatch: any = {};
      if (minRating !== undefined && !Number.isNaN(minRating)) ratingMatch.$gte = minRating;
      if (maxRating !== undefined && !Number.isNaN(maxRating)) ratingMatch.$lte = maxRating;
      if (Object.keys(ratingMatch).length) {
        pipeline.push({ $match: { avgRating: ratingMatch } });
      }

      // Sort by rating or other criteria
      const sortStage: any = {};
      if (sortParam === 'rating_desc') {
        sortStage.avgRating = -1;
      } else if (sortParam === 'rating_asc') {
        sortStage.avgRating = 1;
      } else if (sortParam === 'price_asc') {
        sortStage.price = 1;
      } else if (sortParam === 'price_desc') {
        sortStage.price = -1;
      } else if (sortParam === 'newest' || sortParam === 'popular') {
        sortStage.createdAt = -1;
      }
      if (Object.keys(sortStage).length > 0) {
        pipeline.push({ $sort: sortStage });
      }

      // Count total for pagination
      const countPipeline = [...pipeline];
      const countResult = await Product.aggregate(countPipeline.concat([{ $count: 'total' }])).exec();
      const total = countResult[0]?.total || 0;

      // Pagination
      pipeline.push({ $skip: skip }, { $limit: limit });

      // Fetch products
      const products = await Product.aggregate(pipeline).exec();

      // Fetch seller info
      const sellerIdStrs = Array.from(
        new Set(products.map(p => p.seller.toString()))
      );
      const sellerObjIds = sellerIdStrs.map(id => new Types.ObjectId(id));
      const sellersRaw = (await User.find(
        { _id: { $in: sellerObjIds } },
        { name: 1, profileImage: 1 }
      )
        .lean()
        .exec()) as Pick<IUser, '_id' | 'name' | 'profileImage'>[];

      const sellersById: Record<string, { name: string; profileImage?: string }> = {};
      sellersRaw.forEach(u => {
        sellersById[u._id.toString()] = {
          name: u.name,
          profileImage: u.profileImage || '',
        };
      });

      // Assemble response
      // Map basic product data
      const productsWithExtras = products.map(p => {
        const sid = p.seller.toString();
        const seller = sellersById[sid] || { name: 'Unknown', profileImage: '' };
        const idStr = (p as any)._id?.toString ? (p as any)._id.toString() : String((p as any)._id);
        return {
          ...p,
          _id: idStr,
          id: idStr,
          reviews: p.reviews || [],
          sellerId: sid,
          sellerName: seller.name,
          sellerImage: seller.profileImage,
        };
      });

      // Populate review users
      const reviewUserIds = Array.from(
        new Set(
          productsWithExtras.flatMap(p =>
            (p.reviews || []).map((r: any) => r?.user).filter((id: any) => id && Types.ObjectId.isValid(id.toString()))
          )
        )
      ).map(id => new Types.ObjectId(id));

      const reviewUsers = reviewUserIds.length
        ? await User.find({ _id: { $in: reviewUserIds } }, { name: 1, profileImage: 1 }).lean()
        : [];
      const reviewUsersById: Record<string, { name: string; profileImage?: string }> = {};
      reviewUsers.forEach(u => { reviewUsersById[u._id.toString()] = { name: u.name, profileImage: u.profileImage || '' }; });

      const productsWithReviewUsers = productsWithExtras.map(p => ({
        ...p,
        reviews: (p.reviews || []).map((r: any) => {
          const u = r?.user ? reviewUsersById[r.user.toString()] : undefined;
          return u ? { ...r, user: { _id: r.user, name: u.name, profileImage: u.profileImage } } : r;
        })
      }));

      const totalPages = Math.ceil(total / limit);
      res.json({
        products: productsWithReviewUsers,
        pagination: { page, limit, total, totalPages },
      });
      return;
    }

    // Fallback: Standard query without aggregation (for simple filters)
    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    // Fetch reviews
    const productIds = products.map(p => p._id).filter(id => Types.ObjectId.isValid(String(id))).map(id => new Types.ObjectId(String(id)));
    const reviews = productIds.length
      ? (await Review.find({ product: { $in: productIds } })
          .lean()
          .exec()) as IReview[]
      : [];

    // Fetch items sold per product from orders
    const soldByProduct: Record<string, number> = {};
    if (productIds.length) {
      const soldAgg = await Order.aggregate<{ _id: Types.ObjectId; totalSold: number }>([
        { $match: { "items.product": { $in: productIds } } },
        { $unwind: "$items" },
        { $match: { "items.product": { $in: productIds } } },
        { $group: { _id: "$items.product", totalSold: { $sum: "$items.quantity" } } },
      ]).exec();
      soldAgg.forEach(row => {
        soldByProduct[row._id.toString()] = row.totalSold || 0;
      });
    }

    // Fetch review users
    const reviewUserIds = Array.from(
      new Set(
        reviews
          .map(r => r.user)
          .filter(id => id && Types.ObjectId.isValid(id.toString()))
          .map(id => id!.toString())
      )
    ).map(id => new Types.ObjectId(id));
    const reviewUsers = reviewUserIds.length
      ? await User.find({ _id: { $in: reviewUserIds } }, { name: 1, profileImage: 1 }).lean()
      : [];
    const reviewUsersById: Record<string, { name: string; profileImage?: string }> = {};
    reviewUsers.forEach(u => { reviewUsersById[u._id.toString()] = { name: u.name, profileImage: u.profileImage || '' }; });

    const reviewsByProduct: Record<string, any[]> = {};
    reviews.forEach(r => {
      const pid = r.product.toString();
      const user = r.user ? reviewUsersById[r.user.toString()] : undefined;
      const enriched = user ? { ...r, user: { _id: r.user, name: user.name, profileImage: user.profileImage } } : r;
      if (!reviewsByProduct[pid]) reviewsByProduct[pid] = [];
      reviewsByProduct[pid].push(enriched);
    });

    // Fetch seller info
    const sellerIdStrs = Array.from(
      new Set(products.map(p => p.seller.toString()))
    );
    const sellerObjIds = sellerIdStrs.map(id => new Types.ObjectId(id));
    const sellersRaw = (await User.find(
      { _id: { $in: sellerObjIds } },
      { name: 1, profileImage: 1 }
    )
      .lean()
      .exec()) as Pick<IUser, '_id' | 'name' | 'profileImage'>[];

    const sellersById: Record<string, { name: string; profileImage?: string }> = {};
    sellersRaw.forEach(u => {
      sellersById[u._id.toString()] = {
        name: u.name,
        profileImage: u.profileImage || '',
      };
    });

    // Assemble response
    const productsWithExtras = products.map(p => {
      const pid = p._id.toString();
      const sid = p.seller.toString();
      const seller = sellersById[sid] || { name: 'Unknown', profileImage: '' };

      return {
        ...p,
        _id: pid,
        id: pid,
        reviews: reviewsByProduct[pid] || [],
        sellerId: sid,
        sellerName: seller.name,
        sellerImage: seller.profileImage,
        itemsSold: soldByProduct[pid] ?? 0,
      };
    });

    const totalPages = Math.ceil(total / limit);
    res.json({
      products: productsWithExtras,
      pagination: { page, limit, total, totalPages },
    });
  } catch (err) {
    next(err);
  }
};


export const publicGetProduct: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate product ID
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid product ID" });
      return;
    }

    // 1️⃣ Fetch product
    const rawProd = await Product.findById(id)
      .lean<IProduct>()
      .exec();
    if (!rawProd) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    // 2️⃣ Resolve category names
    let categoriesWithIds: { id: any; name: string }[] = [];
    if (Array.isArray(rawProd.categories) && rawProd.categories.length) {
      const validCatIds = rawProd.categories
        .map(c => (typeof c === 'string' ? c.trim() : String(c)))
        .filter(c => Types.ObjectId.isValid(c))
        .map(c => new Types.ObjectId(c));

      if (validCatIds.length) {
        const catsRaw = await Category.find(
          { _id: { $in: validCatIds } },
          { name: 1 }
        )
          .lean()
          .exec() as unknown as ICategory[];
        categoriesWithIds = catsRaw.map(c => ({ id: c._id, name: c.name }));
      }
    }

    // 3️⃣ Fetch reviews with user info
    const reviewsRaw = await Review.find({ product: id })
      .populate<{ user: IUser }>("user", "name profileImage")
      .lean()
      .exec() as unknown as ReviewWithUser[];
    const reviews = reviewsRaw.map(r => ({
      id:         r._id.toString(),
      rating:     r.rating,
      comment:    r.comment || "",
      createdAt:  r.createdAt.toISOString(),
      userId:     r.user._id.toString(),
      userName:   r.user.name,
      userImage:  r.user.profileImage || ""
    }));

    // 4️⃣ Compute items sold
    const soldAgg = await Order.aggregate<{ _id: null; totalSold: number }>([
      { $match: { "items.product": new Types.ObjectId(id) } },
      { $unwind: "$items" },
      { $match: { "items.product": new Types.ObjectId(id) } },
      { $group: { _id: null, totalSold: { $sum: "$items.quantity" } } }
    ]).exec();
    const itemsSold = soldAgg[0]?.totalSold ?? 0;

    // 5️⃣ Fetch seller details with image
    const sellerRaw = await User.findById(rawProd.seller, { name: 1, profileImage: 1 })
      .lean()
      .exec() as unknown as Pick<IUser, "_id" | "name" | "profileImage"> | null;
    const sellerId    = sellerRaw?._id?.toString() || (rawProd.seller as any)?.toString?.() || "";
    const sellerName  = sellerRaw?.name || "Unknown";
    const sellerImage = sellerRaw?.profileImage || "";

    // 6️⃣ Build and return
    const { categories, seller, ...rest } = rawProd;
    res.json({
      product: {
        ...rest,
        categories: categoriesWithIds,
        sellerId,
        sellerName,
        sellerImage,
        reviews,
        itemsSold,
      }
    });
  } catch (err) {
    next(err);
  }
};
// /api/public/products/related

export const publicGetRelatedProducts: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    // 1️⃣ Parse & normalize query params
    const rawCategoryIds = req.query.categoryIds;
    const rawExcludeId   = req.query.excludeId;

    let categoryIdsArray: string[] = [];
    if (typeof rawCategoryIds === "string") {
      categoryIdsArray = rawCategoryIds.split(",").map(s => s.trim()).filter(Boolean);
    } else if (Array.isArray(rawCategoryIds)) {
      categoryIdsArray = rawCategoryIds.map(v => String(v).trim()).filter(Boolean);
    }

    // Convert to ObjectId[]
    const cats = categoryIdsArray
      .filter(id => Types.ObjectId.isValid(id))
      .map(id => new Types.ObjectId(id));

    if (cats.length === 0) {
       res.json({ products: [] });
    }

    // 2️⃣ Build & run product query
    const query: any = { categories: { $in: cats } };
    if (typeof rawExcludeId === "string" && Types.ObjectId.isValid(rawExcludeId)) {
      query._id = { $ne: new Types.ObjectId(rawExcludeId) };
    }

    const products = await Product.find(query)
      .limit(10)
      .lean()
      .exec();

    if (products.length === 0) {
       res.json({ products: [] });
    }

    // 3️⃣ Fetch all unique sellers for these products
    const sellerIdStrs = Array.from(
      new Set(products.map(p => p.seller.toString()))
    ).filter(id => Types.ObjectId.isValid(id));
    const sellerObjIds = sellerIdStrs.map(id => new Types.ObjectId(id));

    const sellersRaw = await User.find(
      { _id: { $in: sellerObjIds } },
      { name: 1, profileImage: 1 }
    )
      .lean<Pick<IUser, "_id" | "name" | "profileImage">[]>()
      .exec();

    const sellersById: Record<string, { name: string; profileImage?: string }> = {};
    sellersRaw.forEach(u => {
      sellersById[u._id.toString()] = {
        name: u.name,
        profileImage: u.profileImage || "",
      };
    });

    // 4️⃣ Merge seller info into each product
    const relatedWithSeller = products.map(p => {
      const sid = p.seller.toString();
      const seller = sellersById[sid] || { name: "Unknown", profileImage: "" };
      return {
        ...p,
        sellerId: sid,
        sellerName: seller.name,
        sellerImage: seller.profileImage,
      };
    });

    // 5️⃣ Return
    res.json({ products: relatedWithSeller });
  } catch (err) {
    next(err);
  }
};
