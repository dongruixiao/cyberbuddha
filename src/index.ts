import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { paymentMiddleware } from 'x402-hono';
import type { Env, OfferingResponse } from './types';
import { FACILITATOR_URL, OFFERINGS, isNetworkSupported } from './config';

const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use('*', cors({
  origin: '*',
  exposeHeaders: ['X-PAYMENT-RESPONSE'],
}));

// Dynamic payment middleware based on env
app.use('/api/offer/*', async (c, next) => {
  const address = c.env.ADDRESS;
  const network = c.env.NETWORK || 'base-sepolia';
  const facilitatorUrl = c.env.FACILITATOR_URL || FACILITATOR_URL;

  if (!address) {
    return c.json({ error: 'ADDRESS not configured' }, 500);
  }

  if (!isNetworkSupported(network)) {
    return c.json({ error: `Unsupported network: ${network}` }, 500);
  }

  // Build route config from offerings - cast network to satisfy x402-hono types
  const routeConfig: Record<string, { price: string; network: typeof network }> = {};
  for (const offering of OFFERINGS) {
    routeConfig[offering.path] = {
      price: offering.price,
      network,
    };
  }

  const middleware = paymentMiddleware(
    address as `0x${string}`,
    routeConfig,
    { url: facilitatorUrl as `${string}://${string}` }
  );

  return middleware(c, next);
});

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', message: '佛祖在线' });
});

// Get config (for frontend)
app.get('/api/config', (c) => {
  return c.json({
    network: c.env.NETWORK || 'base-sepolia',
    offerings: OFFERINGS,
  });
});

// Offering endpoints
const blessings: Record<string, { message: string; blessing: (wish: string) => string }> = {
  small: {
    message: '小香已点燃',
    blessing: (wish) => `🙏 ${wish} 🙏`,
  },
  medium: {
    message: '中香已点燃',
    blessing: (wish) => `🙏 ${wish} 🙏`,
  },
  large: {
    message: '大香已点燃',
    blessing: (wish) => `🙏✨ ${wish} ✨🙏`,
  },
  premium: {
    message: '高香已点燃，佛光普照',
    blessing: (wish) => `🙏✨ ${wish} ✨🙏`,
  },
};

app.post('/api/offer/:type', async (c) => {
  const type = c.req.param('type');
  const config = blessings[type];

  if (!config) {
    return c.json({ error: 'Invalid offering type' }, 400);
  }

  let wish = '心诚则灵';
  try {
    const body = await c.req.json<{ wish?: string }>();
    if (body.wish) {
      wish = body.wish;
    }
  } catch {
    // No body or invalid JSON, use default wish
  }

  const response: OfferingResponse = {
    success: true,
    message: config.message,
    blessing: config.blessing(wish),
    type,
  };

  return c.json(response);
});

export default app;
