import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { FlattenMaps, Types } from 'mongoose';
import Store, { IStore } from '../models/Store';
import User from '../models/User';

type LeanStore = FlattenMaps<IStore> & { _id: Types.ObjectId };

export async function getMyStore(req: Request, res: Response) {
  try {
    const auth = (req as any)?.user;
    const userId = auth?.role === 'StoreManager' && auth?.sellerId ? auth.sellerId : auth?.userId;
    if (!userId) return res.status(401).json({ msg: 'Unauthorized' });

    let store: LeanStore | null = await Store.findOne({ user: userId }).lean<LeanStore>();
    if (!store) {
      // create a minimal placeholder using user name as storeName
      const user = await User.findById(userId).lean();
      const created = await Store.create({
        user: userId,
        storeName: user?.businessName || user?.name || 'My Store',
        sectionsOrder: ['banner', 'salesBanner', 'featured', 'sale', 'best', 'reviews'],
        sectionsVisibility: { banner: true, salesBanner: true, featured: true, sale: true, best: true, reviews: true },
      });
      store = created.toObject() as LeanStore;
    }
    return res.json({ store });
  } catch (err) {
    console.error('getMyStore error', err);
    return res.status(500).json({ msg: 'Server error' });
  }
}

export async function getStoreById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const store = await Store.findById(id).lean();
    if (!store) return res.status(404).json({ msg: 'Store not found' });
    return res.json({ store });
  } catch (err) {
    console.error('getStoreById error', err);
    return res.status(500).json({ msg: 'Server error' });
  }
}

export async function getStoreBySellerId(req: Request, res: Response) {
  try {
    const { sellerId } = req.params;
    if (!sellerId || !Types.ObjectId.isValid(sellerId)) {
      return res.status(400).json({ msg: 'Invalid seller id' });
    }
    const store = await Store.findOne({ user: sellerId }).lean();
    if (!store) return res.status(404).json({ msg: 'Store not found' });
    return res.json({ store });
  } catch (err) {
    console.error('getStoreBySellerId error', err);
    return res.status(500).json({ msg: 'Server error' });
  }
}

export async function upsertMyStore(req: Request, res: Response) {
  try {
    const auth = (req as any)?.user;
    const userId = auth?.role === 'StoreManager' && auth?.sellerId ? auth.sellerId : auth?.userId;
    if (!userId) return res.status(401).json({ msg: 'Unauthorized' });

    const body = { ...req.body } as Partial<IStore>;
    const parseJSON = (key: keyof IStore) => {
      const val = body[key];
      if (typeof val === 'string') {
        try {
          body[key] = JSON.parse(val as any);
        } catch {
          // ignore parse errors, leave as string
        }
      }
    };
    parseJSON('sectionsOrder');
    parseJSON('sectionsVisibility');
    parseJSON('featuredProductIds');
    parseJSON('saleProductIds');
    parseJSON('storeBanners');
    parseJSON('storeSalesBanners');
    parseJSON('addresses');

    const update: any = {
      ...body,
      user: userId,
    };

    const store = await Store.findOneAndUpdate(
      { user: userId },
      { $set: update },
      { new: true, upsert: true }
    ).lean();

    return res.json({ store });
  } catch (err) {
    console.error('upsertMyStore error', err);
    return res.status(500).json({ msg: 'Server error' });
  }
}

// List managers of authenticated seller's store
export async function listStoreManagers(req: Request, res: Response) {
  try {
    const sellerId = (req as any)?.user?.userId;
    if (!sellerId) return res.status(401).json({ msg: 'Unauthorized' });

    const store = await Store.findOne({ user: sellerId }).populate('managers', 'name email profileImage role').lean();
    if (!store) return res.status(404).json({ msg: 'Store not found' });

    const managers = (store.managers || []).map((m: any) => ({
      id: m._id?.toString?.() || m.id,
      name: m.name,
      email: m.email,
      role: m.role,
      profileImage: m.profileImage,
    }));

    return res.json({ managers });
  } catch (err) {
    console.error('listStoreManagers error', err);
    return res.status(500).json({ msg: 'Server error' });
  }
}

