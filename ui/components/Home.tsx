
import React from 'react';
import { Icons } from '../constants';

interface HomeProps {
  onStartStaking: () => void;
}

const Home: React.FC<HomeProps> = ({ onStartStaking }) => {
  return (
    <div className="space-y-24 py-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Hero Section */}
      <section className="text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-wider mb-8 text-white/60">
          <span className="w-2 h-2 rounded-full bg-[#EC796B] animate-pulse"></span>
          Now Live on Starknet Mainnet
        </div>
        <h1 className="text-6xl md:text-8xl font-black mb-8 leading-tight tracking-tight">
          Secure the <span className="stark-text-gradient">Future</span> of Starknet.
        </h1>
        <p className="text-xl md:text-2xl text-white/50 mb-12 max-w-2xl mx-auto leading-relaxed">
          The most intuitive way to run a validator node. Join a global community of stakers and earn protocol rewards.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            onClick={onStartStaking}
            className="px-10 py-5 stark-gradient rounded-2xl font-black text-xl shadow-2xl shadow-[#EC796B]/30 hover:scale-105 transition-all"
          >
            Start Staking Now
          </button>
          <a href="https://docs.starknet.io" target="_blank" className="px-10 py-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-bold transition-all">
            Read Whitepaper
          </a>
        </div>
      </section>

      {/* Stats Section */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-8">
        {[
          { label: "Total Staked", value: "1.2B STRK" },
          { label: "Active Nodes", value: "2,400+" },
          { label: "Current APR", value: "8.4%" },
          { label: "Block Time", value: "~12s" }
        ].map(stat => (
          <div key={stat.label} className="text-center p-8 card-bg rounded-3xl border-white/5">
            <div className="text-white/40 text-sm font-medium uppercase tracking-widest mb-2">{stat.label}</div>
            <div className="text-3xl font-black">{stat.value}</div>
          </div>
        ))}
      </section>

      {/* Features Grid */}
      <section className="grid md:grid-cols-3 gap-8">
        <div className="p-10 card-bg rounded-[40px] border-white/5 group hover:border-[#EC796B]/30 transition-all">
          <div className="w-16 h-16 rounded-2xl stark-gradient flex items-center justify-center mb-8 shadow-xl">
            <Icons.Shield />
          </div>
          <h3 className="text-2xl font-bold mb-4">Institutional Security</h3>
          <p className="text-white/40 leading-relaxed">
            Built on top of formal verification standards, ensuring your stake is protected by the most rigorous security protocols.
          </p>
        </div>
        <div className="p-10 card-bg rounded-[40px] border-white/5 group hover:border-[#E175B1]/30 transition-all">
          <div className="w-16 h-16 rounded-2xl stark-gradient flex items-center justify-center mb-8 shadow-xl">
            <Icons.Refresh />
          </div>
          <h3 className="text-2xl font-bold mb-4">Automated Yield</h3>
          <p className="text-white/40 leading-relaxed">
            Real-time reward distribution directly to your chosen address. No manual claiming required for compound growth.
          </p>
        </div>
        <div className="p-10 card-bg rounded-[40px] border-white/5 group hover:border-[#EC796B]/30 transition-all">
          <div className="w-16 h-16 rounded-2xl stark-gradient flex items-center justify-center mb-8 shadow-xl">
            <Icons.User />
          </div>
          <h3 className="text-2xl font-bold mb-4">Role Isolation</h3>
          <p className="text-white/40 leading-relaxed">
            Unique 3-address architecture separates staking funds from operational gas, minimizing attack surfaces.
          </p>
        </div>
      </section>
    </div>
  );
};

export default Home;
