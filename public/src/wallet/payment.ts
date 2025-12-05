// EIP-712 payment authorization for x402 protocol
import { createWalletClient, custom, getAddress } from 'viem';
import { getState, setState } from '../core/state';
import { NETWORK_CONFIG } from '../core/constants';
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
    console.log('[Payment] Creating auth for:', req);
    const { asset, payTo, maxAmountRequired, extra, network, maxTimeoutSeconds } = req;

    const walletType = getState('walletType');
    const address = getState('address');
    const currentChainId = getState('chainId');

    const provider = getProvider(walletType!);
    if (!provider) throw new Error('Wallet not connected');

    const nonce = '0x' + [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, '0')).join('');
    const now = Math.floor(Date.now() / 1000);
    const validAfter = BigInt(now - 600);
    const validBefore = BigInt(now + (maxTimeoutSeconds || 3600));
    const chainId = NETWORK_CONFIG[network]?.chainId || currentChainId!;

    console.log('[Payment] Chain check:', { currentChainId, requiredChainId: chainId, network });

    if (currentChainId !== chainId) {
      console.log('[Payment] Switching chain to:', chainId);
      await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: `0x${chainId.toString(16)}` }] });
      setState('chainId', chainId);
    }

    const walletClient = createWalletClient({ chain: { id: chainId, name: network }, transport: custom(provider) });
    const from = getAddress(address!);
    const to = getAddress(payTo);

    console.log('[Payment] Signing typed data:', { from, to, value: maxAmountRequired, asset, chainId });

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

    console.log('[Payment] Signature obtained');

    return {
      x402Version: 1, scheme: 'exact', network,
      payload: { signature, authorization: { from, to, value: maxAmountRequired, validAfter: validAfter.toString(), validBefore: validBefore.toString(), nonce } },
    };
  } catch (err: unknown) {
    console.error('[Payment] createPaymentAuth error:', err);
    // Handle user rejection
    if (err instanceof Error) {
      if (err.message?.includes('User rejected') || err.message?.includes('user rejected')) {
        throw new Error('signature cancelled');
      }
    }
    const errorWithCode = err as { code?: number };
    if (errorWithCode.code === 4001) {
      throw new Error('signature cancelled');
    }
    throw err;
  }
}
