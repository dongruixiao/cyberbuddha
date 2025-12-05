// EIP-712 payment authorization for x402 protocol
import { createWalletClient, custom, getAddress } from 'viem';
import { getState, setState } from '../core/state';
import { NETWORK_CONFIG } from '../core/constants';
import { MESSAGES } from '../../../shared/types';
import { getProvider } from './provider';

interface PaymentRequirements {
  asset: string;
  payTo: string;
  maxAmountRequired: string;
  extra?: { name?: string; version?: string };
  network: string;
  maxTimeoutSeconds?: number;
}

interface PaymentPayload {
  x402Version: number;
  scheme: string;
  network: string;
  payload: {
    signature: string;
    authorization: {
      from: string;
      to: string;
      value: string;
      validAfter: string;
      validBefore: string;
      nonce: string;
    };
  };
}

export async function createPaymentAuth(req: PaymentRequirements): Promise<PaymentPayload> {
  try {
    console.log('[payment] creating auth for:', req);
    const { asset, payTo, maxAmountRequired, extra, network, maxTimeoutSeconds } = req;

    const walletType = getState('walletType');
    const address = getState('address');
    const currentChainId = getState('chainId');

    // Validate wallet connection
    if (!walletType || !address) {
      throw new Error('Wallet not connected');
    }

    const provider = getProvider(walletType);
    if (!provider) throw new Error('Wallet provider not available');

    const nonce = `0x${[...crypto.getRandomValues(new Uint8Array(32))].map(byte => byte.toString(16).padStart(2, '0')).join('')}` as `0x${string}`;
    const now = Math.floor(Date.now() / 1000);
    const validAfter = BigInt(now - 60); // 60 seconds tolerance (reduced from 600)
    const validBefore = BigInt(now + (maxTimeoutSeconds || 3600));
    const chainId = NETWORK_CONFIG[network]?.chainId || currentChainId;

    console.log('[payment] chain check:', { currentChainId, requiredChainId: chainId, network });

    // Handle chain switching with proper error handling
    if (currentChainId !== chainId) {
      console.log('[payment] switching chain to:', chainId);
      try {
        await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: `0x${chainId.toString(16)}` }] });
        setState('chainId', chainId);
      } catch (switchError: unknown) {
        // Handle user rejection (code 4001)
        if (typeof switchError === 'object' && switchError !== null && 'code' in switchError) {
          const code = (switchError as { code: number }).code;
          if (code === 4001) {
            throw new Error('Chain switch cancelled by user');
          }
          // Chain not added to wallet (code 4902) - could add chain here if needed
          if (code === 4902) {
            throw new Error(`Please add ${network} network to your wallet`);
          }
        }
        throw new Error('Failed to switch network');
      }
    }

    // Create wallet client with minimal chain config (viem requires nativeCurrency and rpcUrls)
    const walletClient = createWalletClient({
      chain: {
        id: chainId,
        name: network,
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: { default: { http: [] } },
      },
      transport: custom(provider),
    });
    const from = getAddress(address!);
    const to = getAddress(payTo);

    console.log('[payment] signing typed data:', { from, to, value: maxAmountRequired, asset, chainId });

    const signature = await walletClient.signTypedData({
      account: from,
      domain: { name: extra?.name || 'USDC', version: extra?.version || '2', chainId, verifyingContract: getAddress(asset) },
      types: { TransferWithAuthorization: [
        { name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' }, { name: 'validBefore', type: 'uint256' }, { name: 'nonce', type: 'bytes32' },
      ]},
      primaryType: 'TransferWithAuthorization',
      message: { from, to, value: BigInt(maxAmountRequired), validAfter, validBefore, nonce },
    });

    console.log('[payment] signature obtained');

    return {
      x402Version: 1, scheme: 'exact', network,
      payload: { signature, authorization: { from, to, value: maxAmountRequired, validAfter: validAfter.toString(), validBefore: validBefore.toString(), nonce } },
    };
  } catch (err: unknown) {
    console.error('[payment] createPaymentAuth error:', err);
    // Handle user rejection
    if (err instanceof Error) {
      if (err.message?.includes('User rejected') || err.message?.includes('user rejected')) {
        throw new Error(MESSAGES.SIGNATURE_CANCELLED);
      }
    }
    // Check for wallet rejection code (4001)
    if (typeof err === 'object' && err !== null && 'code' in err && err.code === 4001) {
      throw new Error(MESSAGES.SIGNATURE_CANCELLED);
    }
    throw err;
  }
}
