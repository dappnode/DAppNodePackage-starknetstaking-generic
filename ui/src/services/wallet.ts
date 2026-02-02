import { connect, disconnect } from '@starknet-io/get-starknet';
import { AccountInterface, typedData } from 'starknet';

export interface WalletConnection {
  address: string;
  account: AccountInterface;
  walletId: string;
  walletName: string;
  chainId: string;
}

export type WalletId = 'argentX' | 'braavos' | 'argentWebWallet';

// Map wallet IDs to backend types (case-insensitive matching)
const walletTypeMap: Record<string, string> = {
  argentx: 'ARGENT',
  argent: 'ARGENT',
  'argent x': 'ARGENT',
  argentwebwallet: 'ARGENT',
  braavos: 'BRAAVOS',
  metamask: 'METAMASK',
};

// Detect network from chain ID
export const getNetworkFromChainId = (chainId: string): 'Mainnet' | 'Sepolia' => {
  const chainIdHex = chainId.toLowerCase();
  if (chainIdHex.includes('mainnet') || chainIdHex === '0x534e5f4d41494e') {
    return 'Mainnet';
  }
  return 'Sepolia';
};

// Starknet Snap ID
const STARKNET_SNAP_ID = 'npm:@consensys/starknet-snap';
// Starknet chainId in hex: Sepolia = 0x534e5f5345504f4c4941, Mainnet = 0x534e5f4d41494e
const SEPOLIA_CHAIN_ID_HEX = '0x534e5f5345504f4c4941';

// Helper to wait for a short delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Request MetaMask Starknet Snap connection
const connectMetaMaskSnap = async (): Promise<{ address: string; publicKey: string } | null> => {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    console.log('MetaMask not found');
    return null;
  }

  const ethereum = (window as any).ethereum;

  try {
    // First, request to install/connect the Starknet Snap
    console.log('Requesting Starknet Snap installation...');
    const snapInstallResult = await ethereum.request({
      method: 'wallet_requestSnaps',
      params: {
        [STARKNET_SNAP_ID]: {},
      },
    });
    console.log('Snap install result:', snapInstallResult);

    // Check if snap was installed/connected successfully
    if (!snapInstallResult || !snapInstallResult[STARKNET_SNAP_ID]) {
      console.log('Snap installation failed or was rejected');
      return null;
    }

    // Small delay to ensure snap is fully initialized
    await delay(500);

    // Try to create/recover account first - this triggers the user consent dialog
    // which is required before we can access stored accounts
    console.log('Attempting to create or recover Starknet account...');

    // First try recovery to find existing accounts
    try {
      console.log('Trying account recovery...');
      const recoverResponse = await ethereum.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId: STARKNET_SNAP_ID,
          request: {
            method: 'starkNet_recoverAccounts',
            params: {
              chainId: SEPOLIA_CHAIN_ID_HEX,
              startScanIndex: 0,
              maxScanned: 5,
              maxMissed: 2,
            },
          },
        },
      });

      console.log('Recovery response:', recoverResponse);

      if (recoverResponse && recoverResponse.length > 0) {
        return {
          address: recoverResponse[0].address,
          publicKey: recoverResponse[0].publicKey || '',
        };
      }
    } catch (recoverError: any) {
      console.log('Recovery error (may be normal if no accounts exist):', recoverError?.message || recoverError);
    }

    // If recovery didn't find accounts, try to create a new one
    console.log('No existing accounts found, creating new account for Sepolia...');
    try {
      const createResponse = await ethereum.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId: STARKNET_SNAP_ID,
          request: {
            method: 'starkNet_createAccount',
            params: {
              chainId: SEPOLIA_CHAIN_ID_HEX,
              addressIndex: 0,
              deploy: false,
            },
          },
        },
      });

      console.log('Create account response:', createResponse);

      if (createResponse && createResponse.address) {
        return {
          address: createResponse.address,
          publicKey: createResponse.publicKey || '',
        };
      }
    } catch (createError: any) {
      console.log('Create account error:', createError?.message || createError);

      // If account already exists (error -32603), try to get stored accounts
      if (createError?.code === -32603 || createError?.message?.includes('already')) {
        console.log('Account may already exist, trying to get stored accounts...');
      }
    }

    // As a final fallback, try to get stored accounts
    console.log('Attempting to get stored accounts...');
    try {
      const storedAccounts = await ethereum.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId: STARKNET_SNAP_ID,
          request: {
            method: 'starkNet_getStoredUserAccounts',
            params: {
              chainId: SEPOLIA_CHAIN_ID_HEX,
            },
          },
        },
      });

      console.log('Stored accounts:', storedAccounts);

      if (storedAccounts && storedAccounts.length > 0) {
        // Find a Sepolia account or use the first one
        const account = storedAccounts.find((a: any) =>
          a.chainId === SEPOLIA_CHAIN_ID_HEX || a.chainId?.includes('SEPOLIA') || a.chainId?.includes('sepolia')
        ) || storedAccounts[0];

        return {
          address: account.address,
          publicKey: account.publicKey || '',
        };
      }
    } catch (getAccountsError: any) {
      console.log('Get stored accounts error:', getAccountsError?.message || getAccountsError);

      // If permission denied (4100), the user declined the snap consent
      if (getAccountsError?.code === 4100) {
        console.log('User declined Starknet Snap permissions. Please approve the connection in MetaMask.');
      }
    }

    console.log('Failed to connect Starknet account via MetaMask Snap');
    return null;
  } catch (error: any) {
    console.log('MetaMask Snap error:', error?.message || error);

    // Check if user rejected the snap installation
    if (error?.code === 4001) {
      console.log('User rejected the Starknet Snap installation');
    }

    return null;
  }
};

