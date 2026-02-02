
export enum WalletType {
  ARGENT = 'Ready (Argent)',
  BRAAVOS = 'Braavos',
  METAMASK = 'MetaMask (Snaps)'
}

export enum Network {
  MAINNET = 'Mainnet',
  SEPOLIA = 'Sepolia'
}

export interface WalletState {
  connected: boolean;
  address: string | null;
  walletType: WalletType | null;
  network: Network;
}

export interface Validator {
  id: string;
  stakerAddress: string;
  operatorAddress: string;
  rewardAddress: string;
  amount: number;
  status: 'active' | 'paused' | 'exiting' | 'exited' | 'ACTIVE' | 'PAUSED' | 'EXITING' | 'EXITED';
  rewardsEarned: number;
  // Unstaking tracking fields
  unstakeIntentAt?: string;
  unstakeEligibleAt?: string;
  unstakeTxHash?: string;
  exitTxHash?: string;
}

export interface TransactionFlow {
  type: 'stake' | 'unstake' | 'increase' | 'claim' | 'change_reward' | 'pause' | 'unpause';
  step: number;
  totalSteps: number;
  status: 'idle' | 'processing' | 'success' | 'error';
  message: string;
}
