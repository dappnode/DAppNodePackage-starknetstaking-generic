import { AccountInterface, uint256, CallData } from 'starknet';
import { STRK_TOKEN_ADDRESS, STAKING_CONTRACT_ADDRESS, NETWORK } from '../config';
import { waitForTransaction } from './rpc';
import { getAllowance } from './blockchain';

export interface StakingResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

/**
 * Convert STRK amount to wei (18 decimals)
 */
export const toWei = (amount: number): bigint => {
  return BigInt(Math.floor(amount * 10 ** 18));
};

/**
 * Get explorer URL for transaction
 */
const getExplorerUrl = (txHash: string): string => {
  const baseUrl = NETWORK === 'mainnet'
    ? 'https://voyager.online'
    : 'https://sepolia.voyager.online';
  return `${baseUrl}/tx/${txHash}`;
};

/**
 * Wait for transaction with timeout using direct RPC
 */
const waitForTx = async (txHash: string): Promise<void> => {
  console.log('Waiting for transaction confirmation:', txHash);

  const result = await waitForTransaction(txHash);

  if (result.success) {
    console.log('Transaction confirmed:', txHash, 'Status:', result.status);
  } else {
    // Log but don't throw - tx was submitted, user can check on explorer
    console.warn('Transaction confirmation issue:', result.error);
    console.log('Transaction was submitted. Check status on Voyager:', getExplorerUrl(txHash));
  }
};

/**
 * Check current STRK allowance for the staking contract
 */
export const checkAllowance = async (ownerAddress: string): Promise<bigint> => {
  try {
    return await getAllowance(ownerAddress);
  } catch (error) {
    console.error('Failed to check allowance:', error);
    return BigInt(0);
  }
};

/**
 * Approve STRK tokens for staking contract (only if needed)
 */
export const approveSTRK = async (
  account: AccountInterface,
  amount: number
): Promise<StakingResult> => {
  try {
    const amountWei = toWei(amount);

    // Check current allowance
    const currentAllowance = await checkAllowance(account.address);
    console.log('Current allowance:', currentAllowance.toString(), 'Required:', amountWei.toString());

    // If allowance is sufficient, skip approval
    if (currentAllowance >= amountWei) {
      console.log('Sufficient allowance already exists, skipping approval');
      return {
        success: true,
        txHash: undefined, // No tx needed
      };
    }

    console.log('Approving STRK tokens...', { amount });

    const amountUint256 = uint256.bnToUint256(amountWei);

    const result = await account.execute({
      contractAddress: STRK_TOKEN_ADDRESS,
      entrypoint: 'approve',
      calldata: CallData.compile({
        spender: STAKING_CONTRACT_ADDRESS,
        amount: amountUint256,
      }),
    });

    console.log('Approval transaction submitted:', result.transaction_hash);

    await waitForTx(result.transaction_hash);

    console.log('Approval confirmed');

    return {
      success: true,
      txHash: result.transaction_hash,
    };
  } catch (error: any) {
    console.error('Approval failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to approve STRK',
    };
  }
};

/**
 * Stake STRK tokens
 * Contract signature: stake(reward_address: ContractAddress, operational_address: ContractAddress, amount: Amount)
 * See: https://github.com/starkware-libs/starknet-staking/blob/main/docs/spec.md
 */
export const stakeSTRK = async (
  account: AccountInterface,
  amount: number,
  operatorAddress: string,
  rewardAddress: string
): Promise<StakingResult> => {
  try {
    console.log('Staking STRK tokens...', { amount, operatorAddress, rewardAddress });

    const amountWei = toWei(amount);

    // Use raw calldata array
    // stake(reward_address, operational_address, amount)
    const result = await account.execute({
      contractAddress: STAKING_CONTRACT_ADDRESS,
      entrypoint: 'stake',
      calldata: [
        rewardAddress,
        operatorAddress,
        amountWei.toString(),
      ],
    });

    console.log('Stake transaction submitted:', result.transaction_hash);

    await waitForTx(result.transaction_hash);

    console.log('Stake confirmed');

    return {
      success: true,
      txHash: result.transaction_hash,
    };
  } catch (error: any) {
    console.error('Staking failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to stake STRK',
    };
  }
};

