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
  DEFAULT_WISH_CONTENT,
  MESSAGES,
  type Network,
  type PaymentNetwork,
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
    console.error('[wish] ADDRESS env not configured');
    return c.json<ErrorResponse>({ error: { code: 'NOT_CONFIGURED', message: 'Server not configured' } }, 500);
  }

  // Parse request body
  let rawBody: unknown;
  try {
    rawBody = await c.req.json();
  } catch {
    console.warn('[wish] invalid JSON body');
    return c.json<ErrorResponse>({ error: { code: 'INVALID_BODY', message: 'Invalid request body' } }, 400);
  }

  // Validate with Zod
  const parseResult = WishRequestSchema.safeParse(rawBody);
  if (!parseResult.success) {
    const errorMessage = parseResult.error.issues[0]?.message || 'Invalid request';
    console.warn('[wish] validation failed:', errorMessage);
    return c.json<ErrorResponse>({ error: { code: 'INVALID_BODY', message: errorMessage } }, 400);
  }

  const body = parseResult.data;

  // Validate network
  const network = body.network || defaultNetwork;
  if (!isNetworkSupported(network)) {
    console.warn(`[wish] unsupported network: ${network}`);
    return c.json<ErrorResponse>({ error: { code: 'INVALID_NETWORK', message: `Unsupported network: ${network}` } }, 400);
  }

  // Validate amount
  const amount = parseFloat(body.amount);
  if (isNaN(amount) || amount < MIN_AMOUNT) {
    console.warn(`[wish] invalid amount: ${body.amount}`);
    return c.json<ErrorResponse>({ error: { code: 'INVALID_AMOUNT', message: `Minimum amount is $${MIN_AMOUNT}` } }, 400);
  }
  if (amount > MAX_AMOUNT) {
    console.warn(`[wish] amount exceeds maximum: ${amount}`);
    return c.json<ErrorResponse>({ error: { code: 'INVALID_AMOUNT', message: `Maximum amount is $${MAX_AMOUNT}` } }, 400);
  }

  // Get network config
  const networkConfig = NETWORK_CONFIGS[network as PaymentNetwork];
  if (!networkConfig) {
    console.warn(`[wish] no USDC configured for: ${network}`);
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
    console.info(`[wish] payment required: $${amount} on ${network}`);
    return c.json({
      x402Version: 1,
      error: 'X-PAYMENT header is required',
      accepts: [paymentRequirements],
    }, 402);
  }

  // Process payment
  try {
    // Decode payment payload
    let paymentPayload: {
      x402Version?: number;
      scheme?: string;
      network?: string;
      payload?: {
        authorization?: {
          value?: string;
          from?: string;
          to?: string;
        };
      };
    };
    try {
      paymentPayload = JSON.parse(atob(paymentHeader));
    } catch {
      console.warn('[wish] invalid payment header');
      return c.json({
        x402Version: 1,
        error: 'Invalid payment header',
        accepts: [paymentRequirements],
      }, 402);
    }

    // Local validation: verify payment amount meets requirement
    const paymentValue = paymentPayload.payload?.authorization?.value;
    if (!paymentValue) {
      console.warn('[wish] missing payment value');
      return c.json({
        x402Version: 1,
        error: 'Payment amount missing',
        accepts: [paymentRequirements],
      }, 402);
    }

    // Validate paymentValue is a valid numeric string before BigInt conversion
    try {
      const paymentBigInt = BigInt(paymentValue);
      const requiredBigInt = BigInt(paymentRequirements.maxAmountRequired);
      if (paymentBigInt < requiredBigInt) {
        console.warn(`[wish] insufficient payment: ${paymentValue} < ${paymentRequirements.maxAmountRequired}`);
        return c.json({
          x402Version: 1,
          error: 'Payment amount insufficient',
          accepts: [paymentRequirements],
        }, 402);
      }
    } catch {
      console.warn(`[wish] invalid payment value format: ${paymentValue}`);
      return c.json({
        x402Version: 1,
        error: 'Invalid payment value format',
        accepts: [paymentRequirements],
      }, 402);
    }

    // Local validation: verify recipient matches
    const paymentTo = paymentPayload.payload?.authorization?.to?.toLowerCase();
    if (paymentTo !== address.toLowerCase()) {
      console.warn(`[wish] wrong recipient: ${paymentTo} !== ${address}`);
      return c.json({
        x402Version: 1,
        error: 'Invalid payment recipient',
        accepts: [paymentRequirements],
      }, 402);
    }

    // Helper: fetch with retry (exponential backoff)
    const fetchWithRetry = async (url: string, options: RequestInit, maxRetries = 3): Promise<Response> => {
      let lastError: Error | null = null;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const response = await fetch(url, options);
          if (response.ok || response.status < 500) {
            return response;
          }
          lastError = new Error(`HTTP ${response.status}`);
        } catch (err) {
          lastError = err instanceof Error ? err : new Error('Network error');
        }
        // Exponential backoff: 100ms, 200ms, 400ms
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt)));
        }
      }
      throw lastError || new Error('Request failed after retries');
    };

    // Verify payment with facilitator (with retry)
    console.info(`[wish] verifying payment: $${amount}`);
    const verifyResponse = await fetchWithRetry(`${facilitatorUrl}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x402Version: 1,
        paymentPayload,
        paymentRequirements,
      }),
    });

    if (!verifyResponse.ok) {
      console.error(`[wish] verification failed: ${verifyResponse.status}`);
      return c.json({
        x402Version: 1,
        error: 'Payment verification failed',
        accepts: [paymentRequirements],
      }, 402);
    }

    const verifyResult = await verifyResponse.json() as { isValid: boolean; invalidReason?: string; payer?: string };

    if (!verifyResult.isValid) {
      console.warn(`[wish] payment invalid: ${verifyResult.invalidReason}`);
      return c.json({
        x402Version: 1,
        error: verifyResult.invalidReason || 'Payment verification failed',
        accepts: [paymentRequirements],
        payer: verifyResult.payer,
      }, 402);
    }

    // Settle payment with facilitator (with retry)
    console.info(`[wish] settling payment from ${verifyResult.payer}`);
    const settleResponse = await fetchWithRetry(`${facilitatorUrl}/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x402Version: 1,
        paymentPayload,
        paymentRequirements,
      }),
    });

    if (!settleResponse.ok) {
      console.error(`[wish] settlement failed: ${settleResponse.status}`);
      return c.json<ErrorResponse>({ error: { code: 'SETTLE_FAILED', message: 'Settlement failed' } }, 500);
    }

    const settleResult = await settleResponse.json() as { success: boolean; transaction?: string; errorReason?: string };

    if (!settleResult.success) {
      console.error(`[wish] settlement unsuccessful: ${settleResult.errorReason}`);
      return c.json<ErrorResponse>({ error: { code: 'SETTLE_FAILED', message: settleResult.errorReason || 'Settlement failed' } }, 500);
    }

    // Payment successful - save wish to database
    const wishContent = content || DEFAULT_WISH_CONTENT;
    const txHash = settleResult.transaction || '';
    const payer = verifyResult.payer || '';

    console.info(`[wish] payment successful: tx=${txHash}, payer=${payer}, amount=$${amount}`);

    // Track if DB save failed
    let dbSaveFailed = false;
    try {
      await c.env.DB.prepare(
        'INSERT INTO wishes (tx_hash, payer, amount, content, network, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(txHash, payer, amount, wishContent, network, Date.now()).run();
      console.info(`[wish] saved to database`);
    } catch (dbErr) {
      // Log but don't fail - payment was successful
      console.error('[wish] failed to save to database:', dbErr);
      dbSaveFailed = true;
    }

    // Build response with warning if DB save failed
    const response: WishResponse = {
      message: MESSAGES.PRAYER_HEARD,
      blessing: wishContent,
      txHash,
    };

    // Add warning if DB save failed (user should know)
    if (dbSaveFailed) {
      response.warning = MESSAGES.DB_SAVE_WARNING;
    }

    return c.json(response);

  } catch (err) {
    console.error('[wish] unexpected error:', err);
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
    console.error('[wishes] failed to fetch:', err);
    return c.json<ErrorResponse>({ error: { code: 'DB_ERROR', message: 'Failed to fetch wishes' } }, 500);
  }
});

export default app;
