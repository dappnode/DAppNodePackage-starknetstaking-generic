import { RpcProvider } from 'starknet';
import { NETWORK, RPC_URL } from '../config';

// Default RPC URLs for each network
const DEFAULT_RPC_URLS: Record<string, string> = {
  mainnet: 'https://starknet-mainnet.public.blastapi.io',
  sepolia: 'https://starknet-sepolia.public.blastapi.io',
};

// Get the RPC URL, preferring the configured one or falling back to defaults
const getRpcUrl = (): string => {
  if (RPC_URL) {
    return RPC_URL;
  }
  return DEFAULT_RPC_URLS[NETWORK] || DEFAULT_RPC_URLS.sepolia;
};

// Singleton RPC provider instance
let provider: RpcProvider | null = null;

/**
 * Get the RPC provider instance (singleton)
 */
export const getProvider = (): RpcProvider => {
  if (!provider) {
    const rpcUrl = getRpcUrl();
    console.log(`[RPC] Initializing provider for ${NETWORK} at ${rpcUrl}`);
    provider = new RpcProvider({ nodeUrl: rpcUrl });
  }
  return provider;
};

/**
 * Wait for a transaction to be confirmed
 */
export const waitForTransaction = async (
  txHash: string,
  timeoutMs: number = 30000
): Promise<{ success: boolean; status?: string; error?: string }> => {
  const rpc = getProvider();
  console.log(`[RPC] Waiting for transaction: ${txHash}`);

  try {
    const receipt = await rpc.waitForTransaction(txHash, {
      retryInterval: 2000,
    });

    const success = receipt.execution_status === 'SUCCEEDED';
    console.log(`[RPC] Transaction ${txHash} status: ${receipt.execution_status}`);

    return {
      success,
      status: receipt.execution_status,
    };
  } catch (error: any) {
    console.warn(`[RPC] Transaction wait error: ${error.message}`);
    // Don't throw - tx may still be pending, user can check explorer
    return {
      success: false,
      error: error.message,
    };
  }
};

export default getProvider;
