// Wish service: API calls and payment flow
import { WishConfig, WishResponse, MESSAGES } from '../../../shared/types';
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
  console.log('[wish] makeWish called:', { amount, content, network });

  const res = await fetch('/api/wish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: amount.toString(), content, network }),
  });

  console.log('[wish] initial response:', res.status);

  if (res.status !== 402) {
    if (res.ok) return res.json();
    const err = await res.json();
    console.error('[wish] initial request failed:', err);
    throw new Error(err.error?.message || 'Request failed');
  }

  const data = await res.json() as X402Response;
  console.log('[wish] 402 response:', data);
  const { accepts } = data;
  if (!accepts?.[0]) throw new Error('No payment requirements');

  console.log('[wish] creating payment auth for:', accepts[0]);
  const payment = await createPaymentAuth(accepts[0]);
  console.log('[wish] payment auth created');

  const payRes = await fetch('/api/wish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-PAYMENT': btoa(JSON.stringify(payment)) },
    body: JSON.stringify({ amount: amount.toString(), content, network }),
  });

  console.log('[wish] payment response:', payRes.status);

  if (!payRes.ok) {
    const err = await payRes.json().catch(() => ({})) as { error?: string | { message?: string } };
    console.error('[wish] payment failed:', err);
    // Translate error codes to user-friendly messages
    const errorMessages: Record<string, string> = {
      'insufficient_funds': MESSAGES.INSUFFICIENT_BALANCE,
      'invalid_signature': MESSAGES.SIGNATURE_FAILED,
      'expired': MESSAGES.PAYMENT_EXPIRED,
      'already_used': MESSAGES.ALREADY_PROCESSED,
      'invalid_amount': MESSAGES.INVALID_AMOUNT,
    };
    // Handle both formats: { error: "code" } and { error: { message: "..." } }
    const errorCode = typeof err.error === 'string' ? err.error : '';
    const errorMsg = typeof err.error === 'object' ? err.error?.message : '';
    const friendlyMsg = errorMessages[errorCode] || errorMsg || (typeof err.error === 'string' ? err.error : '') || `payment failed (${payRes.status})`;
    throw new Error(friendlyMsg);
  }
  return payRes.json();
}
