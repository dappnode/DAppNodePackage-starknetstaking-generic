import { useState, useCallback } from 'react';
import { getBalance, BalanceData } from '../services/blockchain';

interface BalanceState {
  balance: BalanceData | null;
  isLoading: boolean;
  error: string | null;
}

export const useBalance = () => {
  const [state, setState] = useState<BalanceState>({
    balance: null,
    isLoading: false,
    error: null,
  });

  // Fetch balance for an address directly from blockchain
  const fetchBalance = useCallback(async (address: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const balanceData = await getBalance(address);

      setState({
        balance: balanceData,
        isLoading: false,
        error: null,
      });

      return balanceData;
    } catch (error: any) {
      console.error('Error fetching balance:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to fetch balance',
      }));
      return null;
    }
  }, []);

  // Format balance for display (convert from wei to STRK)
  const formatBalance = useCallback((balanceData: BalanceData | null): string => {
    if (!balanceData) return '0';

    const { balance, decimals } = balanceData;
    const balanceNum = BigInt(balance);
    const divisor = BigInt(10 ** decimals);
    const whole = balanceNum / divisor;
    const fraction = balanceNum % divisor;

    // Format with 2 decimal places
    const fractionStr = fraction.toString().padStart(decimals, '0').slice(0, 2);
    return `${whole.toLocaleString()}.${fractionStr}`;
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Reset state
  const reset = useCallback(() => {
    setState({
      balance: null,
      isLoading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    fetchBalance,
    formatBalance,
    clearError,
    reset,
  };
};

export default useBalance;
