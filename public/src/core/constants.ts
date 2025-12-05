// Network configuration and constants

export const NETWORK_CONFIG: Record<string, { chainId: number }> = {
  'base': { chainId: 8453 },
  'base-sepolia': { chainId: 84532 },
  'polygon': { chainId: 137 },
  'polygon-amoy': { chainId: 80002 },
  'avalanche': { chainId: 43114 },
  'avalanche-fuji': { chainId: 43113 },
};

export const MAINNET_CHAINS = ['base', 'polygon', 'avalanche'];
export const TESTNET_CHAINS = ['base-sepolia', 'polygon-amoy', 'avalanche-fuji'];

export const AMOUNTS = [1.024, 2.048, 4.096, 8.192];

export const BLOCK_EXPLORERS: Record<string, string> = {
  'base': 'https://basescan.org/tx/',
  'base-sepolia': 'https://sepolia.basescan.org/tx/',
  'polygon': 'https://polygonscan.com/tx/',
  'polygon-amoy': 'https://amoy.polygonscan.com/tx/',
  'avalanche': 'https://snowtrace.io/tx/',
  'avalanche-fuji': 'https://testnet.snowtrace.io/tx/',
};

// Sanskrit and Buddhist sutra characters for effects
export const SUTRAS = [
  'ॐ', 'मणि', 'पद्मे', 'हूँ',
  '南無阿彌陀佛', '般若波羅蜜多', '色即是空', '空即是色',
  '觀自在', '菩提', '涅槃', '因果', '輪迴', '解脫',
  '慈悲', '智慧', '功德', '福報', '業障', '清淨',
  '唵', '嘛', '呢', '叭', '咪', '吽',
  'अ', 'आ', 'इ', 'ई', 'उ', 'ऊ',
  '卍', '☸', '࿕', '࿖',
];

export const MANTRAS = ['ॐ', 'मणि', 'पद्मे', 'हूँ', '唵', '嘛', '呢', '叭', '咪', '吽'];

export const LOTUS_CHARS = ['ॐ', 'अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', '卍', '☸'];

export const BG_SUTRAS = [
  'ॐ', '卍', '☸', '࿕', '࿖',
  '佛', '禅', '空', '慧', '悟', '缘', '善', '福', '德', '静', '净', '觉', '道', '心', '念', '定', '智', '明', '法', '果',
  '菩提', '涅槃', '般若', '因果', '轮回', '解脱', '慈悲', '功德', '清净', '圆满', '如来', '真如', '无我', '正念', '觉悟',
  '阿弥陀佛', '色即是空', '空即是色', '明心见性', '返璞归真', '随缘自在', '心无挂碍', '一念成佛', '回头是岸', '放下执念',
  '唵嘛呢叭咪吽', '南无阿弥陀佛', '诸法无我', '诸行无常', '涅槃寂静', '一切皆空', '缘起性空', '应无所住'
];
