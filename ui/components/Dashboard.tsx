
import React, { useState } from 'react';
import { AccountInterface } from 'starknet';
import { WalletState, Validator } from '../types';
import { Icons, STAKING_REQUIREMENTS } from '../constants';
import ActionModal from './ActionModal';
import ValidatorList from './ValidatorList';
import { UnstakeEligibility } from '../src/services/blockchain';

interface AccountInfo {
  address: string;
  amount: number;
  stakedAmount?: number;
  unclaimedRewards?: number;
}

interface DashboardProps {
  wallet: WalletState;
  balances: { staker: AccountInfo; operator: AccountInfo; rewards: AccountInfo };
  validators: Validator[];
  onAddValidator: (amount: number, operator: string, reward: string) => void;
  onUpdateRewardAddress: (id: string, newAddress: string) => void;
  onUpdateGlobalRewardAddress: (newAddress: string) => void;
  onClaimRewards: (id: string) => void;
  onClaimAllRewards: (amount: number) => void;
  account?: AccountInterface | null;
  stakerAddress?: string;
  network?: 'Mainnet' | 'Sepolia';
  unstakeEligibility?: UnstakeEligibility | null;
}

const Dashboard: React.FC<DashboardProps> = ({
  wallet,
  balances,
  validators,
  onAddValidator,
  onUpdateRewardAddress,
  onUpdateGlobalRewardAddress,
  onClaimRewards,
  onClaimAllRewards,
  account,
  stakerAddress,
  network = 'Mainnet',
  unstakeEligibility,
}) => {
  const [isStakingModalOpen, setIsStakingModalOpen] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [isEditRewardModalOpen, setIsEditRewardModalOpen] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // Copy address to clipboard
  const copyToClipboard = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Truncate address for display
  const truncateAddress = (address: string) => {
    if (!address || address.length <= 13) return address || 'Not set';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="space-y-8">
      {/* Portfolio Overview */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="card-bg p-6 rounded-2xl border-l-4" style={{ borderLeftColor: '#EC796B' }}>
          <div className="flex items-center gap-3 mb-1 text-white/40">
            <Icons.Wallet />
            <span className="text-sm font-medium uppercase tracking-wider">Staker Account</span>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <div className="text-[10px] font-mono text-white/30" title={balances.staker.address}>
              {truncateAddress(balances.staker.address)}
            </div>
            <button
              onClick={() => copyToClipboard(balances.staker.address)}
              className="p-1 rounded hover:bg-white/10 transition-colors text-white/30 hover:text-white/60 flex-shrink-0"
              title="Copy to clipboard"
            >
              {copiedAddress === balances.staker.address ? <Icons.CheckSmall /> : <Icons.Copy />}
            </button>
          </div>
          <div className="text-3xl font-bold mb-1">{balances.staker.amount.toLocaleString()} STRK</div>
          <div className="text-sm flex items-center gap-1" style={{ color: '#EC796B' }}>
             Available for Staking
          </div>
          {balances.staker.stakedAmount !== undefined && balances.staker.stakedAmount > 0 && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="text-lg font-semibold text-white/90">{balances.staker.stakedAmount.toLocaleString()} STRK</div>
              <div className="text-xs text-white/40">Currently Staked (on-chain)</div>
            </div>
          )}
        </div>

        <div className="card-bg p-6 rounded-2xl border-l-4" style={{ borderLeftColor: '#E175B1' }}>
          <div className="flex items-center gap-3 mb-1 text-white/40">
            <Icons.Tool />
            <span className="text-sm font-medium uppercase tracking-wider">Operator Account</span>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <div className="text-[10px] font-mono text-white/30" title={balances.operator.address}>
              {truncateAddress(balances.operator.address)}
            </div>
            <button
              onClick={() => copyToClipboard(balances.operator.address)}
              className="p-1 rounded hover:bg-white/10 transition-colors text-white/30 hover:text-white/60 flex-shrink-0"
              title="Copy to clipboard"
            >
              {copiedAddress === balances.operator.address ? <Icons.CheckSmall /> : <Icons.Copy />}
            </button>
          </div>
          <div className="text-3xl font-bold mb-1">{balances.operator.amount.toLocaleString()} STRK</div>
          <div className="text-sm flex items-center gap-1" style={{ color: '#E175B1' }}>
             Available for paying gas
          </div>
        </div>

        <div className="card-bg p-6 rounded-2xl border-l-4 flex flex-col justify-between" style={{ borderLeftColor: '#BC79B8' }}>
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-3 text-white/40">
                <Icons.Coins />
                <span className="text-sm font-medium uppercase tracking-wider">Rewards Account</span>
              </div>
              <button
                onClick={() => setIsEditRewardModalOpen(true)}
                className="p-1.5 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-all"
                title="Edit Rewards Address"
              >
                <Icons.Edit />
              </button>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <div className="text-[10px] font-mono text-white/30" title={balances.rewards.address}>
                {truncateAddress(balances.rewards.address)}
              </div>
              <button
                onClick={() => copyToClipboard(balances.rewards.address)}
                className="p-1 rounded hover:bg-white/10 transition-colors text-white/30 hover:text-white/60 flex-shrink-0"
                title="Copy to clipboard"
              >
                {copiedAddress === balances.rewards.address ? <Icons.CheckSmall /> : <Icons.Copy />}
              </button>
            </div>
            <div className="text-3xl font-bold mb-1">{balances.rewards.amount.toLocaleString()} STRK</div>
            <div className="text-sm flex items-center gap-1" style={{ color: '#BC79B8' }}>
              Balance in rewards account
            </div>
            {balances.rewards.unclaimedRewards !== undefined && balances.rewards.unclaimedRewards > 0 && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <div className="text-lg font-semibold text-green-400">{balances.rewards.unclaimedRewards.toLocaleString()} STRK</div>
                <div className="text-xs text-white/40">Unclaimed Rewards (on-chain)</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <h2 className="text-2xl font-bold">My Validator</h2>
        {/* Only show Create Validator button if user doesn't have a validator yet (Starknet allows only ONE per staker) */}
        {validators.length === 0 && (
          <div className="flex gap-3">
            <button
              onClick={() => setIsStakingModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 stark-gradient rounded-xl font-bold shadow-lg shadow-[#EC796B]/20 hover:scale-[1.02] transition-transform"
            >
              Create Validator
            </button>
          </div>
        )}
      </div>

      {/* Validator Display */}
      {validators.length === 0 ? (
        <div className="py-20 card-bg rounded-2xl border-dashed flex flex-col items-center text-center px-6 border-white/10">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 text-white/30 border border-white/5">
            <Icons.Server />
          </div>
          {balances.staker.stakedAmount && balances.staker.stakedAmount > 0 ? (
            <>
              <h3 className="text-xl font-bold mb-2">On-Chain Staking Found</h3>
              <p className="text-white/40 max-w-sm leading-relaxed text-sm mb-4">
                You have <span className="text-white font-semibold">{balances.staker.stakedAmount.toLocaleString()} STRK</span> staked on-chain.
                This stake was created outside this app or hasn't been synced yet.
              </p>
              <div className="flex gap-4 text-sm">
                <div className="px-4 py-2 bg-white/5 rounded-lg">
                  <span className="text-white/40">Operator:</span>{' '}
                  <span className="font-mono">{balances.operator.address}</span>
                </div>
                <div className="px-4 py-2 bg-white/5 rounded-lg">
                  <span className="text-white/40">Rewards:</span>{' '}
                  <span className="font-mono">{balances.rewards.address}</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-xl font-bold mb-2">No Active Validator</h3>
              <p className="text-white/40 max-w-sm leading-relaxed text-sm">
                You haven't launched a validator yet. Create your validator to start securing the network and earning rewards.
              </p>
            </>
          )}
        </div>
      ) : (
        <ValidatorList
          validators={validators}
          onUpdateRewardAddress={onUpdateRewardAddress}
          onClaimRewards={onClaimRewards}
          account={account}
          stakerAddress={stakerAddress}
          network={network}
          unstakeEligibility={unstakeEligibility}
        />
      )}

      {/* Account Recommendation Reminder */}
      <div className="p-6 card-bg rounded-2xl flex items-start gap-4 border-white/10">
        <div className="mt-1" style={{ color: '#E175B1' }}>
          <Icons.Info />
        </div>
        <div>
          <h4 className="font-bold text-lg mb-1">Security Recommendation</h4>
          <p className="text-sm text-white/50 leading-relaxed">
            For production validators, ensure your <strong>Operator Account</strong> is separate from your <strong>Staker Account</strong>. 
            The Operator should only hold enough gas for transaction signing, keeping your 20,000+ STRK stake isolated and secure in the Staker account.
          </p>
        </div>
      </div>

      {isStakingModalOpen && (
        <ActionModal
          type="stake"
          onClose={() => setIsStakingModalOpen(false)}
          onSubmit={(data) => {
            onAddValidator(data.amount, data.operator, data.reward);
            setIsStakingModalOpen(false);
          }}
          maxStake={balances.staker.amount}
          account={account}
          stakerAddress={stakerAddress}
          network={network}
        />
      )}

      {isClaimModalOpen && (
        <ActionModal
          type="claim"
          onClose={() => setIsClaimModalOpen(false)}
          onSubmit={(data) => {
            onClaimAllRewards(data.amount);
            setIsClaimModalOpen(false);
          }}
          maxStake={balances.rewards.amount}
          account={account}
          stakerAddress={stakerAddress}
          network={network}
        />
      )}

      {isEditRewardModalOpen && (
        <ActionModal
          type="change_reward"
          onClose={() => setIsEditRewardModalOpen(false)}
          onSubmit={(data) => {
            onUpdateGlobalRewardAddress(data.reward);
            setIsEditRewardModalOpen(false);
          }}
          account={account}
          stakerAddress={stakerAddress}
          network={network}
        />
      )}
    </div>
  );
};

export default Dashboard;
