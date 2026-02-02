import React, { useState } from 'react';
import { Icons } from '../constants';
import { WalletState } from '../types';

interface HeaderProps {
  wallet: WalletState;
  onConnect: () => void;
  onDisconnect: () => void;
}

const Header: React.FC<HeaderProps> = ({ wallet, onConnect, onDisconnect }) => {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <header className="border-b border-white/10 bg-black/20 sticky top-0 z-50 backdrop-blur-md">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between max-w-6xl">
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <Icons.StarknetLogo />
          <div>
            <span className="text-xl font-bold tracking-tight">StarkStake</span>
            <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold leading-none">Validator Hub</div>
          </div>
        </div>

        <div className="relative">
          {wallet.connected ? (
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-xs font-medium text-white/40">{wallet.network}</span>
                <span className="text-sm font-bold">{wallet.address}</span>
              </div>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all flex items-center gap-2"
              >
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span>Connected</span>
              </button>

              {showDropdown && (
                <div className="absolute right-0 top-full mt-2 w-48 card-bg rounded-xl overflow-hidden shadow-2xl z-50 border border-white/10">
                  <button
                    onClick={() => {
                      onDisconnect();
                      setShowDropdown(false);
                    }}
                    className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-400/10 transition-colors flex items-center gap-2 font-medium"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Disconnect Wallet
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onConnect}
              className="px-6 py-2.5 stark-gradient hover:opacity-90 rounded-xl font-bold transition-all shadow-lg shadow-[#EC796B]/20"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