// Connect to wallet
export const connectWallet = async (walletId?: WalletId): Promise<WalletConnection | null> => {
  try {
    const result = await connect({
      modalMode: walletId ? 'neverAsk' : 'alwaysAsk',
      modalTheme: 'dark',
      include: ['argentX', 'braavos', 'metamask'],
    });

    if (!result) {
      console.log('No wallet selected');
      return null;
    }

    const r = result as any;
    const walletIdStr = r.id || 'unknown';
    const walletName = r.name || 'Unknown Wallet';
    const isMetaMask = walletIdStr.toLowerCase().includes('metamask') || walletName.toLowerCase().includes('metamask');

    console.log('Wallet selected:', { walletIdStr, walletName, isMetaMask });

    // For MetaMask, use Snap connection
    if (isMetaMask) {
      console.log('MetaMask detected, connecting via Starknet Snap...');
      const snapResult = await connectMetaMaskSnap();

      if (snapResult && snapResult.address) {
        console.log('MetaMask Snap connected:', snapResult);

        // Store the connection in session storage for reconnection
        storeMetaMaskSnapConnection(snapResult.address);

        // Create the snap account interface
        const snapAccount = createSnapAccountInterface(snapResult.address);

        return {
          address: snapResult.address,
          account: snapAccount,
          walletId: walletIdStr,
          walletName,
          chainId: SEPOLIA_CHAIN_ID_HEX,
        };
      } else {
        console.log('MetaMask Snap connection failed');
        return null;
      }
    }

    // For other wallets (Argent, Braavos), use standard enable flow
    let enabledAddress: string | undefined;
    if (typeof r.enable === 'function') {
      try {
        console.log('Enabling wallet...');
        const enabled = await r.enable();
        console.log('Enable result:', enabled);
        // enable() can return address as string or array
        if (typeof enabled === 'string') {
          enabledAddress = enabled;
        } else if (Array.isArray(enabled) && enabled.length > 0) {
          enabledAddress = enabled[0];
        }
      } catch (e: any) {
        console.log('Enable error:', e);
      }
    }

    // Now check for address - use enabled address first
    console.log('After enable - selectedAddress:', r.selectedAddress);
    console.log('After enable - account:', r.account);
    console.log('Enabled address:', enabledAddress);

    let address = enabledAddress || r.selectedAddress || r.account?.address;
    let account = r.account;

    if (!address) {
      console.log('No address found after enable');
      return null;
    }

    if (!account) {
      console.log('No account found - cannot sign transactions');
      return null;
    }

    // Get chainId
    let chainId: string;
    try {
      chainId = r.chainId?.toString() || (await account.getChainId()).toString();
    } catch {
      chainId = 'unknown';
    }

    console.log('Wallet connected successfully:', { address, walletIdStr, walletName, chainId });

    return {
      address,
      account: account as AccountInterface,
      walletId: walletIdStr,
      walletName,
      chainId,
    };
  } catch (error) {
    console.error('Error connecting wallet:', error);
    throw error;
  }
};

