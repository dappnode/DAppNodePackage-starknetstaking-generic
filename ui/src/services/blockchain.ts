import { CallData } from 'starknet';
import { getProvider } from './rpc';
import { STRK_TOKEN_ADDRESS, STAKING_CONTRACT_ADDRESS } from '../config';

// Exit window delay varies by network:
// - Mainnet: 7 days
// - Sepolia: 5 minutes
// Note: The contract's unstake_time field already contains the eligible timestamp,
// so we don't need to calculate it ourselves.

export interface StakerInfo {
  rewardAddress: string;
  operationalAddress: string;
  unstakeTime: string;
  amountOwn: string;
  unclaimedRewardsOwn: string;
  // Pool info (if staker has a pool)
  poolContract: string;
  pooledAmount: string;
  poolCommission: string;
}

export interface BalanceData {
  address: string;
  balance: string;
  decimals: number;
  symbol: string;
}

export type UnstakeStatus = 'NOT_INITIATED' | 'WAITING_COOLDOWN' | 'READY_TO_FINALIZE' | 'COMPLETED';

export interface UnstakeEligibility {
  canUnstake: boolean;
  unstakeEligibleAt: Date | null;
  remainingSeconds: number;
  status: UnstakeStatus;
}

// Helper to convert felt/bigint to string
const feltToString = (value: any): string => {
  if (value === null || value === undefined) return '0';
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  return '0';
};

// Helper to convert to hex address
const toHexAddress = (value: any): string => {
  if (!value) return '0x0';
  if (typeof value === 'bigint') return '0x' + value.toString(16);
  if (typeof value === 'string') {
    if (value.startsWith('0x')) return value;
    try {
      return '0x' + BigInt(value).toString(16);
    } catch {
      return '0x0';
    }
  }
  try {
    return '0x' + BigInt(value).toString(16);
  } catch {
    return '0x0';
  }
};

// Convert Uint256 (low, high) to bigint string
const uint256ToString = (low: any, high: any): string => {
  const lowBn = BigInt(feltToString(low));
  const highBn = BigInt(feltToString(high));
  const result = lowBn + (highBn << 128n);
  return result.toString();
};

/**
 * Get STRK balance for an address using direct callContract
 */
export const getBalance = async (address: string): Promise<BalanceData> => {
  const provider = getProvider();

  console.log(`[Blockchain] Fetching balance for ${address}`);

  try {
    const result = await provider.callContract({
      contractAddress: STRK_TOKEN_ADDRESS,
      entrypoint: 'balanceOf',
      calldata: CallData.compile({ account: address }),
    });

    // Result is [low, high] for Uint256
    const balance = uint256ToString(result[0], result[1]);

    console.log(`[Blockchain] Balance: ${balance} wei`);

    return {
      address,
      balance,
      decimals: 18,
      symbol: 'STRK',
    };
  } catch (error: any) {
    console.error(`[Blockchain] Error fetching balance:`, error);
    throw error;
  }
};

/**
 * Get STRK allowance for staking contract
 */
export const getAllowance = async (ownerAddress: string): Promise<bigint> => {
  const provider = getProvider();

  console.log(`[Blockchain] Checking allowance for ${ownerAddress}`);

  try {
    const result = await provider.callContract({
      contractAddress: STRK_TOKEN_ADDRESS,
      entrypoint: 'allowance',
      calldata: CallData.compile({
        owner: ownerAddress,
        spender: STAKING_CONTRACT_ADDRESS,
      }),
    });

    // Result is [low, high] for Uint256
    const allowance = BigInt(uint256ToString(result[0], result[1]));

    console.log(`[Blockchain] Allowance: ${allowance.toString()} wei`);

    return allowance;
  } catch (error: any) {
    console.error(`[Blockchain] Error checking allowance:`, error);
    return BigInt(0);
  }
};

/**
 * Get staker info from staking contract
 */
