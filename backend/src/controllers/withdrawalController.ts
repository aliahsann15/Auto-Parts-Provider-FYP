import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Withdrawal from '../models/Withdrawal';
import Store from '../models/Store';
import User, { IUser } from '../models/User';
import { AuthRequest } from '../middleware/authMiddleware';
import Order from '../models/Order';
import Product from '../models/Product';
import { createNotification } from '../utils/notificationService';
import { sendMail } from '../utils/mailer';
import { generateWithdrawalReceiptPdf } from '../utils/withdrawalReceipt';
import ReturnModel from '../models/Return';

const WITHDRAWAL_THRESHOLD = 5000;
const RETURN_DEDUCTION_PATTERN = { note: { $regex: '^Return ', $options: 'i' } };

const DEFAULT_STORE_SECTIONS = ['banner', 'salesBanner', 'featured', 'sale', 'best', 'reviews'];
const DEFAULT_STORE_VISIBILITY = {
  banner: true,
  salesBanner: true,
  featured: true,
  sale: true,
  best: true,
  reviews: true,
};

const ensureStoreBalanceRecord = async (sellerId: string, balance: number) => {
  const existing = await Store.findOneAndUpdate(
    { user: sellerId },
    { $set: { currentBalance: balance } },
    { new: true }
  );
  if (existing) return existing;
  const user = await User.findById(sellerId).lean();
  return Store.create({
    user: sellerId,
    storeName: user?.businessName || user?.name || 'My Store',
    sectionsOrder: DEFAULT_STORE_SECTIONS,
    sectionsVisibility: DEFAULT_STORE_VISIBILITY,
    currentBalance: balance,
  });
};

const calculateSellerBalanceMetrics = async (sellerId: string) => {
  if (!mongoose.Types.ObjectId.isValid(sellerId)) {
    throw new Error('Invalid seller id');
  }
  const sellerObjectId = new mongoose.Types.ObjectId(sellerId);
  const earnings = await computeSellerEarnings(sellerId);

  const byStatus = await Withdrawal.aggregate([
    {
      $match: {
        seller: sellerObjectId,
        $nor: [RETURN_DEDUCTION_PATTERN],
      },
    },
    { $group: { _id: '$status', total: { $sum: '$amount' } } },
  ]);
  const map: Record<string, number> = Object.fromEntries(byStatus.map((d: any) => [d._id, d.total]));
  const completedTotal = map['completed'] || 0;
  const pendingTotal = map['pending'] || 0;

  const deductionAgg = await Withdrawal.aggregate([
    {
      $match: {
        seller: sellerObjectId,
        status: 'completed',
        note: { $regex: '^Return ', $options: 'i' },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
      },
    },
  ]);
  const deductionAmount = deductionAgg[0]?.total || 0;

  const otherWithdrawals = completedTotal + pendingTotal;
  const availableBeforeReturns = Math.max(0, earnings - otherWithdrawals);
  const actualBalance = availableBeforeReturns - deductionAmount;
  const withdrawableBalance = Math.max(0, actualBalance);
  const availableBalance = actualBalance;
  const returnDebt = Math.max(0, -actualBalance);

  return {
    availableBalance,
    storeBalance: actualBalance,
    withdrawableBalance,
    pendingTotal,
    completedTotal,
    deductionAmount,
    returnDebt,
    totalRequested: otherWithdrawals + deductionAmount,
    totalEarnings: earnings,
  };
};

export const refreshStoreBalance = async (sellerId: string) => {
  const summary = await calculateSellerBalanceMetrics(sellerId);
  await ensureStoreBalanceRecord(sellerId, summary.storeBalance);
  return summary;
};

const generateReferenceCode = async () => {
  while (true) {
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const exists = await Withdrawal.exists({ reference: code })
    if (!exists) return code
  }
}

