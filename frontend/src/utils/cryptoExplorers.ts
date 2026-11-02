export interface CryptoNetworkOption {
  id: string;
  name: string;
  shortName: string;
  explorerBaseUrl: string;
  explorerName: string;
  samplePrefix?: string;
  badgeBg: string;
  badgeText: string;
}

export const CRYPTO_NETWORKS: CryptoNetworkOption[] = [
  {
    id: 'BEP20',
    name: 'BNB Smart Chain (BEP20)',
    shortName: 'BSC / BEP20',
    explorerBaseUrl: 'https://bscscan.com/tx/',
    explorerName: 'BscScan',
    samplePrefix: '0x',
    badgeBg: 'bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/30',
    badgeText: 'text-amber-700 dark:text-amber-300',
  },
  {
    id: 'TRC20',
    name: 'TRON (TRC20)',
    shortName: 'TRON / TRC20',
    explorerBaseUrl: 'https://tronscan.org/#/transaction/',
    explorerName: 'TronScan',
    samplePrefix: 'T',
    badgeBg: 'bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/30',
    badgeText: 'text-rose-700 dark:text-rose-300',
  },
  {
    id: 'Polygon',
    name: 'Polygon (POL / MATIC)',
    shortName: 'Polygon',
    explorerBaseUrl: 'https://polygonscan.com/tx/',
    explorerName: 'PolygonScan',
    samplePrefix: '0x',
    badgeBg: 'bg-purple-500/10 dark:bg-purple-500/20 border-purple-500/30',
    badgeText: 'text-purple-700 dark:text-purple-300',
  },
  {
    id: 'ERC20',
    name: 'Ethereum (ERC20)',
    shortName: 'Ethereum / ERC20',
    explorerBaseUrl: 'https://etherscan.io/tx/',
    explorerName: 'Etherscan',
    samplePrefix: '0x',
    badgeBg: 'bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/30',
    badgeText: 'text-blue-700 dark:text-blue-300',
  },
  {
    id: 'Solana',
    name: 'Solana',
    shortName: 'Solana (SPL)',
    explorerBaseUrl: 'https://solscan.io/tx/',
    explorerName: 'Solscan',
    badgeBg: 'bg-teal-500/10 dark:bg-teal-500/20 border-teal-500/30',
    badgeText: 'text-teal-700 dark:text-teal-300',
  },
  {
    id: 'Arbitrum',
    name: 'Arbitrum One',
    shortName: 'Arbitrum',
    explorerBaseUrl: 'https://arbiscan.io/tx/',
    explorerName: 'Arbiscan',
    samplePrefix: '0x',
    badgeBg: 'bg-cyan-500/10 dark:bg-cyan-500/20 border-cyan-500/30',
    badgeText: 'text-cyan-700 dark:text-cyan-300',
  },
  {
    id: 'Base',
    name: 'Base Network',
    shortName: 'Base',
    explorerBaseUrl: 'https://basescan.org/tx/',
    explorerName: 'BaseScan',
    samplePrefix: '0x',
    badgeBg: 'bg-indigo-500/10 dark:bg-indigo-500/20 border-indigo-500/30',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
  },
  {
    id: 'Bitcoin',
    name: 'Bitcoin (BTC)',
    shortName: 'Bitcoin',
    explorerBaseUrl: 'https://mempool.space/tx/',
    explorerName: 'Mempool.space',
    badgeBg: 'bg-orange-500/10 dark:bg-orange-500/20 border-orange-500/30',
    badgeText: 'text-orange-700 dark:text-orange-300',
  },
];

export const CRYPTO_CURRENCIES = [
  'USDT',
  'USDC',
  'BTC',
  'ETH',
  'BNB',
  'SOL',
  'POL',
  'DAI',
];

export function getNetworkConfig(networkKey?: string): CryptoNetworkOption {
  if (!networkKey) return CRYPTO_NETWORKS[0];
  const lower = networkKey.toLowerCase();
  const match = CRYPTO_NETWORKS.find(
    (n) =>
      n.id.toLowerCase() === lower ||
      n.name.toLowerCase().includes(lower) ||
      n.shortName.toLowerCase().includes(lower) ||
      lower.includes(n.id.toLowerCase())
  );
  return match || CRYPTO_NETWORKS[0];
}

export function getExplorerUrl(networkKey?: string, txid?: string): string | null {
  if (!txid || !txid.trim()) return null;
  const cleanTx = txid.trim();
  const net = getNetworkConfig(networkKey);
  return `${net.explorerBaseUrl}${cleanTx}`;
}

export function formatAddressTruncated(address?: string, frontChars = 6, endChars = 4): string {
  if (!address) return '';
  const clean = address.trim();
  if (clean.length <= frontChars + endChars + 2) return clean;
  return `${clean.substring(0, frontChars)}...${clean.substring(clean.length - endChars)}`;
}
