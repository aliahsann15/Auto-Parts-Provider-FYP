import { Request, Response } from 'express';
import dotenv from 'dotenv';
dotenv.config();
import Stripe from 'stripe';
import User from '../models/User';
import { AuthRequest } from '../middleware/authMiddleware';
import fetch from 'node-fetch';

let stripe: Stripe | null = null;
const ensureStripe = () => {
  if (!stripe) {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (secret) {
      stripe = new Stripe(secret, { apiVersion: '2025-11-17.clover' });
    }
  }
  if (!stripe) {
    throw new Error('Stripe not configured (missing STRIPE_SECRET_KEY)');
  }
  return stripe;
};

const FX_API_URL = process.env.FX_API_URL || 'https://api.currencyfreaks.com/latest';
const FX_CONVERT_URL = process.env.FX_CONVERT_URL || 'https://api.currencyfreaks.com/v2.0/convert';
const FX_API_KEY = process.env.FX_API_KEY;

async function convertPkrToUsd(amountPkr: number): Promise<number> {
  if (!amountPkr || Number(amountPkr) <= 0) {
    throw new Error('Invalid PKR amount');
  }
  if (!FX_API_KEY) {
    throw new Error('FX API key missing');
  }

  // First try the /convert endpoint (short query string)
  const convertUrl = new URL(FX_CONVERT_URL);
  convertUrl.searchParams.set('apikey', FX_API_KEY);
  convertUrl.searchParams.set('from', 'PKR');
  convertUrl.searchParams.set('to', 'USD');
  convertUrl.searchParams.set('amount', amountPkr.toFixed(2));

  // Helper: fetch simple latest rates (USD base by default)
  const getFromLatest = async () => {
    const latestUrl = new URL(FX_API_URL);
    latestUrl.searchParams.set('apikey', FX_API_KEY);
    const resp = await fetch(latestUrl.toString());
    if (!resp.ok) {
      throw new Error(`FX API error ${resp.status}`);
    }
    const data: any = await resp.json();
    const ratePkr = Number(data?.rates?.PKR || data?.rates?.Pkr || data?.rates?.pkr);
    if (!ratePkr || Number.isNaN(ratePkr)) {
      throw new Error('Unable to fetch USD/PKR rate');
    }
    // rates are USD base; PKR rate = PKR per USD, so USD = PKR / rate
    return amountPkr / ratePkr;
  };

  try {
    const resp = await fetch(convertUrl.toString());
    if (resp.ok) {
      const data: any = await resp.json();
      const converted =
        Number(data?.converted_amount) ||
        Number(data?.convertedAmount) ||
        Number(data?.conversion_result) ||
        Number(data?.result);
      if (converted && !Number.isNaN(converted)) {
        return converted;
      }
    }
  } catch {
    // ignore, will fall back
  }

  try {
    return await getFromLatest();
  } catch {
    // Final safety: assume 1 USD = 280 PKR if API keeps failing
    const fallbackRate = 280;
    return amountPkr / fallbackRate;
  }
}

async function getOrCreateCustomer(userId: string) {
  const client = ensureStripe();
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  const customer = await client.customers.create({
    metadata: { userId },
    description: `Customer for user ${user.email || userId}`,
  });
  user.stripeCustomerId = customer.id;
  await user.save();
  return customer.id;
}

export const createSetupIntent = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ msg: 'Not authorized' });
    const client = ensureStripe();
    const customerId = await getOrCreateCustomer(req.user.userId);
    const setupIntent = await client.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
    });
    return res.json({ clientSecret: setupIntent.client_secret, customer: customerId });
  } catch (err: any) {
    console.error('createSetupIntent error', err);
    return res.status(500).json({ msg: err?.message || 'Failed to create setup intent' });
  }
};

export const createEphemeralKey = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ msg: 'Not authorized' });
    const client = ensureStripe();
    const apiVersion = req.headers['stripe-version'] as string | undefined || '2024-06-20';
    const customerId = await getOrCreateCustomer(req.user.userId);
    const key = await client.ephemeralKeys.create(
      { customer: customerId },
      { apiVersion }
    );
    return res.json({ ephemeralKey: key.secret, customer: customerId });
  } catch (err: any) {
    console.error('createEphemeralKey error', err);
    return res.status(500).json({ msg: err?.message || 'Failed to create ephemeral key' });
  }
};

export const listPaymentMethods = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ msg: 'Not authorized' });
    const client = ensureStripe();
    const customerId = await getOrCreateCustomer(req.user.userId);
    const pms = await client.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
    const cards = pms.data.map(pm => ({
      id: pm.id,
      brand: pm.card?.brand,
      last4: pm.card?.last4,
      expMonth: pm.card?.exp_month,
      expYear: pm.card?.exp_year,
      isDefault: pm.id === (pm.customer as string | undefined),
    }));
    return res.json({ customer: customerId, methods: cards });
  } catch (err: any) {
    console.error('listPaymentMethods error', err);
    return res.status(500).json({ msg: err?.message || 'Failed to list payment methods' });
  }
};

export const createPaymentIntent = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ msg: 'Not authorized' });
    const client = ensureStripe();
    const { amount, currency = 'usd', paymentMethodId, metadata, amountPkr } = req.body as any;
    const inputAmount = Number(amount ?? 0);
    const inputPkr = Number(amountPkr ?? 0);
    if ((!inputAmount || inputAmount <= 0) && (!inputPkr || inputPkr <= 0)) {
      return res.status(400).json({ msg: 'Amount is required' });
    }

    const customerId = await getOrCreateCustomer(req.user.userId);
    let amountUsd = inputAmount;
    if ((!amountUsd || amountUsd <= 0) && inputPkr > 0) {
      amountUsd = await convertPkrToUsd(inputPkr);
    }
    const amountMinor = Math.max(1, Math.round(Number(amountUsd) * 100));

    const intent = await client.paymentIntents.create({
      amount: amountMinor,
      currency,
      customer: customerId,
      payment_method: paymentMethodId,
      automatic_payment_methods: { enabled: true },
      metadata: {
        userId: req.user.userId,
        ...(amountPkr ? { amountPkr: String(amountPkr) } : {}),
        ...(metadata || {}),
      },
    });

    return res.json({
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      customer: customerId,
    });
  } catch (err: any) {
    console.error('createPaymentIntent error', err);
    return res.status(500).json({ msg: err?.message || 'Failed to create payment intent' });
  }
};
const FX_API = process.env.FX_API_URL || 'https://api.currencyfreaks.com/v2.0/convert'

// async function convertPkrToUsd(amountPkr: number): Promise<number> {
//   if (!FX_API_KEY) throw new Error('FX API not configured');
//   const url = `${FX_API}?from=PKR&to=USD&amount=${encodeURIComponent(amountPkr)}`;
//   const res = await fetch(url, {
//     headers: { Authorization: `Bearer ${FX_API_KEY}` }
//   });
//   const json: any = await res.json();
//   const usd = json?.result ?? json?.conversion_result ?? json?.conversion ?? json?.usd ?? null;
//   if (!res.ok || typeof usd !== 'number') {
//     throw new Error(json?.message || 'FX conversion failed');
//   }
//   return usd;
// }
