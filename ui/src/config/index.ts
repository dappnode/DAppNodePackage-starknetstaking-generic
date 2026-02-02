// Frontend configuration sourced from Vite environment variables
// VITE_ prefixed variables are exposed via import.meta.env

export const NETWORK = import.meta.env.VITE_STARKNET_NETWORK || 'sepolia';

// RPC URLs
export const RPC_URL = import.meta.env.VITE_STARKNET_RPC_URL;

// Contract addresses
export const STRK_TOKEN_ADDRESS = import.meta.env.VITE_STRK_TOKEN_ADDRESS;
export const STAKING_CONTRACT_ADDRESS_MAINNET = import.meta.env.VITE_STAKING_CONTRACT_ADDRESS_MAINNET;
export const STAKING_CONTRACT_ADDRESS_SEPOLIA = import.meta.env.VITE_STAKING_CONTRACT_ADDRESS_SEPOLIA;

// Choose staking address based on network
export const STAKING_CONTRACT_ADDRESS =
  NETWORK === 'mainnet'
    ? STAKING_CONTRACT_ADDRESS_MAINNET
    : STAKING_CONTRACT_ADDRESS_SEPOLIA;

export const STAKING_MIN_REQUIREMENTS = {
  MAINNET: Number(import.meta.env.VITE_STAKING_MIN_MAINNET) || 20000,
  SEPOLIA: Number(import.meta.env.VITE_STAKING_MIN_SEPOLIA) || 1,
};

// Transaction wait timeout (30 seconds)
export const TX_WAIT_TIMEOUT_MS = 30000;
