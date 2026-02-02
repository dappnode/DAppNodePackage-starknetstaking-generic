import React, { useEffect, useState, useCallback } from 'react';
import Landing from './components/Landing';
import Dashboard from './components/Dashboard';
import Header from './components/Header';
import { useAuth } from './src/hooks/useAuth';
import { useValidators } from './src/hooks/useValidators';
import { useBalance } from './src/hooks/useBalance';
import { useStaking } from './src/hooks/useStaking';
import { Network, Validator } from './types';
import { NETWORK } from './src/config';

// Format network name for display (capitalize first letter)
const targetNetwork = NETWORK.charAt(0).toUpperCase() + NETWORK.slice(1);

const App: React.FC = () => {
  const auth = useAuth();
  const validatorsHook = useValidators();
  const stakingHook = useStaking();
  const stakerBalance = useBalance();
  const operatorBalance = useBalance();
  const rewardsBalance = useBalance();

  const [operatorAddress, setOperatorAddress] = useState<string>('');
  const [rewardsAddress, setRewardsAddress] = useState<string>('');

  // Fetch staker info from blockchain when connected
  useEffect(() => {
    if (auth.isConnected && auth.address && !auth.isLoading) {
      validatorsHook.fetchStakerInfo(auth.address);
    }
  }, [auth.isConnected, auth.address, auth.isLoading]);

  // Fetch staker balance when connected
  useEffect(() => {
    if (auth.isConnected && auth.address) {
      stakerBalance.fetchBalance(auth.address);
    }
  }, [auth.isConnected, auth.address]);

  // Create wallet state object for components
  const walletState = {
    connected: auth.isConnected,
    address: auth.address ? `${auth.address.slice(0, 6)}...${auth.address.slice(-4)}` : null,
    walletType: auth.walletType as any,
    network: auth.network as Network,
    isWrongNetwork: auth.isWrongNetwork,
  };

  // Get blockchain staker info
  const stakerInfo = validatorsHook.stakerInfo;
  const validator = validatorsHook.validator;

  // Derive addresses from blockchain staker info
  const derivedOperatorAddress = stakerInfo?.operationalAddress && stakerInfo.operationalAddress !== '0x0'
    ? stakerInfo.operationalAddress
    : operatorAddress;

  const derivedRewardsAddress = stakerInfo?.rewardAddress && stakerInfo.rewardAddress !== '0x0'
    ? stakerInfo.rewardAddress
    : rewardsAddress;

  // Fetch operator and rewards balances when addresses are available
  useEffect(() => {
    if (derivedOperatorAddress && derivedOperatorAddress !== operatorAddress) {
      setOperatorAddress(derivedOperatorAddress);
      operatorBalance.fetchBalance(derivedOperatorAddress);
    }
  }, [derivedOperatorAddress]);

  useEffect(() => {
    if (derivedRewardsAddress && derivedRewardsAddress !== rewardsAddress) {
      setRewardsAddress(derivedRewardsAddress);
      rewardsBalance.fetchBalance(derivedRewardsAddress);
    }
  }, [derivedRewardsAddress]);

  // Calculate staked amount from blockchain info (own stake + pooled/delegated stake)
  const ownStake = stakerInfo?.amountOwn ? BigInt(stakerInfo.amountOwn) : BigInt(0);
  const pooledStake = stakerInfo?.pooledAmount ? BigInt(stakerInfo.pooledAmount) : BigInt(0);
  const stakedAmountFromBlockchain = Number((ownStake + pooledStake) / BigInt(10 ** 18));

  // Calculate unclaimed rewards from blockchain info
  const ownRewards = stakerInfo?.unclaimedRewardsOwn ? BigInt(stakerInfo.unclaimedRewardsOwn) : BigInt(0);
  const unclaimedRewardsFromBlockchain = Number(ownRewards / BigInt(10 ** 18));

  // Create balances object for Dashboard
  const balances = {
    staker: {
      address: auth.address || '',
      amount: stakerBalance.balance
        ? Number(BigInt(stakerBalance.balance.balance) / BigInt(10 ** 18))
        : 0,
      stakedAmount: stakedAmountFromBlockchain,
    },
    operator: {
      address: derivedOperatorAddress || '',
      amount: operatorBalance.balance
        ? Number(BigInt(operatorBalance.balance.balance) / BigInt(10 ** 18))
        : 0,
    },
    rewards: {
      address: derivedRewardsAddress || '',
      amount: rewardsBalance.balance
        ? Number(BigInt(rewardsBalance.balance.balance) / BigInt(10 ** 18))
        : 0,
      unclaimedRewards: unclaimedRewardsFromBlockchain,
    },
  };

  // Get unstake eligibility from hook
  const unstakeEligibility = validatorsHook.unstakeEligibility;

  // Transform validator from blockchain format to frontend format
  const validators: Validator[] = validator ? [{
    id: validator.stakerAddress, // Use staker address as ID
    stakerAddress: validator.stakerAddress,
    operatorAddress: validator.operatorAddress,
    rewardAddress: validator.rewardAddress,
    amount: validator.amountStaked,
    status: validator.status.toLowerCase() as 'active' | 'paused' | 'exiting' | 'exited',
    rewardsEarned: validator.unclaimedRewards,
    unstakeIntentAt: validator.unstakeTime !== '0' ? new Date(Number(validator.unstakeTime) * 1000).toISOString() : undefined,
    unstakeEligibleAt: unstakeEligibility?.unstakeEligibleAt?.toISOString(),
    unstakeTxHash: undefined,
    exitTxHash: undefined,
  }] : [];

  // Refresh data after transactions
  const refreshData = useCallback(async () => {
    if (auth.address) {
      await validatorsHook.fetchStakerInfo(auth.address);
      await stakerBalance.fetchBalance(auth.address);
      if (derivedOperatorAddress) {
        await operatorBalance.fetchBalance(derivedOperatorAddress);
      }
      if (derivedRewardsAddress) {
        await rewardsBalance.fetchBalance(derivedRewardsAddress);
      }
    }
  }, [auth.address, derivedOperatorAddress, derivedRewardsAddress]);

  // Handlers
  const handleConnect = async () => {
    await auth.connect();
  };

  const handleDisconnect = async () => {
    await auth.disconnect();
    validatorsHook.reset();
    stakerBalance.reset();
    operatorBalance.reset();
    rewardsBalance.reset();
  };

  const handleAddValidator = async (amount: number, operator: string, reward: string) => {
    if (!auth.account) return;

    const result = await stakingHook.stake(auth.account, amount, operator, reward);

    if (result.success) {
      // Update operator and rewards addresses
      setOperatorAddress(operator);
      setRewardsAddress(reward);

      // Refresh all data
      await refreshData();
      operatorBalance.fetchBalance(operator);
      rewardsBalance.fetchBalance(reward);
    }
  };

  const handleUpdateRewardAddress = async (_id: string, newAddress: string) => {
    if (!auth.account) return;

    const result = await stakingHook.updateRewardAddress(auth.account, newAddress);

    if (result.success) {
      setRewardsAddress(newAddress);
      await refreshData();
      rewardsBalance.fetchBalance(newAddress);
    }
  };

  const handleUpdateGlobalRewardAddress = async (newAddress: string) => {
    if (!auth.account) return;

    const result = await stakingHook.updateRewardAddress(auth.account, newAddress);

    if (result.success) {
      setRewardsAddress(newAddress);
      await refreshData();
      rewardsBalance.fetchBalance(newAddress);
    }
  };

  const handleClaimRewards = async (_id: string) => {
    if (!auth.account || !auth.address) return;

    const result = await stakingHook.claimStakingRewards(auth.account, auth.address);

    if (result.success) {
      await refreshData();
    }
  };

  const handleClaimAllRewards = async (_amount: number) => {
    if (!auth.account || !auth.address) return;

    const result = await stakingHook.claimStakingRewards(auth.account, auth.address);

    if (result.success) {
      await refreshData();
    }
  };

  // Show loading state
  if (auth.isLoading) {
    return (
      <div className="min-h-screen bg-[#0c0c14] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <p className="text-white/60">Connecting...</p>
        </div>
      </div>
    );
  }

  // Combine errors from all hooks
  const error = auth.error || validatorsHook.error || stakingHook.error;

  return (
    <div className="min-h-screen bg-[#0c0c14] text-white">
      <Header
        wallet={walletState}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {!auth.isConnected || auth.isWrongNetwork ? (
          <Landing
            onConnect={handleConnect}
            targetNetwork={targetNetwork}
            isWrongNetwork={auth.isWrongNetwork}
            currentNetwork={auth.network}
          />
        ) : (
          <Dashboard
            wallet={walletState}
            balances={balances}
            validators={validators}
            onAddValidator={handleAddValidator}
            onUpdateRewardAddress={handleUpdateRewardAddress}
            onUpdateGlobalRewardAddress={handleUpdateGlobalRewardAddress}
            onClaimRewards={handleClaimRewards}
            onClaimAllRewards={handleClaimAllRewards}
            account={auth.account}
            stakerAddress={auth.address || undefined}
            network={auth.network}
            unstakeEligibility={unstakeEligibility}
          />
        )}
      </main>

      {/* Loading Overlay for Transactions */}
      {stakingHook.isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1a1a2e] p-6 rounded-xl shadow-lg flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <p className="text-white/80">
              {stakingHook.currentAction === 'approve' && 'Approving STRK...'}
              {stakingHook.currentAction === 'stake' && 'Staking STRK...'}
              {stakingHook.currentAction === 'claim_rewards' && 'Claiming rewards...'}
              {stakingHook.currentAction === 'change_reward_address' && 'Changing reward address...'}
              {stakingHook.currentAction === 'unstake_intent' && 'Initiating unstake...'}
              {stakingHook.currentAction === 'unstake_action' && 'Completing unstake...'}
              {!stakingHook.currentAction && 'Processing...'}
            </p>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500/90 text-white px-6 py-4 rounded-xl shadow-lg max-w-sm">
          <p className="font-medium">Error</p>
          <p className="text-sm text-white/80">{error}</p>
          <button
            onClick={() => {
              auth.clearError();
              validatorsHook.clearError();
              stakingHook.clearError();
            }}
            className="absolute top-2 right-2 text-white/60 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      )}

      <footer className="py-12 border-t border-white/5 mt-20">
        <div className="container mx-auto px-4 text-center text-white/40 text-sm">
          <p>© 2026 Dappnode Association. Powered by Dappnode.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