const computeSellerEarnings = async (sellerId: string) => {
  const sellerProducts = await Product.find({ seller: sellerId }).select('_id seller').lean();
  const sellerProductIds = sellerProducts.map(p => p._id);

  const earningsAgg = await Order.aggregate([
    {
      $match: {
        status: 'delivered', // only count delivered orders
        $or: [
          { 'items.product': { $in: sellerProductIds } },
          { 'items.seller': sellerId },
          { 'items.productSnapshot.seller': sellerId },
        ],
      },
    },
    { $unwind: '$items' },
    {
      $match: {
        $or: [
          { 'items.product': { $in: sellerProductIds } },
          { 'items.seller': sellerId },
          { 'items.productSnapshot.seller': sellerId },
        ],
      },
    },
    {
      $group: {
        _id: '$_id',
        merchandiseTotal: {
          $sum: {
            $multiply: [
              { $ifNull: ['$items.salePrice', '$items.price'] },
              { $ifNull: ['$items.quantity', 1] },
            ],
          },
        },
        shippingFee: { $first: { $ifNull: ['$shippingFee', 0] } },
      },
    },
    {
      $project: {
        orderTotal: { $add: ['$merchandiseTotal', '$shippingFee'] },
      },
    },
    {
      $group: {
        _id: null,
        earnings: { $sum: '$orderTotal' },
      },
    },
  ]);

  const earnings = earningsAgg[0]?.earnings || 0;

  // Subtract approved/refunded returns
  let refundTotal = 0;
  try {
    const refunds = await ReturnModel.aggregate([
      { $match: { seller: new (require('mongoose').Types.ObjectId)(sellerId), status: { $in: ['approved','refunded'] } } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$refundAmount', 0] } } } },
    ]);
    refundTotal = refunds[0]?.total || 0;
  } catch (e) {
    refundTotal = 0;
  }

  return Math.max(0, earnings - refundTotal);
};

export const listWithdrawals = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ msg: 'Not authorized' });
    const history = await Withdrawal.find({ seller: req.user.userId }).sort({ createdAt: -1 }).lean();
    return res.json({ history });
  } catch (err: any) {
    return res.status(500).json({ msg: err?.message || 'Failed to fetch withdrawals' });
  }
};

export const requestWithdrawal = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ msg: 'Not authorized' });
    const { amount, currency = 'PKR' } = req.body as any;
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ msg: 'Amount is required' });
    }

    const summary = await calculateSellerBalanceMetrics(req.user.userId);
    const available = summary.availableBalance;

    if (Number(amount) < WITHDRAWAL_THRESHOLD) {
      return res.status(400).json({ msg: `Minimum withdrawal is PKR ${WITHDRAWAL_THRESHOLD}` });
    }
    if (Number(amount) > available) {
      return res.status(400).json({ msg: 'Requested amount exceeds available balance' });
    }

    const reference = await generateReferenceCode()
    const created = await Withdrawal.create({
      seller: req.user.userId,
      amount: Number(amount),
      currency,
      status: 'pending',
      reference,
    });
    await refreshStoreBalance(req.user.userId);
    return res.status(201).json({ success: true, withdrawal: created });
  } catch (err: any) {
    return res.status(500).json({ msg: err?.message || 'Failed to request withdrawal' });
  }
};

export const getWithdrawalSummary = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ msg: 'Not authorized' });
    const summary = await refreshStoreBalance(req.user.userId);
    return res.json({
      availableBalance: summary.availableBalance,
      storeBalance: summary.availableBalance,
      threshold: WITHDRAWAL_THRESHOLD,
      pendingAmount: summary.pendingTotal,
      totalEarnings: summary.totalEarnings,
      totalWithdrawn: summary.completedTotal + summary.deductionAmount,
      deductionAmount: summary.deductionAmount,
      returnDebt: summary.returnDebt,
    });
  } catch (err: any) {
    return res.status(500).json({ msg: err?.message || 'Failed to fetch summary' });
  }
};

const formatAmount = (value: number) => `PKR ${value.toLocaleString('en-US')}`

const isSuperAdminUser = (req: AuthRequest) => (req.user?.role || '').toLowerCase() === 'superadmin'

const computeTotalDeliveredRevenue = async () => {
  const agg = await Order.aggregate([
    { $match: { status: 'delivered' } },
    { $unwind: '$items' },
    {
      $project: {
        lineTotal: {
          $multiply: [
            { $ifNull: ['$items.salePrice', '$items.price'] },
            { $ifNull: ['$items.quantity', 1] },
          ],
        },
        shippingFee: { $ifNull: ['$shippingFee', 0] },
      },
    },
    {
      $group: {
        _id: '$_id',
        merchandiseTotal: { $sum: '$lineTotal' },
        shippingFee: { $first: '$shippingFee' },
      },
    },
    {
      $project: {
        orderTotal: { $add: ['$merchandiseTotal', '$shippingFee'] },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$orderTotal' },
      },
    },
  ])
  return agg[0]?.total || 0
}

