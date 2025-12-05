import { describe, it, expect } from 'vitest';
import {
  usdToAtomicUnits,
  atomicUnitsToUsd,
  isNetworkSupported,
  sanitizeContent,
  WishRequestSchema,
  AMOUNT_TIERS,
  MIN_AMOUNT,
  MAX_AMOUNT,
  SUPPORTED_NETWORKS,
  PAYMENT_NETWORKS,
  NETWORK_CONFIGS,
} from '../../shared/types';

describe('usdToAtomicUnits', () => {
  it('converts whole dollars correctly', () => {
    expect(usdToAtomicUnits(1)).toBe('1000000');
    expect(usdToAtomicUnits(10)).toBe('10000000');
    expect(usdToAtomicUnits(100)).toBe('100000000');
  });

  it('converts decimal amounts correctly', () => {
    expect(usdToAtomicUnits(1.024)).toBe('1024000');
    expect(usdToAtomicUnits(2.048)).toBe('2048000');
    expect(usdToAtomicUnits(4.096)).toBe('4096000');
    expect(usdToAtomicUnits(8.192)).toBe('8192000');
  });

  it('handles small amounts', () => {
    expect(usdToAtomicUnits(0.01)).toBe('10000');
    expect(usdToAtomicUnits(0.001)).toBe('1000');
  });

  it('handles zero', () => {
    expect(usdToAtomicUnits(0)).toBe('0');
  });
});

describe('atomicUnitsToUsd', () => {
  it('converts atomic units to USD', () => {
    expect(atomicUnitsToUsd('1000000')).toBe(1);
    expect(atomicUnitsToUsd('1024000')).toBe(1.024);
    expect(atomicUnitsToUsd('2048000')).toBe(2.048);
  });

  it('handles small amounts', () => {
    expect(atomicUnitsToUsd('10000')).toBe(0.01);
    expect(atomicUnitsToUsd('1000')).toBe(0.001);
  });

  it('is inverse of usdToAtomicUnits', () => {
    const amounts = [1.024, 2.048, 4.096, 8.192, 0.01, 100];
    for (const amount of amounts) {
      expect(atomicUnitsToUsd(usdToAtomicUnits(amount))).toBe(amount);
    }
  });
});

describe('isNetworkSupported', () => {
  it('returns true for supported networks', () => {
    for (const network of SUPPORTED_NETWORKS) {
      expect(isNetworkSupported(network)).toBe(true);
    }
  });

  it('returns false for unsupported networks', () => {
    expect(isNetworkSupported('ethereum')).toBe(false);
    expect(isNetworkSupported('solana')).toBe(false);
    expect(isNetworkSupported('')).toBe(false);
    expect(isNetworkSupported('BASE')).toBe(false); // case sensitive
  });
});

describe('sanitizeContent', () => {
  it('escapes HTML special characters', () => {
    expect(sanitizeContent('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  it('escapes quotes', () => {
    expect(sanitizeContent("It's a \"test\"")).toBe(
      "It&#x27;s a &quot;test&quot;"
    );
  });

  it('escapes ampersand', () => {
    expect(sanitizeContent('foo & bar')).toBe('foo &amp; bar');
  });

  it('truncates long content', () => {
    const longContent = 'a'.repeat(300);
    expect(sanitizeContent(longContent).length).toBe(200);
  });

  it('preserves safe content', () => {
    expect(sanitizeContent('Hello World 123')).toBe('Hello World 123');
    expect(sanitizeContent('祝愿平安')).toBe('祝愿平安');
  });
});

describe('WishRequestSchema', () => {
  it('validates valid requests', () => {
    const valid = { amount: '1.024', content: 'Test wish', network: 'base' };
    const result = WishRequestSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('allows missing optional fields', () => {
    const minimal = { amount: '1.00' };
    const result = WishRequestSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });

  it('rejects invalid amount format', () => {
    const invalid = { amount: 'abc' };
    const result = WishRequestSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects negative amounts', () => {
    const invalid = { amount: '-1.00' };
    const result = WishRequestSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects content over 200 chars', () => {
    const invalid = { amount: '1.00', content: 'a'.repeat(201) };
    const result = WishRequestSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects unsupported networks', () => {
    const invalid = { amount: '1.00', network: 'ethereum' };
    const result = WishRequestSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('AMOUNT_TIERS', () => {
  it('has correct tier values', () => {
    expect(AMOUNT_TIERS.HALO).toBe(1.024);
    expect(AMOUNT_TIERS.RIPPLE).toBe(2.048);
    expect(AMOUNT_TIERS.LOTUS).toBe(4.096);
    expect(AMOUNT_TIERS.DHARMA).toBe(8.192);
  });

  it('tiers are in ascending order', () => {
    expect(AMOUNT_TIERS.HALO).toBeLessThan(AMOUNT_TIERS.RIPPLE);
    expect(AMOUNT_TIERS.RIPPLE).toBeLessThan(AMOUNT_TIERS.LOTUS);
    expect(AMOUNT_TIERS.LOTUS).toBeLessThan(AMOUNT_TIERS.DHARMA);
  });
});

describe('NETWORK_CONFIGS', () => {
  it('has config for all payment networks', () => {
    for (const network of PAYMENT_NETWORKS) {
      expect(NETWORK_CONFIGS[network]).toBeDefined();
      expect(NETWORK_CONFIGS[network].chainId).toBeGreaterThan(0);
      expect(NETWORK_CONFIGS[network].usdc).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(NETWORK_CONFIGS[network].explorer).toMatch(/^https:\/\//);
    }
  });

  it('mainnet and testnet pairs have different chain IDs', () => {
    expect(NETWORK_CONFIGS['base'].chainId).not.toBe(
      NETWORK_CONFIGS['base-sepolia'].chainId
    );
    expect(NETWORK_CONFIGS['polygon'].chainId).not.toBe(
      NETWORK_CONFIGS['polygon-amoy'].chainId
    );
  });
});

describe('Constants', () => {
  it('MIN_AMOUNT is positive', () => {
    expect(MIN_AMOUNT).toBeGreaterThan(0);
  });

  it('MAX_AMOUNT is greater than MIN_AMOUNT', () => {
    expect(MAX_AMOUNT).toBeGreaterThan(MIN_AMOUNT);
  });

  it('all AMOUNT_TIERS are within bounds', () => {
    for (const tier of Object.values(AMOUNT_TIERS)) {
      expect(tier).toBeGreaterThanOrEqual(MIN_AMOUNT);
      expect(tier).toBeLessThanOrEqual(MAX_AMOUNT);
    }
  });
});
