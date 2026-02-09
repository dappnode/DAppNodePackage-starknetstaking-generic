import React, { useState } from 'react';
import { AccountInterface } from 'starknet';
import { Validator } from '../types';
import { Icons } from '../constants';
import ActionModal from './ActionModal';
import { UnstakeEligibility, UnstakeStatus } from '../src/services/blockchain';

// Helper function to format remaining time for inline display
const formatDurationShort = (seconds: number): string => {
  if (seconds <= 0) return 'Ready';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

interface ValidatorListProps {
  validators: Validator[];
  onUpdateRewardAddress: (id: string, newAddress: string) => void;
  onClaimRewards: (id: string) => void;
  onIncreaseStake?: (id: string, amount: number) => void;
  onUnstake?: (id: string) => void;
  account?: AccountInterface | null;
  stakerAddress?: string;
  network?: 'Mainnet' | 'Sepolia';
  // Unstake eligibility info
  unstakeEligibility?: UnstakeEligibility | null;
  onUnstakeIntentSuccess?: (validatorId: string, txHash: string) => void;
  onUnstakeActionSuccess?: (validatorId: string, txHash: string) => void;
  onRefreshData?: () => void;
}

const ValidatorList: React.FC<ValidatorListProps> = ({
  validators,
  onUpdateRewardAddress,
  onClaimRewards,
  onIncreaseStake,
  onUnstake,
  account,
  stakerAddress,
  network = 'Mainnet',
  unstakeEligibility,
  onUnstakeIntentSuccess,
  onUnstakeActionSuccess,
  onRefreshData,
}) => {
  // Helper to get the correct Voyager URL based on network
  const getVoyagerUrl = (path: string) => {
    const baseUrl = network === 'Sepolia' ? 'https://sepolia.voyager.online' : 'https://voyager.online';
    return `${baseUrl}${path}`;
  };
  const [activeAction, setActiveAction] = useState<{id: string, type: string} | null>(null);

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'active': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'paused': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'exiting': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'exited': return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
      default: return 'bg-white/10 text-white/40';
    }
  };

  // Determine the unstake status for a validator
  const getValidatorUnstakeStatus = (validator: Validator): UnstakeStatus => {
    // First, use the blockchain-derived eligibility status if available
    if (unstakeEligibility) {
      console.log('[ValidatorList] Using unstakeEligibility:', unstakeEligibility);
      return unstakeEligibility.status;
    }

    // Fallback to validator data
    const statusLower = validator.status.toLowerCase();
    if (statusLower === 'exited') return 'COMPLETED';
    if (statusLower === 'exiting') {
      // Check if cooldown is complete based on stored eligible date
      if (validator.unstakeEligibleAt) {
        const eligibleAt = new Date(validator.unstakeEligibleAt);
        if (eligibleAt > new Date()) {
          return 'WAITING_COOLDOWN';
        }
        return 'READY_TO_FINALIZE';
      }
      return 'WAITING_COOLDOWN';
    }
    return 'NOT_INITIATED';
  };

  // Get the unstake button text based on validator status
  const getUnstakeButtonText = (validator: Validator): string => {
    const unstakeStatus = getValidatorUnstakeStatus(validator);
    switch (unstakeStatus) {
      case 'WAITING_COOLDOWN':
        // Use blockchain-derived remaining time if available
        if (unstakeEligibility && unstakeEligibility.remainingSeconds > 0) {
          return `Waiting (${formatDurationShort(unstakeEligibility.remainingSeconds)})`;
        }
        if (validator.unstakeEligibleAt) {
          const remaining = Math.max(0, Math.ceil((new Date(validator.unstakeEligibleAt).getTime() - Date.now()) / 1000));
          return `Waiting (${formatDurationShort(remaining)})`;
        }
        return 'Waiting...';
      case 'READY_TO_FINALIZE': return 'Complete Unstake';
      case 'COMPLETED': return 'Unstaked';
      default: return 'Unstake';
    }
  };

  // Standardized UI Classes
  const btnBaseClass = "flex-1 sm:flex-none h-10 px-4 flex items-center justify-center rounded-lg font-bold text-xs transition-all whitespace-nowrap outline-none border";
  const btnPrimaryClass = `${btnBaseClass} bg-white/5 hover:bg-white/10 text-white border-white/5 hover:border-white/20`;
  const btnDangerClass = `${btnBaseClass} bg-red-500/5 hover:bg-red-500/10 text-red-400 border-red-500/10 hover:border-red-500/20`;
  const labelClass = "text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1.5";
  const valueClass = "text-lg font-mono font-bold tabular-nums";

  return (
    <div className="space-y-6">
      {validators.map((v) => (
        <div key={v.id} className="card-bg rounded-2xl overflow-hidden border border-white/5 hover:border-white/10 transition-all flex flex-col">
          
          {/* Top Section: Metadata & Main Info */}
          <div className="p-6 pb-4">
            <div className="flex items-center justify-between gap-4 mb-6">
              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${getStatusColor(v.status)}`}>
                {v.status}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              {/* Data Section 1: Validator Index */}
              <div className="min-w-0">
                <div className={labelClass}>Validator Index</div>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/10 flex-shrink-0" />
                  <div className={`${valueClass} text-white/90 min-w-0`}>
                    <a
                      href={getVoyagerUrl(`/staking?validator=${v.operatorAddress}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white transition-colors flex items-center gap-2 group/link"
                      title={v.id}
                    >
                      <span>
                        {v.id.length > 10 ? `${v.id.slice(0, 6)}...${v.id.slice(-4)}` : v.id.toUpperCase()}
                      </span>
                      <Icons.ExternalLink />
                    </a>
                  </div>
                </div>
              </div>

              {/* Data Section 2: Amount Staked */}
              <div>
                <div className={labelClass}>Amount Stake</div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                  <div className={`${valueClass} text-white/90`}>
                    {v.amount.toLocaleString()} <span className="text-[10px] opacity-40 font-sans">STRK</span>
                  </div>
                </div>
              </div>

              {/* Data Section 3: Rewards Earned */}
              <div>
                <div className={labelClass}>Rewards Earned</div>
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${v.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-white/10'}`} />
                  <div className={`${valueClass} text-green-400`}>
                    {(Number(v.rewardsEarned) || 0).toFixed(8)} <span className="text-[10px] opacity-60 font-sans">STRK</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Unstake Status Display (only if exiting or exited) */}
            {(v.status === 'exiting' || v.status === 'exited') && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-bold text-white/30 uppercase tracking-widest">Unstake Status</div>
                  <div className="text-xs font-bold">
                    {v.status === 'exiting' ? (
                      <span className="text-orange-400">
                        {v.unstakeEligibleAt ? 'Waiting Period' : 'Initiated'}
                      </span>
                    ) : v.status === 'exited' ? (
                      <span className="text-gray-400">Completed</span>
                    ) : (
                      <span className="text-white/40">Not Initiated</span>
                    )}
                  </div>
                </div>

                {/* Unstake Eligible Date */}
                {v.status === 'exiting' && v.unstakeEligibleAt && (
                  <div className="mt-2 text-xs text-white/50">
                    <span className="text-white/70">Ready: </span>
                    {new Date(v.unstakeEligibleAt).toLocaleString()}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Bar Footer */}
          <div className="mt-2 bg-white/[0.02] border-t border-white/5 p-4 sm:px-6 flex flex-wrap gap-2 items-center justify-end">
            <button 
              onClick={() => setActiveAction({ id: v.id, type: 'claim' })}
              disabled={(Number(v.rewardsEarned) || 0) <= 0}
              className={`${btnPrimaryClass} disabled:opacity-20 disabled:cursor-not-allowed`}
            >
              Claim Rewards
            </button>

            <button
              onClick={() => setActiveAction({ id: v.id, type: 'increase' })}
              // disable if unstake is in progress
              disabled={getValidatorUnstakeStatus(v) !== 'NOT_INITIATED'}
              className={`${btnPrimaryClass} disabled:opacity-30 disabled:cursor-not-allowed`}
            >
              Add Stake
            </button>

            {(() => {
              const status = getValidatorUnstakeStatus(v);
              // Hide button during waiting period and after completion
              if (status === 'WAITING_COOLDOWN' || status === 'COMPLETED') return null;
              return (
                <button
                  onClick={() => setActiveAction({ id: v.id, type: 'unstake' })}
                  className={btnDangerClass}
                >
                  {getUnstakeButtonText(v)}
                </button>
              );
            })()}
          </div>
        </div>
      ))}

      {activeAction && activeAction.type === 'claim' && (
        <ActionModal
          type="claim"
          onClose={() => setActiveAction(null)}
          onSubmit={() => {
            onClaimRewards(activeAction.id);
            setActiveAction(null);
            onRefreshData?.();
          }}
          account={account}
          stakerAddress={stakerAddress}
          network={network}
        />
      )}

      {activeAction && activeAction.type === 'change_reward' && (
        <ActionModal
          type="change_reward"
          onClose={() => setActiveAction(null)}
          onSubmit={(data) => {
            onUpdateRewardAddress(activeAction.id, data.reward);
            setActiveAction(null);
            onRefreshData?.();
          }}
          account={account}
          stakerAddress={stakerAddress}
          network={network}
        />
      )}

      {activeAction && activeAction.type === 'increase' && (
        <ActionModal
          type="increase"
          onClose={() => setActiveAction(null)}
          onSubmit={(data) => {
            if (onIncreaseStake) {
              onIncreaseStake(activeAction.id, data.amount);
            }
            setActiveAction(null);
            onRefreshData?.();
          }}
          account={account}
          stakerAddress={stakerAddress}
          network={network}
        />
      )}

      {activeAction && activeAction.type === 'unstake' && (() => {
        const validator = validators.find(v => v.id === activeAction.id);
        const unstakeStatus = validator ? getValidatorUnstakeStatus(validator) : 'NOT_INITIATED';
        const eligibleAt = validator?.unstakeEligibleAt
          ? new Date(validator.unstakeEligibleAt)
          : unstakeEligibility?.unstakeEligibleAt
            ? new Date(unstakeEligibility.unstakeEligibleAt)
            : null;

        return (
          <ActionModal
            type="unstake"
            onClose={() => setActiveAction(null)}
            onSubmit={(data) => {
              if (onUnstake) {
                onUnstake(activeAction.id);
              }
              setActiveAction(null);
              onRefreshData?.();
            }}
            account={account}
            stakerAddress={stakerAddress}
            network={network}
            unstakeStatus={unstakeStatus}
            unstakeEligibleAt={eligibleAt}
            onUnstakeIntentSuccess={(txHash) => {
              if (onUnstakeIntentSuccess) {
                onUnstakeIntentSuccess(activeAction.id, txHash);
              }
              onRefreshData?.();
            }}
            onUnstakeActionSuccess={(txHash) => {
              if (onUnstakeActionSuccess) {
                onUnstakeActionSuccess(activeAction.id, txHash);
              }
              onRefreshData?.();
            }}
          />
        );
      })()}

    </div>
  );
};

export default ValidatorList;