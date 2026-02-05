import React, { useState, useEffect } from 'react';
import { AccountInterface } from 'starknet';
import { Icons, STAKING_REQUIREMENTS } from '../constants';
import {
  approveSTRK,
  stakeSTRK,
  increaseStake,
  unstakeIntent,
  unstakeAction,
  claimRewards,
  changeRewardAddress,
} from '../src/services/staking';
import { UnstakeStatus } from '../src/services/blockchain';

interface ActionModalProps {
  type: 'stake' | 'unstake' | 'increase' | 'claim' | 'change_reward';
  onClose: () => void;
  onSubmit: (data: any) => void;
  maxStake?: number;
  account?: AccountInterface | null;
  stakerAddress?: string;
  network?: 'Mainnet' | 'Sepolia';
  // Unstake-specific props
  unstakeStatus?: UnstakeStatus;
  unstakeEligibleAt?: Date | null;
  onUnstakeIntentSuccess?: (txHash: string) => void;
  onUnstakeActionSuccess?: (txHash: string) => void;
}

// Helper function to format remaining time
const formatDuration = (seconds: number): string => {
  if (seconds <= 0) return '0s';

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 && days === 0) parts.push(`${secs}s`);

  return parts.join(' ') || '0s';
};

const ActionModal: React.FC<ActionModalProps> = ({
  type,
  onClose,
  onSubmit,
  maxStake = 0,
  account,
  stakerAddress,
  network = 'Mainnet',
  unstakeStatus = 'NOT_INITIATED',
  unstakeEligibleAt,
  onUnstakeIntentSuccess,
  onUnstakeActionSuccess,
}) => {
  // Helper to get the correct Voyager URL based on network
  const getVoyagerUrl = (path: string) => {
    const baseUrl = network === 'Sepolia' ? 'https://sepolia.voyager.online' : 'https://voyager.online';
    return `${baseUrl}${path}`;
  };
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const minStake = network === 'Sepolia' ? STAKING_REQUIREMENTS.SEPOLIA : STAKING_REQUIREMENTS.MAINNET;
  const [formData, setFormData] = useState({
    amount: type === 'claim' ? maxStake : minStake,
    operator: '',
    reward: '',
  });

  // Countdown timer for unstake cooldown
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  useEffect(() => {
    if (type !== 'unstake' || unstakeStatus !== 'WAITING_COOLDOWN' || !unstakeEligibleAt) {
      return;
    }

    const calculateRemaining = () => {
      const now = new Date().getTime();
      const eligible = new Date(unstakeEligibleAt).getTime();
      return Math.max(0, Math.ceil((eligible - now) / 1000));
    };

    setRemainingSeconds(calculateRemaining());

    const interval = setInterval(() => {
      const remaining = calculateRemaining();
      setRemainingSeconds(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [type, unstakeStatus, unstakeEligibleAt]);

  const handleAction = async () => {
    if (!account) {
      setError('Wallet not connected');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      switch (type) {
        case 'stake': {
          if (step === 1) {
            // Step 1: Approve STRK (skipped if already approved)
            const approveResult = await approveSTRK(account, formData.amount);
            if (!approveResult.success) {
              throw new Error(approveResult.error || 'Approval failed');
            }
            // If no txHash, approval was skipped - proceed directly to stake
            if (!approveResult.txHash) {
              setStep(2);
              // Continue to stake immediately
            } else {
              setTxHash(approveResult.txHash);
              setStep(2);
              setIsProcessing(false);
              return;
            }
          }
          // Step 2: Stake (or direct stake if approval skipped)
          const stakeResult = await stakeSTRK(
            account,
            formData.amount,
            formData.operator,
            formData.reward
          );
          if (!stakeResult.success) {
            throw new Error(stakeResult.error || 'Staking failed');
          }
          setTxHash(stakeResult.txHash || null);
          onSubmit({ ...formData, txHash: stakeResult.txHash });
          break;
        }

        case 'increase': {
          if (!stakerAddress) {
            throw new Error('Staker address required');
          }
          if (step === 1) {
            // Step 1: Approve STRK (skipped if already approved)
            const approveResult = await approveSTRK(account, formData.amount);
            if (!approveResult.success) {
              throw new Error(approveResult.error || 'Approval failed');
            }
            // If no txHash, approval was skipped - proceed directly to increase
            if (!approveResult.txHash) {
              setStep(2);
              // Continue to increase immediately
            } else {
              setTxHash(approveResult.txHash);
              setStep(2);
              setIsProcessing(false);
              return;
            }
          }
          // Step 2: Increase stake (or direct if approval skipped)
          const increaseResult = await increaseStake(
            account,
            stakerAddress,
            formData.amount
          );
          if (!increaseResult.success) {
            throw new Error(increaseResult.error || 'Increase stake failed');
          }
          setTxHash(increaseResult.txHash || null);
          onSubmit({ ...formData, txHash: increaseResult.txHash });
          break;
        }

        case 'unstake': {
          if (unstakeStatus === 'NOT_INITIATED' || unstakeStatus === undefined) {
            // Step 1: Initiate unstake intent
            const unstakeResult = await unstakeIntent(account);
            if (!unstakeResult.success) {
              throw new Error(unstakeResult.error || 'Unstake intent failed');
            }
            setTxHash(unstakeResult.txHash || null);
            // Notify parent to record the intent
            if (onUnstakeIntentSuccess && unstakeResult.txHash) {
              onUnstakeIntentSuccess(unstakeResult.txHash);
            }
            onSubmit({ txHash: unstakeResult.txHash, action: 'unstake_intent' });
          } else if (unstakeStatus === 'READY_TO_FINALIZE') {
            // Step 2: Complete unstake action
            if (!stakerAddress) {
              throw new Error('Staker address required');
            }
            const actionResult = await unstakeAction(account, stakerAddress);
            if (!actionResult.success) {
              throw new Error(actionResult.error || 'Unstake action failed');
            }
            setTxHash(actionResult.txHash || null);
            // Notify parent to record the action
            if (onUnstakeActionSuccess && actionResult.txHash) {
              onUnstakeActionSuccess(actionResult.txHash);
            }
            onSubmit({ txHash: actionResult.txHash, action: 'unstake_action' });
          } else if (unstakeStatus === 'WAITING_COOLDOWN') {
            // Should not reach here - button should be disabled
            throw new Error('Cooldown period not complete');
          }
          break;
        }

        case 'claim': {
          if (!stakerAddress) {
            throw new Error('Staker address required');
          }
          const claimResult = await claimRewards(account, stakerAddress);
          if (!claimResult.success) {
            throw new Error(claimResult.error || 'Claim rewards failed');
          }
          setTxHash(claimResult.txHash || null);
          onSubmit({ txHash: claimResult.txHash });
          break;
        }

        case 'change_reward': {
          const changeResult = await changeRewardAddress(account, formData.reward);
          if (!changeResult.success) {
            throw new Error(changeResult.error || 'Change reward address failed');
          }
          setTxHash(changeResult.txHash || null);
          onSubmit({ ...formData, txHash: changeResult.txHash });
          break;
        }
      }
    } catch (err: any) {
      console.error('Transaction error:', err);
      setError(err.message || 'Transaction failed');
      setIsProcessing(false);
    }
  };

  const titles = {
    stake: 'Launch New Validator',
    unstake: 'Withdraw Stake',
    increase: 'Add Stake Amount',
    claim: 'Withdraw Rewards',
    change_reward: 'Update Rewards Destination',
  };

  const getButtonText = () => {
    if (isProcessing) {
      if (type === 'stake' || type === 'increase') {
        return step === 1 ? 'Approving STRK...' : 'Confirming TX...';
      }
      if (type === 'unstake') {
        return unstakeStatus === 'READY_TO_FINALIZE' ? 'Completing Unstake...' : 'Initiating Unstake...';
      }
      return 'Confirming TX...';
    }

    if (type === 'stake' || type === 'increase') {
      return step === 1 ? 'Approve STRK Allowance' : 'Confirm Stake';
    }
    if (type === 'claim') return 'Withdraw Rewards';
    if (type === 'unstake') {
      if (unstakeStatus === 'READY_TO_FINALIZE') return 'Complete Unstake';
      if (unstakeStatus === 'COMPLETED') return 'Unstake Completed';
      return 'Initiate Unstake';
    }
    if (type === 'change_reward') return 'Update Address';
    return `Confirm ${type.charAt(0).toUpperCase() + type.slice(1)}`;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md card-bg rounded-3xl overflow-hidden shadow-2xl border border-white/10">
        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold">{titles[type]}</h2>
            <button
              onClick={onClose}
              className="text-white/40 hover:text-white transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {type === 'stake' || type === 'increase' ? (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase">
                    Amount (STRK)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formData.amount === 0 ? '' : formData.amount}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          setFormData({ ...formData, amount: value === '' ? 0 : Number(value) });
                        }
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#EC796B] transition-colors"
                      placeholder={`Min ${minStake.toLocaleString()}`}
                      disabled={isProcessing}
                    />
                    <div
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold"
                      style={{ color: '#E175B1' }}
                    >
                      STRK
                    </div>
                  </div>
                  {maxStake > 0 && (
                    <div className="flex justify-between text-[10px]">
                      <span className="text-white/40">
                        Max Available: {maxStake.toLocaleString()} STRK
                      </span>
                      <button
                        onClick={() => setFormData({ ...formData, amount: maxStake })}
                        className="hover:underline"
                        style={{ color: '#EC796B' }}
                        disabled={isProcessing}
                      >
                        Max
                      </button>
                    </div>
                  )}
                </div>

                {type === 'stake' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/40 uppercase">
                        Operator Address
                      </label>
                      <input
                        type="text"
                        value={formData.operator}
                        onChange={(e) =>
                          setFormData({ ...formData, operator: e.target.value })
                        }
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#EC796B] transition-colors font-mono"
                        placeholder="0x..."
                        disabled={isProcessing}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/40 uppercase">
                        Rewards Destination
                      </label>
                      <input
                        type="text"
                        value={formData.reward}
                        onChange={(e) =>
                          setFormData({ ...formData, reward: e.target.value })
                        }
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#EC796B] transition-colors font-mono"
                        placeholder="0x..."
                        disabled={isProcessing}
                      />
                    </div>
                  </>
                )}
              </>
            ) : type === 'change_reward' ? (
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/40 uppercase">
                  New Reward Address
                </label>
                <input
                  type="text"
                  value={formData.reward}
                  onChange={(e) =>
                    setFormData({ ...formData, reward: e.target.value })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#EC796B] transition-colors font-mono"
                  placeholder="0x..."
                  disabled={isProcessing}
                />
                <p className="text-[10px] text-yellow-500/80 mt-2 flex items-center gap-1">
                  <Icons.Info /> Note: Changing reward addresses requires owner
                  signature. Ensure you own the destination address.
                </p>
              </div>
            ) : type === 'claim' ? (
              <div className="p-6 bg-white/5 border border-white/10 rounded-2xl text-center">
                <p className="text-white/90 text-lg font-medium leading-relaxed">
                  Are you sure to withdraw the total amount of rewards to your
                  rewards account?
                </p>
                <p className="text-xs text-white/40 mt-4">
                  The rewards will be transferred to your designated reward
                  address.
                </p>
              </div>
            ) : type === 'unstake' ? (
              <div className="space-y-4">
                {/* Unstake Status Display */}
                {unstakeStatus === 'NOT_INITIATED' || !unstakeStatus ? (
                  <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
                    <div className="flex justify-center mb-4">
                      <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                          <line x1="12" y1="9" x2="12" y2="13"></line>
                          <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                      </div>
                    </div>
                    <p className="text-white/90 font-medium">
                      Initiate Unstaking Process
                    </p>
                    <p className="text-sm text-white/50 mt-2">
                      This action is <span className="text-red-400 font-semibold">irreversible</span>. Once initiated, you cannot re-stake with this address.
                    </p>
                    <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                      <p className="text-xs text-yellow-400">
                        A waiting period of {network === 'Sepolia' ? '5 minutes' : '7 days'} will begin after you initiate unstaking.
                      </p>
                    </div>
                  </div>
                ) : unstakeStatus === 'WAITING_COOLDOWN' ? (
                  <div className="p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl text-center">
                    <div className="flex justify-center mb-4">
                      <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                      </div>
                    </div>
                    <p className="text-white/90 font-medium mb-2">
                      Waiting Period Active
                    </p>
                    <div className="text-3xl font-mono font-bold text-yellow-400 my-4">
                      {formatDuration(remainingSeconds)}
                    </div>
                    <p className="text-sm text-white/50">
                      until unstake can be completed
                    </p>
                    {unstakeEligibleAt && (
                      <p className="text-xs text-white/30 mt-2">
                        Eligible at: {new Date(unstakeEligibleAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                ) : unstakeStatus === 'READY_TO_FINALIZE' ? (
                  <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-2xl text-center">
                    <div className="flex justify-center mb-4">
                      <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                    </div>
                    <p className="text-white/90 font-medium">
                      Ready to Complete Unstake
                    </p>
                    <p className="text-sm text-white/50 mt-2">
                      The waiting period has ended. You can now withdraw your staked funds.
                    </p>
                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <p className="text-xs text-red-400">
                        This action is final and cannot be undone.
                      </p>
                    </div>
                  </div>
                ) : unstakeStatus === 'COMPLETED' ? (
                  <div className="p-6 bg-white/5 border border-white/10 rounded-2xl text-center">
                    <div className="flex justify-center mb-4">
                      <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/40">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                    </div>
                    <p className="text-white/70 font-medium">
                      Unstake Completed
                    </p>
                    <p className="text-sm text-white/40 mt-2">
                      Your funds have been unstaked and withdrawn.
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Step Indicator for Staking/Increase (Approval + Action) */}
            {(type === 'stake' || type === 'increase') && (
              <div className="flex gap-2">
                <div
                  className={`flex-1 h-1.5 rounded-full transition-colors ${
                    step >= 1 ? 'stark-gradient' : 'bg-white/10'
                  }`}
                />
                <div
                  className={`flex-1 h-1.5 rounded-full transition-colors ${
                    step >= 2 ? 'stark-gradient' : 'bg-white/10'
                  }`}
                />
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Transaction Hash Display */}
            {txHash && !error && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-xs">
                <span className="font-bold">TX submitted:</span>{' '}
                <a
                  href={getVoyagerUrl(`/tx/${txHash}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono hover:underline"
                >
                  {txHash.slice(0, 10)}...{txHash.slice(-8)} ↗
                </a>
              </div>
            )}

            {!(type === 'unstake' && (unstakeStatus === 'WAITING_COOLDOWN' || unstakeStatus === 'COMPLETED')) && (
              <button
                onClick={handleAction}
                disabled={isProcessing || !account}
                className="w-full py-4 stark-gradient rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transition-all shadow-lg shadow-[#EC796B]/20"
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {getButtonText()}
                  </>
                ) : (
                  getButtonText()
                )}
              </button>
            )}

            {!account && (
              <p className="text-center text-xs text-yellow-500/80">
                Wallet not connected. Please connect your wallet first.
              </p>
            )}

            <button
              onClick={onClose}
              disabled={isProcessing}
              className="w-full py-2 text-white/40 hover:text-white transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActionModal;
