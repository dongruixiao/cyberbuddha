import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, WishRequest, WishResponse, WishConfig, ErrorResponse, WishRecord, WishListResponse } from './types';
import {
  FACILITATOR_URL,
  MIN_AMOUNT,
  USDC_ADDRESSES,
  isNetworkSupported,
  usdToAtomicUnits,
} from './config';

const app = new Hono<{ Bindings: Env }>();

// CORS
app.use('*', cors({ origin: '*', exposeHeaders: ['X-PAYMENT-RESPONSE'] }));

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', message: '佛祖在线' }));

// Get wish config
app.get('/api/wish', (c) => {
  const network = c.env.NETWORK || 'base-sepolia';
  const config: WishConfig = {
    network,
    asset: USDC_ADDRESSES[network] || USDC_ADDRESSES['base-sepolia'],
    minAmount: MIN_AMOUNT,
    recipient: c.env.ADDRESS,
  };
  return c.json(config);
});

// Make a wish (with x402 payment)
app.post('/api/wish', async (c) => {
  const address = c.env.ADDRESS;
  const defaultNetwork = c.env.NETWORK || 'base-sepolia';
  const facilitatorUrl = c.env.FACILITATOR_URL || FACILITATOR_URL;

  if (!address) {
    return c.json<ErrorResponse>({ error: { code: 'NOT_CONFIGURED', message: 'ADDRESS not configured' } }, 500);
  }

  // Parse request body
  let body: WishRequest;
  try {
    body = await c.req.json<WishRequest>();
  } catch {
    return c.json<ErrorResponse>({ error: { code: 'INVALID_BODY', message: 'Invalid request body' } }, 400);
  }

  // Use network from request body or fall back to env
  const network = body.network || defaultNetwork;

  if (!isNetworkSupported(network)) {
    return c.json<ErrorResponse>({ error: { code: 'INVALID_NETWORK', message: `Unsupported network: ${network}` } }, 400);
  }

  const amount = parseFloat(body.amount);
  if (isNaN(amount) || amount < MIN_AMOUNT) {
    return c.json<ErrorResponse>({ error: { code: 'INVALID_AMOUNT', message: `Minimum amount is $${MIN_AMOUNT}` } }, 400);
  }

  const asset = USDC_ADDRESSES[network];
  if (!asset) {
    return c.json<ErrorResponse>({ error: { code: 'UNSUPPORTED_NETWORK', message: 'USDC not available on this network' } }, 400);
  }

  // Check for payment header
  const paymentHeader = c.req.header('X-PAYMENT');

  if (!paymentHeader) {
    // Return 402 Payment Required
    const paymentRequirements = {
      scheme: 'exact' as const,
      network,
      maxAmountRequired: usdToAtomicUnits(amount),
      resource: new URL('/api/wish', c.req.url).href,
      description: `许愿 - $${amount}`,
      mimeType: 'application/json',
      payTo: address,
      maxTimeoutSeconds: 300,
      asset,
      extra: { name: 'USDC', version: '2' },
    };

    return c.json({
      x402Version: 1,
      error: 'X-PAYMENT header is required',
      accepts: [paymentRequirements],
    }, 402);
  }

  // Verify and settle payment with facilitator
  try {
    const paymentPayload = JSON.parse(atob(paymentHeader));

    const paymentRequirements = {
      scheme: 'exact' as const,
      network,
      maxAmountRequired: usdToAtomicUnits(amount),
      resource: new URL('/api/wish', c.req.url).href,
      description: `许愿 - $${amount}`,
      mimeType: 'application/json',
      payTo: address,
      maxTimeoutSeconds: 300,
      asset,
      extra: { name: 'USDC', version: '2' },
    };

    // Verify payment
    const verifyResponse = await fetch(`${facilitatorUrl}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x402Version: 1,
        paymentPayload,
        paymentRequirements,
      }),
    });

    if (!verifyResponse.ok) {
      const errorText = await verifyResponse.text();
      console.error('Verify failed:', verifyResponse.status, errorText);
      return c.json({
        x402Version: 1,
        error: `Verification failed: ${verifyResponse.status}`,
        accepts: [paymentRequirements],
      }, 402);
    }

    const verifyResult = await verifyResponse.json() as { isValid: boolean; invalidReason?: string; payer?: string };

    if (!verifyResult.isValid) {
      return c.json({
        x402Version: 1,
        error: verifyResult.invalidReason || 'Payment verification failed',
        accepts: [paymentRequirements],
        payer: verifyResult.payer,
      }, 402);
    }

    // Settle payment
    const settleResponse = await fetch(`${facilitatorUrl}/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x402Version: 1,
        paymentPayload,
        paymentRequirements,
      }),
    });

    if (!settleResponse.ok) {
      const errorText = await settleResponse.text();
      console.error('Settle failed:', settleResponse.status, errorText);
      return c.json<ErrorResponse>({ error: { code: 'SETTLE_FAILED', message: `Settlement failed: ${settleResponse.status}` } }, 500);
    }

    const settleResult = await settleResponse.json() as { success: boolean; transaction?: string; errorReason?: string };

    if (!settleResult.success) {
      return c.json<ErrorResponse>({ error: { code: 'SETTLE_FAILED', message: settleResult.errorReason || 'Settlement failed' } }, 500);
    }

    // Success! Save wish to D1
    const wish = body.content || '心诚则灵';
    const txHash = settleResult.transaction || '';
    const payer = verifyResult.payer || '';

    try {
      await c.env.DB.prepare(
        'INSERT INTO wishes (tx_hash, payer, amount, content, network, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(txHash, payer, amount, wish, network, Date.now()).run();
    } catch (dbErr) {
      console.error('Failed to save wish:', dbErr);
      // Don't fail the request if DB write fails
    }

    const response: WishResponse = {
      message: '香已点燃，佛祖已收到你的心意',
      blessing: `🙏 ${wish} 🙏`,
      txHash,
    };

    return c.json(response);

  } catch (err) {
    console.error('Payment error:', err);
    return c.json<ErrorResponse>({ error: { code: 'PAYMENT_ERROR', message: 'Payment processing failed' } }, 500);
  }
});

// Get wish wall
app.get('/api/wishes', async (c) => {
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
  const offset = parseInt(c.req.query('offset') || '0');

  try {
    const [wishesResult, countResult] = await Promise.all([
      c.env.DB.prepare('SELECT * FROM wishes ORDER BY created_at DESC LIMIT ? OFFSET ?')
        .bind(limit, offset)
        .all<WishRecord>(),
      c.env.DB.prepare('SELECT COUNT(*) as total FROM wishes').first<{ total: number }>(),
    ]);

    const response: WishListResponse = {
      wishes: wishesResult.results || [],
      total: countResult?.total || 0,
    };

    return c.json(response);
  } catch (err) {
    console.error('Failed to fetch wishes:', err);
    return c.json<ErrorResponse>({ error: { code: 'DB_ERROR', message: 'Failed to fetch wishes' } }, 500);
  }
});

export default app;
