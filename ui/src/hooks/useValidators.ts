import { useState, useCallback } from 'react';
import {
  getStakerInfo,
  checkUnstakeEligibility,
  StakerInfo,
  UnstakeEligibility,
  weiToStrk,
} from '../services/blockchain';

// Validator status derived from blockchain state
export type ValidatorStatus = 'ACTIVE' | 'EXITING' | 'EXITED' | 'NOT_STAKING';

export interface ValidatorData {
  stakerAddress: string;
  operatorAddress: string;
  rewardAddress: string;
  amountStaked: string; // In STRK (not wei)
  amountStakedWei: string;
  unclaimedRewards: string; // In STRK
  unclaimedRewardsWei: string;
  status: ValidatorStatus;
  unstakeTime: string;
}

interface ValidatorsState {
  validator: ValidatorData | null;
  isLoading: boolean;
  error: string | null;
  // Raw blockchain staker info
  stakerInfo: StakerInfo | null;
  // Unstake eligibility
  unstakeEligibility: UnstakeEligibility | null;
}

export const useValidators = () => {
  const [state, setState] = useState<ValidatorsState>({
    validator: null,
    isLoading: false,
    error: null,
    stakerInfo: null,
    unstakeEligibility: null,
  });

  // Derive validator status from blockchain data
  const deriveStatus = (stakerInfo: StakerInfo): ValidatorStatus => {
    const amountOwn = BigInt(stakerInfo.amountOwn || '0');
    const unstakeTime = BigInt(stakerInfo.unstakeTime || '0');

    if (amountOwn === 0n && unstakeTime === 0n) {
      return 'NOT_STAKING';
    }

    if (unstakeTime > 0n) {
      if (amountOwn === 0n) {
        return 'EXITED';
      }
      return 'EXITING';
    }

    return 'ACTIVE';
  };

  // Convert StakerInfo to ValidatorData
  const toValidatorData = (stakerAddress: string, info: StakerInfo): ValidatorData => {
    return {
      stakerAddress,
      operatorAddress: info.operationalAddress,
      rewardAddress: info.rewardAddress,
      amountStaked: weiToStrk(info.amountOwn),
      amountStakedWei: info.amountOwn,
      unclaimedRewards: weiToStrk(info.unclaimedRewardsOwn),
      unclaimedRewardsWei: info.unclaimedRewardsOwn,
      status: deriveStatus(info),
      unstakeTime: info.unstakeTime,
    };
  };

  // Fetch staker info from blockchain
  const fetchStakerInfo = useCallback(async (stakerAddress: string): Promise<StakerInfo | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const info = await getStakerInfo(stakerAddress);

      if (info) {
        const validator = toValidatorData(stakerAddress, info);
        const eligibility = checkUnstakeEligibility(info);

        setState({
          validator,
          stakerInfo: info,
          unstakeEligibility: eligibility,
          isLoading: false,
          error: null,
        });

        return info;
      } else {
        // Not staking
        setState({
          validator: null,
          stakerInfo: null,
          unstakeEligibility: null,
          isLoading: false,
          error: null,
        });
        return null;
      }
    } catch (error: any) {
      console.error('Error fetching staker info:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to fetch staker info',
      }));
      return null;
    }
  }, []);

  // Refresh validator data (alias for fetchStakerInfo)
  const refreshValidator = useCallback(async (stakerAddress: string) => {
    return fetchStakerInfo(stakerAddress);
  }, [fetchStakerInfo]);

  // Check unstake eligibility
  const fetchUnstakeEligibility = useCallback(async (stakerAddress: string): Promise<UnstakeEligibility | null> => {
    try {
      const info = await getStakerInfo(stakerAddress);
      const eligibility = checkUnstakeEligibility(info);

      setState(prev => ({
        ...prev,
        unstakeEligibility: eligibility,
      }));

      return eligibility;
    } catch (error: any) {
      console.error('Error checking unstake eligibility:', error);
      return null;
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Reset state (e.g., on disconnect)
  const reset = useCallback(() => {
    setState({
      validator: null,
      isLoading: false,
      error: null,
      stakerInfo: null,
      unstakeEligibility: null,
    });
  }, []);

  return {
    ...state,
    fetchStakerInfo,
    refreshValidator,
    fetchUnstakeEligibility,
    clearError,
    reset,
  };
};

export default useValidators;
