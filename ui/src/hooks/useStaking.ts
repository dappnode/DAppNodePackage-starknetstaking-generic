import { useState, useCallback } from 'react';
import { AccountInterface } from 'starknet';
import {
  approveSTRK,
  stakeSTRK,
  increaseStake,
  unstakeIntent,
  unstakeAction,
  claimRewards,
  changeRewardAddress,
  StakingResult,
} from '../services/staking';

export type StakingActionType =
  | 'approve'
  | 'stake'
  | 'increase_stake'
  | 'unstake_intent'
  | 'unstake_action'
  | 'claim_rewards'
  | 'change_reward_address';

interface StakingState {
  isLoading: boolean;
  currentAction: StakingActionType | null;
  lastTxHash: string | null;
  error: string | null;
}

export interface UseStakingReturn extends StakingState {
  // Approve STRK for staking contract
  approve: (account: AccountInterface, amount: number) => Promise<StakingResult>;
  // Stake STRK (approve + stake in sequence)
  stake: (
    account: AccountInterface,
    amount: number,
    operatorAddress: string,
    rewardAddress: string
  ) => Promise<StakingResult>;
  // Increase existing stake (approve + increase_stake)
  addStake: (
    account: AccountInterface,
    stakerAddress: string,
    amount: number
  ) => Promise<StakingResult>;
  // Signal intent to unstake
  initiateUnstake: (account: AccountInterface) => Promise<StakingResult>;
  // Execute unstake after cooldown
  executeUnstake: (
    account: AccountInterface,
    stakerAddress: string
  ) => Promise<StakingResult>;
  // Claim staking rewards
  claimStakingRewards: (
    account: AccountInterface,
    stakerAddress: string
  ) => Promise<StakingResult>;
  // Change reward address
  updateRewardAddress: (
    account: AccountInterface,
    newRewardAddress: string
  ) => Promise<StakingResult>;
  // Clear error
  clearError: () => void;
}

export const useStaking = (): UseStakingReturn => {
  const [state, setState] = useState<StakingState>({
    isLoading: false,
    currentAction: null,
    lastTxHash: null,
    error: null,
  });

  const setLoading = (action: StakingActionType) => {
    setState({
      isLoading: true,
      currentAction: action,
      lastTxHash: null,
      error: null,
    });
  };

  const setSuccess = (txHash: string) => {
    setState((prev) => ({
      ...prev,
      isLoading: false,
      currentAction: null,
      lastTxHash: txHash,
    }));
  };

  const setError = (error: string) => {
    setState((prev) => ({
      ...prev,
      isLoading: false,
      currentAction: null,
      error,
    }));
  };

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * Approve STRK for staking contract
   */
  const approve = useCallback(
    async (account: AccountInterface, amount: number): Promise<StakingResult> => {
      setLoading('approve');
      const result = await approveSTRK(account, amount);
      if (result.success && result.txHash) {
        setSuccess(result.txHash);
      } else {
        setError(result.error || 'Approval failed');
      }
      return result;
    },
    []
  );

  /**
   * Full stake flow: approve + stake
   */
  const stake = useCallback(
    async (
      account: AccountInterface,
      amount: number,
      operatorAddress: string,
      rewardAddress: string
    ): Promise<StakingResult> => {
      // Step 1: Approve
      setLoading('approve');
      const approveResult = await approveSTRK(account, amount);
      if (!approveResult.success) {
        setError(approveResult.error || 'Approval failed');
        return approveResult;
      }

      // Step 2: Stake
      setLoading('stake');
      const stakeResult = await stakeSTRK(
        account,
        amount,
        operatorAddress,
        rewardAddress
      );
      if (stakeResult.success && stakeResult.txHash) {
        setSuccess(stakeResult.txHash);
      } else {
        setError(stakeResult.error || 'Staking failed');
      }
      return stakeResult;
    },
    []
  );

  /**
   * Add stake: approve + increase_stake
   */
  const addStake = useCallback(
    async (
      account: AccountInterface,
      stakerAddress: string,
      amount: number
    ): Promise<StakingResult> => {
      // Step 1: Approve
      setLoading('approve');
      const approveResult = await approveSTRK(account, amount);
      if (!approveResult.success) {
        setError(approveResult.error || 'Approval failed');
        return approveResult;
      }

      // Step 2: Increase stake
      setLoading('increase_stake');
      const increaseResult = await increaseStake(account, stakerAddress, amount);
      if (increaseResult.success && increaseResult.txHash) {
        setSuccess(increaseResult.txHash);
      } else {
        setError(increaseResult.error || 'Increase stake failed');
      }
      return increaseResult;
    },
    []
  );

  /**
   * Signal intent to unstake
   */
  const initiateUnstake = useCallback(
    async (account: AccountInterface): Promise<StakingResult> => {
      setLoading('unstake_intent');
      const result = await unstakeIntent(account);
      if (result.success && result.txHash) {
        setSuccess(result.txHash);
      } else {
        setError(result.error || 'Unstake intent failed');
      }
      return result;
    },
    []
  );

  /**
   * Execute unstake after cooldown
   */
  const executeUnstake = useCallback(
    async (
      account: AccountInterface,
      stakerAddress: string
    ): Promise<StakingResult> => {
      setLoading('unstake_action');
      const result = await unstakeAction(account, stakerAddress);
      if (result.success && result.txHash) {
        setSuccess(result.txHash);
      } else {
        setError(result.error || 'Unstake action failed');
      }
      return result;
    },
    []
  );

  /**
   * Claim staking rewards
   */
  const claimStakingRewards = useCallback(
    async (
      account: AccountInterface,
      stakerAddress: string
    ): Promise<StakingResult> => {
      setLoading('claim_rewards');
      const result = await claimRewards(account, stakerAddress);
      if (result.success && result.txHash) {
        setSuccess(result.txHash);
      } else {
        setError(result.error || 'Claim rewards failed');
      }
      return result;
    },
    []
  );

  /**
   * Change reward address
   */
  const updateRewardAddress = useCallback(
    async (
      account: AccountInterface,
      newRewardAddress: string
    ): Promise<StakingResult> => {
      setLoading('change_reward_address');
      const result = await changeRewardAddress(account, newRewardAddress);
      if (result.success && result.txHash) {
        setSuccess(result.txHash);
      } else {
        setError(result.error || 'Change reward address failed');
      }
      return result;
    },
    []
  );

  return {
    ...state,
    approve,
    stake,
    addStake,
    initiateUnstake,
    executeUnstake,
    claimStakingRewards,
    updateRewardAddress,
    clearError,
  };
};

export default useStaking;
