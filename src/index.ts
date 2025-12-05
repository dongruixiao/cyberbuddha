import { Hono } from 'hono';
import { cors } from 'hono/cors';
import {
  WishRequestSchema,
  WishResponse,
  ErrorResponse,
  WishConfig,
  WishListResponse,
  WishRecord,
  MIN_AMOUNT,
  MAX_AMOUNT,
  FACILITATOR_URL,
  NETWORK_CONFIGS,
  isNetworkSupported,
  usdToAtomicUnits,
  sanitizeContent,
  type Network,
  type PaymentNetwork,
  PAYMENT_NETWORKS,
} from '../shared/types';

// Environment bindings
interface Env {
  ADDRESS: string;
  NETWORK: Network;
  FACILITATOR_URL?: string;
  DB: D1Database;
}

const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use('*', cors({ origin: '*', exposeHeaders: ['X-PAYMENT-RESPONSE'] }));

// Health check endpoint
app.get('/api/health', (c) => c.json({ status: 'ok', message: 'Cyber Buddha is online' }));

// Get wish configuration
app.get('/api/wish', (c) => {
  const network = c.env.NETWORK || 'base-sepolia';
  const networkConfig = NETWORK_CONFIGS[network as PaymentNetwork];

  const config: WishConfig = {
    network: network as Network,
    asset: networkConfig?.usdc || NETWORK_CONFIGS['base-sepolia'].usdc,
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

  // Validate server configuration
  if (!address) {
    console.error('[WISH] ADDRESS environment variable not configured');
    return c.json<ErrorResponse>({ error: { code: 'NOT_CONFIGURED', message: 'Server not configured' } }, 500);
  }

  // Parse request body
  let rawBody: unknown;
  try {
    rawBody = await c.req.json();
  } catch {
    console.warn('[WISH] Invalid JSON body received');
    return c.json<ErrorResponse>({ error: { code: 'INVALID_BODY', message: 'Invalid request body' } }, 400);
  }

  // Validate with Zod
  const parseResult = WishRequestSchema.safeParse(rawBody);
  if (!parseResult.success) {
    const errorMessage = parseResult.error.errors[0]?.message || 'Invalid request';
    console.warn('[WISH] Validation failed:', errorMessage);
    return c.json<ErrorResponse>({ error: { code: 'INVALID_BODY', message: errorMessage } }, 400);
  }

  const body = parseResult.data;

  // Validate network
  const network = body.network || defaultNetwork;
  if (!isNetworkSupported(network)) {
    console.warn(`[WISH] Unsupported network requested: ${network}`);
    return c.json<ErrorResponse>({ error: { code: 'INVALID_NETWORK', message: `Unsupported network: ${network}` } }, 400);
  }

  // Validate amount
  const amount = parseFloat(body.amount);
  if (isNaN(amount) || amount < MIN_AMOUNT) {
    console.warn(`[WISH] Invalid amount: ${body.amount}`);
    return c.json<ErrorResponse>({ error: { code: 'INVALID_AMOUNT', message: `Minimum amount is $${MIN_AMOUNT}` } }, 400);
  }
  if (amount > MAX_AMOUNT) {
    console.warn(`[WISH] Amount exceeds maximum: ${amount}`);
    return c.json<ErrorResponse>({ error: { code: 'INVALID_AMOUNT', message: `Maximum amount is $${MAX_AMOUNT}` } }, 400);
  }

  // Get network config
  const networkConfig = NETWORK_CONFIGS[network as PaymentNetwork];
  if (!networkConfig) {
    console.warn(`[WISH] No USDC address configured for network: ${network}`);
    return c.json<ErrorResponse>({ error: { code: 'UNSUPPORTED_NETWORK', message: 'USDC not available on this network' } }, 400);
  }

  // Sanitize content (prevent XSS, limit length)
  const content = body.content ? sanitizeContent(body.content) : undefined;

  // Build payment requirements
  const paymentRequirements = {
    scheme: 'exact' as const,
    network,
    maxAmountRequired: usdToAtomicUnits(amount),
    resource: new URL('/api/wish', c.req.url).href,
    description: `Wish - $${amount}`,
    mimeType: 'application/json',
    payTo: address,
    maxTimeoutSeconds: 300,
    asset: networkConfig.usdc,
    extra: { name: 'USDC', version: '2' },
  };

  // Check for payment header
  const paymentHeader = c.req.header('X-PAYMENT');

  if (!paymentHeader) {
    // Return 402 Payment Required
    console.info(`[WISH] Payment required for $${amount} on ${network}`);
    return c.json({
      x402Version: 1,
      error: 'X-PAYMENT header is required',
      accepts: [paymentRequirements],
    }, 402);
  }

  // Process payment
  try {
    // Decode payment payload
    let paymentPayload;
    try {
      paymentPayload = JSON.parse(atob(paymentHeader));
    } catch {
      console.warn('[WISH] Invalid payment header encoding');
      return c.json({
        x402Version: 1,
        error: 'Invalid payment header',
        accepts: [paymentRequirements],
      }, 402);
    }

    // Verify payment with facilitator
    console.info(`[WISH] Verifying payment with facilitator for $${amount}`);
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
      console.error(`[WISH] Verification failed: ${verifyResponse.status}`);
      return c.json({
        x402Version: 1,
        error: 'Payment verification failed',
        accepts: [paymentRequirements],
      }, 402);
    }

    const verifyResult = await verifyResponse.json() as { isValid: boolean; invalidReason?: string; payer?: string };

    if (!verifyResult.isValid) {
      console.warn(`[WISH] Payment invalid: ${verifyResult.invalidReason}`);
      return c.json({
        x402Version: 1,
        error: verifyResult.invalidReason || 'Payment verification failed',
        accepts: [paymentRequirements],
        payer: verifyResult.payer,
      }, 402);
    }

    // Settle payment with facilitator
    console.info(`[WISH] Settling payment from ${verifyResult.payer}`);
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
      console.error(`[WISH] Settlement failed: ${settleResponse.status}`);
      return c.json<ErrorResponse>({ error: { code: 'SETTLE_FAILED', message: 'Settlement failed' } }, 500);
    }

    const settleResult = await settleResponse.json() as { success: boolean; transaction?: string; errorReason?: string };

    if (!settleResult.success) {
      console.error(`[WISH] Settlement unsuccessful: ${settleResult.errorReason}`);
      return c.json<ErrorResponse>({ error: { code: 'SETTLE_FAILED', message: settleResult.errorReason || 'Settlement failed' } }, 500);
    }

    // Payment successful - save wish to database
    const wishContent = content || 'May all wishes come true';
    const txHash = settleResult.transaction || '';
    const payer = verifyResult.payer || '';

    console.info(`[WISH] Payment successful! TX: ${txHash}, Payer: ${payer}, Amount: $${amount}`);

    // Track if DB save failed
    let dbSaveFailed = false;
    try {
      await c.env.DB.prepare(
        'INSERT INTO wishes (tx_hash, payer, amount, content, network, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(txHash, payer, amount, wishContent, network, Date.now()).run();
      console.info(`[WISH] Wish saved to database`);
    } catch (dbErr) {
      // Log but don't fail - payment was successful
      console.error('[WISH] Failed to save wish to database:', dbErr);
      dbSaveFailed = true;
    }

    // Build response with warning if DB save failed
    const response: WishResponse = {
      message: 'Your prayer has been heard',
      blessing: wishContent,
      txHash,
    };

    // Add warning if DB save failed (user should know)
    if (dbSaveFailed) {
      response.warning = 'Payment successful but wish may not appear on wall. TX is your proof of payment.';
    }

    return c.json(response);

  } catch (err) {
    console.error('[WISH] Unexpected error:', err);
    return c.json<ErrorResponse>({ error: { code: 'PAYMENT_ERROR', message: 'Payment processing failed' } }, 500);
  }
});

// Get wish wall (paginated)
app.get('/api/wishes', async (c) => {
  const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '20'), 1), 100);
  const offset = Math.max(parseInt(c.req.query('offset') || '0'), 0);

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
    console.error('[WISHES] Failed to fetch wishes:', err);
    return c.json<ErrorResponse>({ error: { code: 'DB_ERROR', message: 'Failed to fetch wishes' } }, 500);
  }
});

export default app;
