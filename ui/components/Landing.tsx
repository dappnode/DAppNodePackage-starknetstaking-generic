import React from 'react';
import { Icons } from '../constants';

interface LandingProps {
  onConnect: () => void;
  targetNetwork?: string;
  isWrongNetwork?: boolean;
  currentNetwork?: string;
}

const Landing: React.FC<LandingProps> = ({ onConnect, targetNetwork, isWrongNetwork, currentNetwork }) => {
  const steps = [
    {
      icon: <Icons.Wallet />,
      title: "1. Choose Your Wallet",
      description: "Download a Starknet compatible wallet. Options include Ready (Argent), MetaMask (with Snaps), or Braavos.",
      links: [
        { name: "Ready", url: "https://www.ready.co/" },
        { name: "Braavos", url: "https://braavos.app/" },
        { name: "MetaMask", url: "https://metamask.io/download" }
      ],
      isDownloadStep: true
    },
    {
      icon: <Icons.User />,
      title: "2. Create three accounts",
      description: "We recommend creating three distinct accounts in your wallet for maximum security.",
      subItems: [
        { label: "Staker", value: "Holds the main stake (20k STRK)" },
        { label: "Operator", value: "Signs transactions and pays gas" },
        { label: "Rewards", value: "Destination for earned rewards" }
      ]
    },
    {
      icon: <Icons.Coins />,
      title: "3. Acquire STRK Tokens",
      description: "Get STRK tokens via bridging from Ethereum, swapping on Starknet DEXs, or buying directly with fiat.",
      links: [
        { name: "StarkGate Bridge", url: "https://starkgate.starknet.io/ethereum/bridge?mode=deposit&token=eth" },
        { name: "AVNU Swap", url: "https://app.avnu.fi/es" },
        { name: "Ramp", url: "https://rampnetwork.com/" },
        { name: "Banxa", url: "https://banxa.com/" },
        { name: "MoonPay", url: "https://www.moonpay.com/" },
        { name: "Onramper", url: "https://www.onramper.com/" }
      ]
    },
    {
      icon: <Icons.Check />,
      title: "4. Deploy & Stake",
      description: "Connect your Staker wallet, authorize the staking contract, and launch your validator.",
      final: true
    }
  ];

  return (
    <div className="py-12 animate-in fade-in duration-700">
      {isWrongNetwork && (
        <div className="mb-8 p-6 bg-red-500/20 border border-red-500/50 rounded-2xl text-center">
          <h2 className="text-xl font-bold text-red-400 mb-2">Wrong Network</h2>
          <p className="text-white/80">
            Please switch your wallet to <strong className="text-white">{targetNetwork}</strong> to use this app.
            {currentNetwork && <> You are currently connected to <strong className="text-white">{currentNetwork}</strong>.</>}
          </p>
        </div>
      )}
      <div className="text-center mb-16 max-w-3xl mx-auto">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-[29px] pb-2 bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/40 leading-[1.1]">
          Earn rewards while securing Starknet.
        </h1>
        <p className="text-xl text-white/60">
          The simple, secure interface for Starknet validator staking.
          Become a key part of the network's decentralization in minutes.
        </p>
        {targetNetwork && (
          <div className="mt-4 inline-block px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
            <span className="text-white/60">Network: </span>
            <span className="font-bold text-white">{targetNetwork}</span>
          </div>
        )}
        <div className="mt-6">
          <a
            href="https://docs.dappnode.io/docs/user/staking/starknet/solo/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl font-medium transition-all"
          >
            <Icons.Docs />
            Read the Docs
          </a>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((step, idx) => (
          <div key={idx} className="card-bg p-8 rounded-2xl flex flex-col h-full hover:border-white/20 transition-colors">
            <div className="w-12 h-12 rounded-xl stark-gradient-soft flex items-center justify-center mb-6" style={{ color: '#EC796B' }}>
              {step.icon}
            </div>
            <h3 className="text-xl font-bold mb-4">{step.title}</h3>
            <p className="text-white/60 mb-6 flex-grow leading-relaxed">
              {step.description}
            </p>

            {step.links && (
              <div className="flex flex-col gap-2 mt-auto">
                {step.links.map(link => (
                  <a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-sm transition-colors text-center block font-medium"
                  >
                    {step.isDownloadStep ? `Download ${link.name}` : link.name}
                  </a>
                ))}
              </div>
            )}

            {step.subItems && (
              <div className="space-y-3 mt-auto">
                {step.subItems.map(item => (
                  <div key={item.label} className="text-xs bg-white/5 p-2 rounded-lg border border-white/5">
                    <span className="font-bold block mb-0.5" style={{ color: '#E175B1' }}>{item.label}</span>
                    <span className="text-white/40">{item.value}</span>
                  </div>
                ))}
              </div>
            )}

            {step.final && (
              <button
                onClick={onConnect}
                className="w-full py-3 stark-gradient rounded-xl font-bold shadow-lg shadow-[#EC796B]/20 hover:scale-[1.02] transition-transform"
              >
                Start Staking Now
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-20 p-8 card-bg rounded-2xl border-white/10 flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1">
          <h2 className="text-2xl font-bold mb-4">Why Starknet Staking?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h4 className="font-bold text-white/80">Decentralization</h4>
              <p className="text-sm text-white/50">Validators help decentralize the Starknet sequencer, ensuring network resilience.</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-white/80">Yield Rewards</h4>
              <p className="text-sm text-white/50">Earn STRK tokens directly from the network protocol as compensation for your service.</p>
            </div>
          </div>
        </div>
        <div className="w-full md:w-auto">
          <div className="bg-black/40 p-6 rounded-xl border border-white/5">
            <div className="text-sm text-white/40 mb-1">Minimum Stake</div>
            <div className="text-3xl font-bold">20,000 STRK</div>
            <div className="text-xs mt-2 font-medium" style={{ color: '#EC796B' }}>Currently ~ $0.35/STRK</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;