const computeAdminBalance = async () => {
  const totalRevenue = await computeTotalDeliveredRevenue()
  const completedAgg = await Withdrawal.aggregate([
    { $match: { status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ])
  const completedTotal = completedAgg[0]?.total || 0
  return {
    totalRevenue,
    completedTotal,
    balance: Math.max(0, totalRevenue - completedTotal),
  }
}

const getSellerDisplayName = (seller: any) =>
  seller?.businessName || seller?.storeName || `${seller?.name || ''} ${seller?.lastName || ''}`.trim() || 'Seller'

export const listAdminWithdrawals = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ msg: 'Not authorized' });
    if (!isSuperAdminUser(req)) return res.status(403).json({ msg: 'Forbidden' });

    const [withdrawals, summary] = await Promise.all([
      Withdrawal.find()
        .sort({ createdAt: -1 })
        .populate('seller', 'name lastName businessName storeName email bankAccounts accountTitle bankAccountNumber')
        .lean(),
      computeAdminBalance(),
    ])

    const formatted = withdrawals.map(withdrawal => {
      const seller = (withdrawal.seller as unknown) as IUser | null
      return {
        id: withdrawal._id,
        amount: withdrawal.amount,
        currency: withdrawal.currency || 'PKR',
        status: withdrawal.status,
        createdAt: withdrawal.createdAt,
        processedAt: withdrawal.processedAt,
        sellerId: seller?._id,
        sellerName: getSellerDisplayName(seller),
        sellerEmail: seller?.email,
      reference: withdrawal.reference,
        note: withdrawal.note,
      }
    })

    return res.json({
      balance: summary.balance,
      totalRevenue: summary.totalRevenue,
      completedWithdrawals: summary.completedTotal,
      withdrawals: formatted,
    })
  } catch (err: any) {
    return res.status(500).json({ msg: err?.message || 'Failed to list withdrawals' });
  }
}

export const markWithdrawalCredited = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ msg: 'Not authorized' });
    if (!isSuperAdminUser(req)) return res.status(403).json({ msg: 'Forbidden' });

    const { id } = req.params
    const withdrawal = await Withdrawal.findById(id)
    if (!withdrawal) {
      return res.status(404).json({ msg: 'Withdrawal not found' });
    }
    if (withdrawal.status === 'completed') {
      return res.status(400).json({ msg: 'Withdrawal already credited' });
    }

    withdrawal.status = 'completed';
    withdrawal.processedAt = new Date();
    await withdrawal.save();
    await refreshStoreBalance(String(withdrawal.seller));

    const seller = await User.findById(withdrawal.seller);
    if (seller) {
      const pdfBuffer = await generateWithdrawalReceiptPdf(withdrawal, seller);
      const notificationMessage = `Your withdrawal request of amount ${formatAmount(withdrawal.amount)} has been credited in your bank account. Please check your account.`;
      createNotification(
        seller._id,
        'Withdrawal credited',
        notificationMessage,
        'order',
        {
          route: '/withdrawalhistory',
          type: 'withdrawal',
          withdrawalId: String(withdrawal._id),
        }
      ).catch(() => null);

      if (seller.email) {
        try {
          await sendMail({
            to: seller.email,
            subject: 'Your withdrawal request has been credited',
            text: `${notificationMessage}\n\nFor Complaints & Issues please contact us at info@autopartsproviders.com`,
            html: `<p>${notificationMessage}</p><p>For Complaints & Issues please contact us at info@autopartsproviders.com</p>`,
            attachments: [
              {
                filename: `Withdrawal-${String(withdrawal._id)}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf',
              },
            ],
          });
        } catch (mailErr) {
          console.error('Failed to send withdrawal receipt email', mailErr);
        }
      }
    }

    const summary = await computeAdminBalance();
    return res.json({
      withdrawal,
      summary,
    });
  } catch (err: any) {
    return res.status(500).json({ msg: err?.message || 'Failed to credit withdrawal' });
  }
}

export const downloadWithdrawalReceipt = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ msg: 'Not authorized' });
    const { id } = req.params;
    const withdrawal = await Withdrawal.findById(id);
    if (!withdrawal) {
      return res.status(404).json({ msg: 'Withdrawal not found' });
    }

    const isAdmin = isSuperAdminUser(req);
    const isOwner = String(withdrawal.seller) === String(req.user.userId);
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ msg: 'Forbidden' });
    }

    const seller = await User.findById(withdrawal.seller);
    if (!seller) {
      return res.status(404).json({ msg: 'Seller not found' });
    }

    const pdfBuffer = await generateWithdrawalReceiptPdf(withdrawal, seller);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Withdrawal-${withdrawal._id}.pdf`);
    return res.send(pdfBuffer);
  } catch (err: any) {
    return res.status(500).json({ msg: err?.message || 'Failed to generate receipt' });
  }
}
