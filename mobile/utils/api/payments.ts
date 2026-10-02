import { apiRequest } from './client';

export async function createSetupIntent(token: string) {
  return apiRequest<{ clientSecret: string; customer: string }>('/payments/setup-intent', {
    method: 'POST',
    token,
  });
}

export async function createEphemeralKey(token: string, stripeVersion: string) {
  return apiRequest<{ ephemeralKey: string; customer: string }>('/payments/ephemeral-key', {
    method: 'POST',
    token,
    // stripe version header not supported in apiRequest; handled server default
  });
}

export async function listPaymentMethods(token: string) {
  return apiRequest<{ methods: any[]; customer: string }>('/payments/methods', {
    token,
  });
}

export async function createPaymentIntent(token: string, payload: { amount?: number; amountPkr?: number; currency?: string; paymentMethodId?: string; metadata?: Record<string, any>; }) {
  return apiRequest<{ clientSecret?: string; paymentIntentId?: string; customer?: string }>('/payments/intent', {
    method: 'POST',
    token,
    body: payload,
  });
}
