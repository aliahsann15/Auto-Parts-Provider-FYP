import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User, { IUser, ICards, IBankAccount } from "../models/User";
import { AuthRequest } from "../middleware/authMiddleware";

// // Create a new user (register / admin create)
// export async function createUser(req: Request, res: Response) {
//   try {
//     const {
//       name,
//       email,
//       password,
//       role = "Buyer",
//       isEmailVerified,
//       emailVerificationCode,
//       // seller/buyer optional fields
//       cnic,
//       businessName,
//       businessType,
//       licenseNumber,
//       bankAccountNumber,
//       accountTitle,
//       branchCode,
//       cnicImages,
//       interests,
//       googleId,
//       profileImage,
//     } = req.body as Partial<IUser> & { password?: string };

//     if (!name || !email) {
//       return res.status(400).json({ success: false, message: "Name and email are required" });
//     }

//     const existing = await User.findOne({ email });
//     if (existing) {
//       return res.status(409).json({ success: false, message: "Email already in use" });
//     }

//     let hashed: string | undefined;
//     if (password) {
//       const salt = await bcrypt.genSalt(10);
//       hashed = await bcrypt.hash(password, salt);
//     }

//     const user = new User({
//       name,
//       email,
//       password: hashed,
//       role,
//       isEmailVerified,
//       emailVerificationCode,
//       cnic,
//       businessName,
//       businessType,
//       licenseNumber,
//       bankAccountNumber,
//       accountTitle,
//       branchCode,
//       cnicImages,
//       interests,
//       googleId,
//       profileImage,
//     });

//     await user.save();

//     const u = user.toObject();
//     delete (u as any).password;

//     return res.status(201).json({ success: true, user: u });
//   } catch (err) {
//     console.error("createUser error:", err);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// }