// Disconnect wallet
export const disconnectWallet = async (): Promise<void> => {
  try {
    // Clear MetaMask Snap session storage
    clearMetaMaskSnapConnection();
    await disconnect();
  } catch (error) {
    console.error('Error disconnecting wallet:', error);
  }
};

// Sign message for authentication
export const signMessage = async (
  account: AccountInterface,
  message: string
): Promise<string[]> => {
  try {
    // Extract nonce from message and use first 31 chars as shortString
    const nonceMatch = message.match(/Nonce: ([a-f0-9]+)/i);
    const nonce = nonceMatch ? nonceMatch[1].slice(0, 31) : 'starkstake-auth';

    // Get chainId from account (required by Argent)
    let chainId: string;
    try {
      chainId = await account.getChainId();
    } catch {
      // Default to Sepolia if chainId cannot be retrieved
      chainId = SEPOLIA_CHAIN_ID_HEX;
    }

    // Create typed data for signing
    // Include chainId in domain as required by Argent wallet (use 'felt' type for chainId)
    const typedDataToSign: typedData.TypedData = {
      types: {
        StarkNetDomain: [
          { name: 'name', type: 'felt' },
          { name: 'version', type: 'felt' },
          { name: 'chainId', type: 'felt' },
        ],
        Message: [
          { name: 'action', type: 'felt' },
          { name: 'nonce', type: 'felt' },
        ],
      },
      primaryType: 'Message',
      domain: {
        name: 'StarkStake',
        version: '1',
        chainId: chainId,
      },
      message: {
        action: 'authenticate',
        nonce: nonce,
      },
    };

    console.log('Signing typed data:', typedDataToSign);

    const signature = await account.signMessage(typedDataToSign);
    console.log('Raw signature:', signature);

    // Convert signature to array of strings
    if (Array.isArray(signature)) {
      return signature.map(s => s.toString());
    }

    // Handle signature object format
    if (signature && typeof signature === 'object') {
      if ('r' in signature && 's' in signature) {
        return [signature.r.toString(), signature.s.toString()];
      }
    }

    return [String(signature)];
  } catch (error) {
    console.error('Error signing message:', error);
    throw error;
  }
};

// Get wallet type for backend
export const getWalletType = (walletId: string): string => {
  const normalizedId = walletId.toLowerCase().replace(/[^a-z]/g, '');

  // Check direct match
  if (walletTypeMap[normalizedId]) {
    return walletTypeMap[normalizedId];
  }

  // Check if ID contains wallet name
  if (normalizedId.includes('argent')) return 'ARGENT';
  if (normalizedId.includes('braavos')) return 'BRAAVOS';
  if (normalizedId.includes('metamask')) return 'METAMASK';

  // Default to ARGENT
  return 'ARGENT';
};

// Format address for display
export const formatAddress = (address: string, chars = 4): string => {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
};

// Check if wallet is available
export const isWalletAvailable = async (): Promise<boolean> => {
  try {
    const starknet = await connect({ modalMode: 'neverAsk' });
    return !!starknet?.wallet;
  } catch {
    return false;
  }
};

// Session storage key for MetaMask Snap connection
const METAMASK_SNAP_SESSION_KEY = 'starkstake_metamask_snap_address';

// Store MetaMask Snap connection info
const storeMetaMaskSnapConnection = (address: string) => {
  try {
    sessionStorage.setItem(METAMASK_SNAP_SESSION_KEY, address);
  } catch {
    // Ignore storage errors
  }
};

// Clear MetaMask Snap connection info
const clearMetaMaskSnapConnection = () => {
  try {
    sessionStorage.removeItem(METAMASK_SNAP_SESSION_KEY);
  } catch {
    // Ignore storage errors
  }
};

// Get stored MetaMask Snap address
const getStoredMetaMaskSnapAddress = (): string | null => {
  try {
    return sessionStorage.getItem(METAMASK_SNAP_SESSION_KEY);
  } catch {
    return null;
  }
};

