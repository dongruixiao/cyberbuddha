// Wish service: API calls and payment flow
import { WishConfig, WishResponse } from '../../../../shared/types';
import { createPaymentAuth } from '../wallet/payment';

interface PaymentRequirements {
  asset: string;
  payTo: string;
  maxAmountRequired: string;
  extra?: { name?: string; version?: string };
  network: string;
  maxTimeoutSeconds?: number;
}

interface X402Response {
  x402Version: number;
  error?: string;
  accepts?: PaymentRequirements[];
}

export async function fetchConfig(): Promise<WishConfig> {
  const response = await fetch('/api/wish');
  if (!response.ok) {
    throw new Error('Failed to fetch config');
  }
  return response.json();
}

export async function makeWish(amount: number, content: string | undefined, network: string): Promise<WishResponse> {
  console.log('[Wish] makeWish called:', { amount, content, network });

  const res = await fetch('/api/wish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: amount.toString(), content, network }),
  });

  console.log('[Wish] Initial response status:', res.status);

  if (res.status !== 402) {
    if (res.ok) return res.json();
    const err = await res.json();
    console.error('[Wish] Initial request failed:', err);
    throw new Error(err.error?.message || 'Request failed');
  }

  const data = await res.json() as X402Response;
  console.log('[Wish] 402 response:', data);
  const { accepts } = data;
  if (!accepts?.[0]) throw new Error('No payment requirements');

  console.log('[Wish] Creating payment auth for:', accepts[0]);
  const payment = await createPaymentAuth(accepts[0]);
  console.log('[Wish] Payment auth created');

  const payRes = await fetch('/api/wish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-PAYMENT': btoa(JSON.stringify(payment)) },
    body: JSON.stringify({ amount: amount.toString(), content, network }),
  });

  console.log('[Wish] Payment response status:', payRes.status);

  if (!payRes.ok) {
    const err = await payRes.json().catch(() => ({})) as { error?: string | { message?: string } };
    console.error('[Wish] Payment failed:', err);
    // Translate error codes to user-friendly messages
    const errorMessages: Record<string, string> = {
      'insufficient_funds': 'insufficient USDC balance',
      'invalid_signature': 'signature verification failed',
      'expired': 'payment authorization expired',
      'already_used': 'payment already processed',
      'invalid_amount': 'invalid payment amount',
    };
    // Handle both formats: { error: "code" } and { error: { message: "..." } }
    const errorCode = typeof err.error === 'string' ? err.error : '';
    const errorMsg = typeof err.error === 'object' ? err.error?.message : '';
    const friendlyMsg = errorMessages[errorCode] || errorMsg || (typeof err.error === 'string' ? err.error : '') || `payment failed (${payRes.status})`;
    throw new Error(friendlyMsg);
  }
  return payRes.json();
}