export const getStakerInfo = async (stakerAddress: string): Promise<StakerInfo | null> => {
  const provider = getProvider();

  console.log(`[Blockchain] Fetching staker info for ${stakerAddress}`);

  try {
    const result = await provider.callContract({
      contractAddress: STAKING_CONTRACT_ADDRESS,
      entrypoint: 'get_staker_info_v1',
      calldata: CallData.compile({ staker_address: stakerAddress }),
    });

    console.log(`[Blockchain] Raw staker info result:`, result);

    // Check if result is empty
    if (!result || result.length === 0) {
      console.log(`[Blockchain] Staker ${stakerAddress} not found (empty result)`);
      return null;
    }

    // Result structure for Option<StakerInfo> from get_staker_info_v1:
    // NOTE: This contract uses INVERTED Option encoding:
    //   0 = Some (has data), 1 = None (no data)
    //
    // [0] = Option marker: 0 = Some, 1 = None
    // If Some (marker = 0):
    //   [1] = reward_address
    //   [2] = operational_address
    //   [3] = Option<unstake_time> marker: 0 = Some, 1 = None
    //   [4] = unstake_time.seconds (only if marker is 0)
    //   [next] = amount_own
    //   [next] = unclaimed_rewards_own
    //   [next] = Option<pool_info> marker: 0 = Some, 1 = None
    //   If pool_info is Some (marker = 0):
    //     [next] = pool_contract
    //     [next] = amount
    //     [next] = commission

    let idx = 0;

    // Check outer Option<StakerInfo> (0 = Some, 1 = None)
    const optionMarker = BigInt(result[idx++] || '0');
    if (optionMarker !== 0n) {
      console.log(`[Blockchain] Staker ${stakerAddress} not found (Option::None, marker=${optionMarker})`);
      return null;
    }

    // Parse StakerInfo fields
    const rewardAddress = toHexAddress(result[idx++]);
    const operationalAddress = toHexAddress(result[idx++]);

    // Parse Option<unstake_time> (0 = Some, 1 = None)
    const unstakeTimeMarker = BigInt(result[idx++] || '0');
    let unstakeTime = '0';
    if (unstakeTimeMarker === 0n) {
      unstakeTime = feltToString(result[idx++]); // seconds
    }

    const amountOwn = feltToString(result[idx++]);
    const unclaimedRewardsOwn = feltToString(result[idx++]);

    // Parse Option<pool_info> (0 = Some, 1 = None)
    const poolMarker = BigInt(result[idx++] || '0');
    let poolContract = '';
    let pooledAmount = '0';
    let poolCommission = '0';

    if (poolMarker === 0n) {
      poolContract = toHexAddress(result[idx++]);
      pooledAmount = feltToString(result[idx++]);
      poolCommission = feltToString(result[idx++]);
    }

    console.log(`[Blockchain] Parsed staker info - reward: ${rewardAddress}, op: ${operationalAddress}, unstakeTime: ${unstakeTime}, amount: ${amountOwn}`);

    const stakerInfo: StakerInfo = {
      rewardAddress,
      operationalAddress,
      unstakeTime,
      amountOwn,
      unclaimedRewardsOwn,
      poolContract,
      pooledAmount,
      poolCommission,
    };

    console.log(`[Blockchain] Staker info:`, stakerInfo);

    return stakerInfo;
  } catch (error: any) {
    console.error(`[Blockchain] Error fetching staker info:`, error);
    throw error;
  }
};

/**
 * Check unstake eligibility based on staker info
 */
export const checkUnstakeEligibility = (stakerInfo: StakerInfo | null): UnstakeEligibility => {
  console.log('[checkUnstakeEligibility] Input stakerInfo:', stakerInfo);

  if (!stakerInfo) {
    console.log('[checkUnstakeEligibility] No stakerInfo, returning NOT_INITIATED');
    return {
      canUnstake: false,
      unstakeEligibleAt: null,
      remainingSeconds: 0,
      status: 'NOT_INITIATED',
    };
  }

  const unstakeTime = BigInt(stakerInfo.unstakeTime || '0');
  console.log('[checkUnstakeEligibility] unstakeTime:', unstakeTime.toString());

  // If unstake_time is 0, unstake has not been initiated
  if (unstakeTime === 0n) {
    console.log('[checkUnstakeEligibility] unstakeTime is 0, returning NOT_INITIATED');
    return {
      canUnstake: false,
      unstakeEligibleAt: null,
      remainingSeconds: 0,
      status: 'NOT_INITIATED',
    };
  }

  // The contract's unstake_time is the timestamp when unstaking becomes eligible
  // (not when the intent was initiated)
  const unstakeEligibleAt = new Date(Number(unstakeTime) * 1000);
  const now = new Date();

  console.log('[checkUnstakeEligibility] unstakeEligibleAt:', unstakeEligibleAt.toISOString());
  console.log('[checkUnstakeEligibility] now:', now.toISOString());
  console.log('[checkUnstakeEligibility] now < unstakeEligibleAt:', now < unstakeEligibleAt);

  // Check if cooldown has passed
  if (now < unstakeEligibleAt) {
    const remainingMs = unstakeEligibleAt.getTime() - now.getTime();
    const remainingSeconds = Math.ceil(remainingMs / 1000);

    console.log('[checkUnstakeEligibility] WAITING_COOLDOWN, remainingSeconds:', remainingSeconds);
    return {
      canUnstake: false,
      unstakeEligibleAt,
      remainingSeconds,
      status: 'WAITING_COOLDOWN',
    };
  }

  // Check if already completed (amountOwn is 0)
  const amountOwn = BigInt(stakerInfo.amountOwn || '0');
  console.log('[checkUnstakeEligibility] amountOwn:', amountOwn.toString());

  if (amountOwn === 0n) {
    console.log('[checkUnstakeEligibility] amountOwn is 0, returning COMPLETED');
    return {
      canUnstake: false,
      unstakeEligibleAt,
      remainingSeconds: 0,
      status: 'COMPLETED',
    };
  }

  // Ready to finalize
  console.log('[checkUnstakeEligibility] Cooldown passed, returning READY_TO_FINALIZE');
  return {
    canUnstake: true,
    unstakeEligibleAt,
    remainingSeconds: 0,
    status: 'READY_TO_FINALIZE',
  };
};

/**
 * Convert wei to STRK for display
 */
export const weiToStrk = (weiAmount: string): string => {
  if (!weiAmount || weiAmount === '0') return '0';
  try {
    const wei = BigInt(weiAmount);
    const decimals = BigInt(10 ** 18);
    const whole = wei / decimals;
    const fraction = wei % decimals;
    const fractionStr = fraction.toString().padStart(18, '0').slice(0, 6);
    const trimmedFraction = fractionStr.replace(/0+$/, '');
    return trimmedFraction ? `${whole}.${trimmedFraction}` : whole.toString();
  } catch {
    return '0';
  }
};