/**
 * Increase stake amount
 */
export const increaseStake = async (
  account: AccountInterface,
  stakerAddress: string,
  amount: number
): Promise<StakingResult> => {
  try {
    console.log('Increasing stake...', { stakerAddress, amount });

    const amountWei = toWei(amount);

    // Use raw calldata array to avoid type conversion issues
    // increase_stake(staker_address: felt, amount: u128)
    const result = await account.execute({
      contractAddress: STAKING_CONTRACT_ADDRESS,
      entrypoint: 'increase_stake',
      calldata: [
        stakerAddress,
        amountWei.toString(),
      ],
    });

    console.log('Increase stake transaction submitted:', result.transaction_hash);

    await waitForTx(result.transaction_hash);

    return {
      success: true,
      txHash: result.transaction_hash,
    };
  } catch (error: any) {
    console.error('Increase stake failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to increase stake',
    };
  }
};

/**
 * Initiate unstaking (intent)
 */
export const unstakeIntent = async (
  account: AccountInterface
): Promise<StakingResult> => {
  try {
    console.log('Initiating unstake...');

    const result = await account.execute({
      contractAddress: STAKING_CONTRACT_ADDRESS,
      entrypoint: 'unstake_intent',
      calldata: [],
    });

    console.log('Unstake intent submitted:', result.transaction_hash);

    await waitForTx(result.transaction_hash);

    return {
      success: true,
      txHash: result.transaction_hash,
    };
  } catch (error: any) {
    console.error('Unstake intent failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to initiate unstake',
    };
  }
};

/**
 * Complete unstaking (action)
 */
export const unstakeAction = async (
  account: AccountInterface,
  stakerAddress: string
): Promise<StakingResult> => {
  try {
    console.log('Completing unstake...', { stakerAddress });

    const result = await account.execute({
      contractAddress: STAKING_CONTRACT_ADDRESS,
      entrypoint: 'unstake_action',
      calldata: [stakerAddress],
    });

    console.log('Unstake action submitted:', result.transaction_hash);

    await waitForTx(result.transaction_hash);

    return {
      success: true,
      txHash: result.transaction_hash,
    };
  } catch (error: any) {
    console.error('Unstake action failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to complete unstake',
    };
  }
};

/**
 * Claim staking rewards
 */
export const claimRewards = async (
  account: AccountInterface,
  stakerAddress: string
): Promise<StakingResult> => {
  try {
    console.log('Claiming rewards...', { stakerAddress });

    const result = await account.execute({
      contractAddress: STAKING_CONTRACT_ADDRESS,
      entrypoint: 'claim_rewards',
      calldata: [stakerAddress],
    });

    console.log('Claim rewards submitted:', result.transaction_hash);

    await waitForTx(result.transaction_hash);

    return {
      success: true,
      txHash: result.transaction_hash,
    };
  } catch (error: any) {
    console.error('Claim rewards failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to claim rewards',
    };
  }
};

/**
 * Change reward address
 */
export const changeRewardAddress = async (
  account: AccountInterface,
  newRewardAddress: string
): Promise<StakingResult> => {
  try {
    console.log('Changing reward address...', { newRewardAddress });

    const result = await account.execute({
      contractAddress: STAKING_CONTRACT_ADDRESS,
      entrypoint: 'change_reward_address',
      calldata: [newRewardAddress],
    });

    console.log('Change reward address submitted:', result.transaction_hash);

    await waitForTx(result.transaction_hash);

    return {
      success: true,
      txHash: result.transaction_hash,
    };
  } catch (error: any) {
    console.error('Change reward address failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to change reward address',
    };
  }
};