// Update an existing manager in the store
export async function updateStoreManager(req: Request, res: Response) {
  try {
    const sellerId = (req as any)?.user?.userId;
    if (!sellerId) return res.status(401).json({ msg: 'Unauthorized' });
    const { id } = req.params;
    const { name, email, password, profileImage } = req.body as { name?: string; email?: string; password?: string; profileImage?: string };

    const store = await Store.findOne({ user: sellerId });
    if (!store) return res.status(404).json({ msg: 'Store not found' });
    if (!store.managers?.some(m => m.toString() === id)) return res.status(404).json({ msg: 'Manager not in store' });

    const update: any = {};
    if (name) update.name = name;
    if (email) update.email = email.toLowerCase();
    if (profileImage) update.profileImage = profileImage;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      update.password = await bcrypt.hash(password, salt);
    }

    const manager = await User.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
    if (!manager) return res.status(404).json({ msg: 'Manager not found' });

    const safeUser = {
      id: manager._id.toString(),
      name: manager.name,
      email: manager.email,
      role: manager.role,
      profileImage: manager.profileImage,
    };

    return res.json({ manager: safeUser });
  } catch (err) {
    console.error('updateStoreManager error', err);
    return res.status(500).json({ msg: 'Server error' });
  }
}

// Remove manager from store and optionally delete user
export async function removeStoreManager(req: Request, res: Response) {
  try {
    const sellerId = (req as any)?.user?.userId;
    if (!sellerId) return res.status(401).json({ msg: 'Unauthorized' });
    const { id } = req.params;

    const store = await Store.findOne({ user: sellerId });
    if (!store) return res.status(404).json({ msg: 'Store not found' });

    const before = store.managers?.length || 0;
    store.managers = (store.managers || []).filter(m => m.toString() !== id);
    const after = store.managers.length;
    await store.save();

    // Delete the manager user from the database
    await User.findByIdAndDelete(id);

    return res.json({ removed: before !== after });
  } catch (err) {
    console.error('removeStoreManager error', err);
    return res.status(500).json({ msg: 'Server error' });
  }
}

// Create or attach a Store Manager to the authenticated seller's store
export async function addStoreManager(req: Request, res: Response) {
  try {
    const sellerId = (req as any)?.user?.userId;
    if (!sellerId) return res.status(401).json({ msg: 'Unauthorized' });

    const { name, email, password, profileImage } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      profileImage?: string;
    };

    if (!name || !email || !password) {
      return res.status(400).json({ msg: 'Name, email and password are required' });
    }

    const normalizedEmail = email.toLowerCase();

    // Ensure the seller has a store
    let store = await Store.findOne({ user: sellerId });
    if (!store) {
      const seller = await User.findById(sellerId).lean();
      store = await Store.create({
        user: sellerId,
        storeName: seller?.businessName || seller?.name || 'My Store',
      });
    }

    // Check for existing user by email
    let manager = await User.findOne({ email: normalizedEmail });
    if (manager) {
      if (manager.role !== 'StoreManager') {
        return res.status(400).json({ msg: 'Email already in use by a non-manager account' });
      }
    } else {
      // Create new manager user
      const salt = await bcrypt.genSalt(10);
      const hashPassword = await bcrypt.hash(password, salt);

      manager = await User.create({
        name,
        email: normalizedEmail,
        password: hashPassword,
        role: 'StoreManager',
        isEmailVerified: false,
        profileImage: profileImage || undefined,
        assignedSeller: sellerId,
      });
    }

    // Attach to store.managers if not already present
    const managerId = manager._id;
    if (!store.managers?.some((m) => m.toString() === managerId.toString())) {
      store.managers = store.managers || [];
      store.managers.push(managerId);
      await store.save();
    }

    const safeUser = {
      id: manager._id.toString(),
      name: manager.name,
      email: manager.email,
      role: manager.role,
      profileImage: manager.profileImage,
    };

    return res.status(201).json({ manager: safeUser, storeId: store._id });
  } catch (err) {
    console.error('addStoreManager error', err);
    return res.status(500).json({ msg: 'Server error' });
  }
}