// Get single user by id
export async function getUser(req: Request, res: Response): Promise<any> {
  try {
    const { id } = req.params;
    const authUser = (req as any).user;
    const asSeller = String(req.query.asSeller ?? '').toLowerCase();
    const actAsSeller =
      (authUser?.role === 'StoreManager' && authUser?.sellerId) &&
      (asSeller === 'true' || asSeller === '1' || asSeller === 'seller');

    let userId = id === 'me' || !id ? authUser?.userId : id;
    // Only swap to the assigned seller when explicitly requested.
    if (actAsSeller) {
      userId = authUser.sellerId;
    }
    
    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    delete (user as any).password;
    return res.json({
      success: true,
      user,
      assignedSellerId: authUser?.role === 'StoreManager' ? authUser?.sellerId : undefined,
    });
  } catch (err) {
    console.error("getUser error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// // List users with optional filters (pagination)
// export async function getUsers(req: Request, res: Response) {
//   try {
//     const { page = "1", limit = "20", role, q } = req.query;
//     const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
//     const limitNum = Math.max(1, parseInt(String(limit), 10) || 20);
//     const skip = (pageNum - 1) * limitNum;

//     const filter: any = {};
//     if (role) filter.role = role;
//     if (q) filter.$or = [
//       { name: { $regex: String(q), $options: "i" } },
//       { email: { $regex: String(q), $options: "i" } },
//     ];

//     const [items, total] = await Promise.all([
//       User.find(filter).skip(skip).limit(limitNum).sort({ createdAt: -1 }).lean(),
//       User.countDocuments(filter),
//     ]);

//     // remove passwords
//     const users = items.map(u => {
//       delete (u as any).password;
//       return u;
//     });

//     return res.json({ success: true, users, total, page: pageNum, limit: limitNum });
//   } catch (err) {
//     console.error("getUsers error:", err);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// }

// Update user by id
export async function updateUser(req: Request, res: Response): Promise<any> {
  try {
    const { id } = req.params;
    const authUser = (req as any).user;
    const asSeller = String(req.query.asSeller ?? '').toLowerCase();
    const actAsSeller =
      (authUser?.role === 'StoreManager' && authUser?.sellerId) &&
      (asSeller === 'true' || asSeller === '1' || asSeller === 'seller');

    let userId = id === 'me' || !id ? authUser?.userId : id;
    // Only switch to the assigned seller when explicitly requested.
    if (actAsSeller) {
      userId = authUser.sellerId;
    }
    
    const update = { ...req.body } as Partial<IUser & { password?: string }>;

    // Normalize arrays/records for store settings
    if (update.sectionsVisibility && typeof update.sectionsVisibility === 'string') {
      try { update.sectionsVisibility = JSON.parse(update.sectionsVisibility as any); } catch {}
    }
    if (update.sectionsOrder && typeof update.sectionsOrder === 'string') {
      try { update.sectionsOrder = JSON.parse(update.sectionsOrder as any); } catch {}
    }
    if (update.featuredProductIds && typeof update.featuredProductIds === 'string') {
      try { update.featuredProductIds = JSON.parse(update.featuredProductIds as any); } catch {}
    }
    if (update.saleProductIds && typeof update.saleProductIds === 'string') {
      try { update.saleProductIds = JSON.parse(update.saleProductIds as any); } catch {}
    }
    if (update.storeBanners && typeof update.storeBanners === 'string') {
      try { update.storeBanners = JSON.parse(update.storeBanners as any); } catch {}
    }
    if (update.storeSalesBanners && typeof update.storeSalesBanners === 'string') {
      try { update.storeSalesBanners = JSON.parse(update.storeSalesBanners as any); } catch {}
    }
    const normalizeStringArray = (value: any): string[] | undefined => {
      if (value === undefined) return undefined
      if (Array.isArray(value)) return value.map(v => String(v)).filter(Boolean)
      if (typeof value === 'string') {
        return value.split(',').map(v => v.trim()).filter(Boolean)
      }
      return []
    }
    const normalizedMakes = normalizeStringArray((update as any).sellerMakes)
    const normalizedCategories = normalizeStringArray((update as any).sellerCategories)
    if (normalizedMakes !== undefined) (update as any).sellerMakes = normalizedMakes
    if (normalizedCategories !== undefined) (update as any).sellerCategories = normalizedCategories

    // If password provided, hash it
    if (update.password) {
      const salt = await bcrypt.genSalt(10);
      update.password = await bcrypt.hash(update.password, salt);
    }

    const user = await User.findByIdAndUpdate(userId, update, { new: true, runValidators: true }).lean();
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    delete (user as any).password;
    return res.json({ success: true, user });
  } catch (err) {
    console.error("updateUser error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// Delete user by id
export async function deleteUser(req: Request, res: Response): Promise<any> {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id).lean();
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    return res.json({ success: true, message: "User deleted" });
  } catch (err) {
    console.error("deleteUser error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// Change user password
export async function changeUserPassword(req: Request, res: Response): Promise<any> {
  try {
    const { id } = req.params;
    const { oldPassword, newPassword } = req.body as { oldPassword: string; newPassword: string };
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    const isMatch = await bcrypt.compare(oldPassword, user.password || "");
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Old password is incorrect" });
    }
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    return res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    console.error("changeUserPassword error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/*
  Add a new card to user's cards array.
  Expects card payload in req.body matching backend ICards fields.
  If card.default === true, will unset default on other cards.
*/
export async function addCard(req: Request, res: Response): Promise<any> {
  try {
    const { id } = req.params;
    const card = req.body as Partial<ICards>;

    if (!card) {
      return res.status(400).json({ success: false, message: "Card data is required" });
    }

    // minimal validation: require last4 or token or providerCardId
    if (!card.last4 && !card.token && !card.providerCardId) {
      return res.status(400).json({ success: false, message: "Provide last4 or token or providerCardId" });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // if incoming card is marked default, unset other defaults
    if (card.default) {
      if (Array.isArray(user.cards)) {
        user.cards.forEach((c: any) => { c.default = false });
      }
    }

    // push new card
    user.cards = user.cards ?? [];
    user.cards.push(card as any);

    await user.save();

    const updated = (await User.findById(id).lean()) as any;
    delete (updated as any).password;
    return res.json({ success: true, cards: updated.cards, user: updated });
  } catch (err) {
    console.error("addCard error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/*
  Remove a card from user's cards array.
  :cardId may be providerCardId, token, or the subdocument _id.
*/
export async function removeCard(req: Request, res: Response): Promise<any> {
  try {
    const { id, cardId } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // try to remove by providerCardId, token or subdocument _id
    const before = (user.cards ?? []).length;
    user.cards = (user.cards ?? []).filter((c: any) => {
      const cid = String(cardId);
      // compare providerCardId or token or _id
      if (c.providerCardId && String(c.providerCardId) === cid) return false;
      if (c.token && String(c.token) === cid) return false;
      if (c._id && String(c._id) === cid) return false;
      return true;
    });

    const after = (user.cards ?? []).length;
    if (before === after) {
      return res.status(404).json({ success: false, message: "Card not found" });
    }

    // if no default card remains, optionally set first card as default (preserve existing behavior)
    if ((user.cards ?? []).every((c: any) => !c.default) && (user.cards ?? []).length > 0) {
      (user.cards as any)[0].default = true;
    }

    await user.save();

    const updated = (await User.findById(id).lean()) as any;
    delete (updated as any).password;
    return res.json({ success: true, cards: updated.cards, user: updated });
  } catch (err) {
    console.error("removeCard error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

const sanitizeBankAccount = (acc: any) => ({
  _id: acc?._id,
  id: acc?._id,
  bankName: acc?.bankName,
  bankCode: acc?.bankCode,
  branchCode: acc?.branchCode,
  isIban: !!acc?.isIban,
  last4: acc?.last4 || String(acc?.accountNumber || '').slice(-4),
  isDefault: !!acc?.isDefault,
  accountTitle: acc?.accountTitle,
});

const isPkIban = (val: string) => /^PK\d{2}[A-Z0-9]{20}$/i.test(val);
const isAccountNumber = (val: string) => /^\d{8,24}$/.test(val);

export async function listBankAccounts(req: AuthRequest, res: Response): Promise<any> {
  try {
    const { id } = req.params;
    if (!req.user || (req.user.userId !== id && req.user.role !== 'SuperAdmin' && req.user.role !== 'SubAdmin')) {
      return res.status(403).json({ msg: 'Not authorized' });
    }
    const user = await User.findById(id).select('bankAccounts').lean();
    if (!user) return res.status(404).json({ msg: 'User not found' });
    const accounts = (user.bankAccounts || []).map(sanitizeBankAccount);
    return res.json({ accounts });
  } catch (err) {
    console.error('listBankAccounts error:', err);
    return res.status(500).json({ msg: 'Server error' });
  }
}

export async function addBankAccount(req: AuthRequest, res: Response): Promise<any> {
  try {
    const { id } = req.params;
    if (!req.user || (req.user.userId !== id && req.user.role !== 'SuperAdmin' && req.user.role !== 'SubAdmin')) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    const { bankName, bankCode, accountNumber, branchCode, isDefault, accountTitle } = req.body as Partial<IBankAccount>;
    const trimmedNumber = (accountNumber || '').replace(/\s+/g, '').toUpperCase();

    if (!bankName || !trimmedNumber) {
      return res.status(400).json({ msg: 'Bank name and account/IBAN are required' });
    }

    const accountIsIban = isPkIban(trimmedNumber);
    const accountIsNumber = isAccountNumber(trimmedNumber);
    if (!accountIsIban && !accountIsNumber) {
      return res.status(400).json({ msg: 'Provide a valid Pakistan IBAN (PK...) or bank account number (digits only).' });
    }

    if (branchCode && !/^[0-9]{4,6}$/.test(String(branchCode))) {
      return res.status(400).json({ msg: 'Branch code must be 4-6 digits' });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    const newAcc: IBankAccount & { _id: mongoose.Types.ObjectId } = {
      _id: new mongoose.Types.ObjectId(),
      bankName: bankName.trim(),
      bankCode: bankCode?.trim(),
      accountNumber: trimmedNumber,
      branchCode: branchCode?.toString().trim(),
      isIban: accountIsIban,
      last4: trimmedNumber.slice(-4),
      isDefault: !!isDefault,
      accountTitle: accountTitle?.trim(),
    };

    user.bankAccounts = user.bankAccounts ?? [];
    if (newAcc.isDefault) {
      user.bankAccounts = user.bankAccounts.map(acc => ({ ...acc, isDefault: false })) as any;
    }
    user.bankAccounts?.push(newAcc);
    await user.save();

    const accounts = (user.bankAccounts || []).map(sanitizeBankAccount);
    return res.status(201).json({ account: sanitizeBankAccount(newAcc), accounts });
  } catch (err) {
    console.error('addBankAccount error:', err);
    return res.status(500).json({ msg: 'Server error' });
  }
}

export async function removeBankAccount(req: AuthRequest, res: Response): Promise<any> {
  try {
    const { id, accountId } = req.params;
    if (!req.user || (req.user.userId !== id && req.user.role !== 'SuperAdmin' && req.user.role !== 'SubAdmin')) {
      return res.status(403).json({ msg: 'Not authorized' });
    }
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    const before = (user.bankAccounts || []).length;
    user.bankAccounts = (user.bankAccounts || []).filter(acc => String(acc._id) !== String(accountId));
    if (user.bankAccounts.length === before) {
      return res.status(404).json({ msg: 'Account not found' });
    }
    await user.save();
    const accounts = (user.bankAccounts || []).map(sanitizeBankAccount);
    return res.json({ accounts, success: true });
  } catch (err) {
    console.error('removeBankAccount error:', err);
    return res.status(500).json({ msg: 'Server error' });
  }
}
