import { useState, useEffect, useCallback } from 'react';
import { AccountInterface } from 'starknet';
import {
  connectWallet,
  disconnectWallet,
  getNetworkFromChainId,
  reconnectWallet,
  WalletConnection,
  getWalletType,
} from '../services/wallet';

export interface AuthState {
  isConnected: boolean;
  isLoading: boolean;
  address: string | null;
  walletType: string | null;
  walletName: string | null;
  network: 'Mainnet' | 'Sepolia';
  account: AccountInterface | null;
  error: string | null;
}

const initialState: AuthState = {
  isConnected: false,
  isLoading: false,
  address: null,
  walletType: null,
  walletName: null,
  network: 'Sepolia',
  account: null,
  error: null,
};

export const useAuth = () => {
  const [state, setState] = useState<AuthState>(initialState);

  // Try to reconnect wallet on mount
  useEffect(() => {
    const tryReconnect = async () => {
      setState(prev => ({ ...prev, isLoading: true }));

      try {
        const connection = await reconnectWallet();

        if (connection) {
          const network = getNetworkFromChainId(connection.chainId);
          const walletType = getWalletType(connection.walletId);

          setState({
            isConnected: true,
            isLoading: false,
            address: connection.address,
            walletType,
            walletName: connection.walletName,
            network,
            account: connection.account,
            error: null,
          });
          return;
        }
      } catch (error) {
        console.log('Reconnect failed:', error);
      }

      setState(prev => ({ ...prev, isLoading: false }));
    };

    tryReconnect();
  }, []);

  // Listen for wallet account/network changes
  useEffect(() => {
    if (!state.isConnected || !state.address || !state.account) {
      return;
    }

    let reconnectFailures = 0;
    const MAX_RECONNECT_FAILURES = 3;

    const handleDisconnect = async () => {
      console.log('Wallet disconnected or account changed');
      await disconnectWallet();
      setState(initialState);
    };

    const checkWalletState = async () => {
      try {
        // Check MetaMask Snap session
        const storedMetaMaskAddress = sessionStorage.getItem('starkstake_metamask_snap_address');
        if (storedMetaMaskAddress) {
          const ethereum = (window as any).ethereum;
          if (ethereum) {
            try {
              const snaps = await ethereum.request({ method: 'wallet_getSnaps' });
              if (snaps && snaps['npm:@consensys/starknet-snap']) {
                reconnectFailures = 0;
                return;
              }
            } catch {
              // Ignore
            }
          }
        }

        // Check standard wallets
        const starknetWindow = (window as any).starknet;
        if (starknetWindow) {
          const currentAddress = starknetWindow.selectedAddress || starknetWindow.account?.address;
          if (currentAddress && currentAddress.toLowerCase() === state.address?.toLowerCase()) {
            reconnectFailures = 0;
            return;
          }
        }

        // Try full reconnect
        const connection = await reconnectWallet();

        if (!connection) {
          reconnectFailures++;
          if (reconnectFailures >= MAX_RECONNECT_FAILURES) {
            await handleDisconnect();
          }
          return;
        }

        reconnectFailures = 0;

        // Check if address changed
        if (connection.address.toLowerCase() !== state.address?.toLowerCase()) {
          await handleDisconnect();
          return;
        }

        // Check if network changed
        const newNetwork = getNetworkFromChainId(connection.chainId);
        if (newNetwork !== state.network) {
          setState(prev => ({
            ...prev,
            network: newNetwork,
            account: connection.account,
          }));
        }
      } catch (error) {
        console.log('Error checking wallet state:', error);
      }
    };

    // Subscribe to wallet events
    const walletProvider = (state.account as any)?.provider || (window as any).starknet;

    const handleAccountsChanged = (accounts: string[]) => {
      if (!accounts.length || accounts[0]?.toLowerCase() !== state.address?.toLowerCase()) {
        handleDisconnect();
      }
    };

    const handleNetworkChanged = (chainId: string) => {
      const newNetwork = getNetworkFromChainId(chainId);
      if (newNetwork !== state.network) {
        setState(prev => ({ ...prev, network: newNetwork }));
      }
    };

    if (walletProvider?.on) {
      walletProvider.on('accountsChanged', handleAccountsChanged);
      walletProvider.on('networkChanged', handleNetworkChanged);
    }

    // Check on window focus
    const handleFocus = () => checkWalletState();
    window.addEventListener('focus', handleFocus);

    return () => {
      if (walletProvider?.off) {
        walletProvider.off('accountsChanged', handleAccountsChanged);
        walletProvider.off('networkChanged', handleNetworkChanged);
      }
      window.removeEventListener('focus', handleFocus);
    };
  }, [state.isConnected, state.address, state.network, state.account]);

  // Connect wallet
  const connect = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const connection: WalletConnection | null = await connectWallet();

      if (!connection) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'No wallet selected',
        }));
        return false;
      }

      const { address, account, walletId, walletName, chainId } = connection;
      const network = getNetworkFromChainId(chainId);
      const walletType = getWalletType(walletId);

      console.log('Wallet connected:', { walletId, walletName, walletType, address });

      if (!address || address === 'undefined' || address === 'null') {
        throw new Error('Invalid wallet address received');
      }

      setState({
        isConnected: true,
        isLoading: false,
        address,
        walletType,
        walletName,
        network,
        account,
        error: null,
      });

      return true;
    } catch (error: any) {
      console.error('Connect error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to connect',
      }));
      return false;
    }
  }, []);

  // Disconnect wallet
  const disconnect = useCallback(async () => {
    await disconnectWallet();
    setState(initialState);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    clearError,
  };
};

export default useAuth;