// Create a MetaMask Snap account interface for a given address
const createSnapAccountInterface = (address: string): AccountInterface => {
  const ethereum = (window as any).ethereum;
  return {
    address,
    getChainId: async () => SEPOLIA_CHAIN_ID_HEX,
    signMessage: async (typedData: any) => {
      const response = await ethereum.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId: STARKNET_SNAP_ID,
          request: {
            method: 'starkNet_signMessage',
            params: {
              chainId: SEPOLIA_CHAIN_ID_HEX,
              typedDataMessage: typedData,
              signerAddress: address,
              enableAuthorize: true,
            },
          },
        },
      });
      return response;
    },
  } as unknown as AccountInterface;
};

// Helper to reconnect MetaMask Snap silently
// This doesn't call any Snap methods that require user consent
const reconnectMetaMaskSnap = async (): Promise<WalletConnection | null> => {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    return null;
  }

  const ethereum = (window as any).ethereum;

  try {
    // Check if we have a stored address from a previous connection
    const storedAddress = getStoredMetaMaskSnapAddress();
    if (!storedAddress) {
      return null;
    }

    // Check if the Starknet Snap is still installed (doesn't require consent)
    const snaps = await ethereum.request({ method: 'wallet_getSnaps' });
    if (!snaps || !snaps[STARKNET_SNAP_ID]) {
      // Snap was uninstalled, clear stored connection
      clearMetaMaskSnapConnection();
      return null;
    }

    // Snap is installed and we have a stored address - recreate the connection
    // We don't call any Snap methods here to avoid consent prompts
    const snapAccount = createSnapAccountInterface(storedAddress);

    console.log('Reconnected to MetaMask Snap (from session):', storedAddress);

    return {
      address: storedAddress,
      account: snapAccount,
      walletId: 'metamask',
      walletName: 'MetaMask',
      chainId: SEPOLIA_CHAIN_ID_HEX,
    };
  } catch (error) {
    // Silent fail
    return null;
  }
};

// Silently reconnect to wallet without showing modal (for session restore)
// Uses connect with neverAsk mode and checks if wallet is preauthorized
export const reconnectWallet = async (): Promise<WalletConnection | null> => {
  try {
    // First, try to reconnect MetaMask Snap (if it was previously used)
    const metaMaskConnection = await reconnectMetaMaskSnap();
    if (metaMaskConnection) {
      return metaMaskConnection;
    }

    // Check if there's a starknet object in window (wallet extension present)
    const starknetWindow = (window as any).starknet;
    if (!starknetWindow) {
      console.log('No starknet wallet extension found');
      return null;
    }

    // Check if the wallet is preauthorized (user has previously approved this dapp)
    let isPreauthorized = false;
    if (typeof starknetWindow.isPreauthorized === 'function') {
      try {
        isPreauthorized = await starknetWindow.isPreauthorized();
      } catch {
        isPreauthorized = false;
      }
    }

    if (!isPreauthorized) {
      console.log('Wallet is not preauthorized for this dapp');
      return null;
    }

    // Wallet is preauthorized, try to connect without modal
    const result = await connect({
      modalMode: 'neverAsk',
      modalTheme: 'dark',
    });

    if (!result) {
      console.log('No wallet returned from silent connect');
      return null;
    }

    const r = result as any;
    const walletIdStr = r.id || 'unknown';
    const walletName = r.name || 'Unknown Wallet';

    // Check if wallet is already enabled/connected
    let address = r.selectedAddress || r.account?.address;
    let account = r.account;

    // If not enabled, try to enable silently (for preauthorized wallets this shouldn't show a popup)
    if (!address || !account) {
      try {
        if (typeof r.enable === 'function') {
          const enabled = await r.enable();
          if (typeof enabled === 'string') {
            address = enabled;
          } else if (Array.isArray(enabled) && enabled.length > 0) {
            address = enabled[0];
          }
          account = r.account;
        }
      } catch (enableError) {
        console.log('Could not enable wallet:', enableError);
        return null;
      }
    }

    if (!address || !account) {
      console.log('Could not get wallet address/account after enable');
      return null;
    }

    // Get chainId
    let chainId: string;
    try {
      chainId = r.chainId?.toString() || (await account.getChainId()).toString();
    } catch {
      chainId = 'unknown';
    }

    console.log('Reconnected to wallet:', { walletIdStr, walletName, address, chainId });

    return {
      address,
      account: account as AccountInterface,
      walletId: walletIdStr,
      walletName,
      chainId,
    };
  } catch (error) {
    console.log('Silent reconnect failed:', error);
    return null;
  }
};
