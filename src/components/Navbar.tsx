import React, { useState } from "react";
import {
  Wallet,
  Sparkles,
  Search,
  Layers,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Copy,
  LogOut,
  Settings,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useChainlinkPrice } from "@/hooks/useChainlinkPrice";

interface NavbarProps {
  activeTab: "studio" | "gallery" | "ens" | "oracle";
  setActiveTab: (tab: "studio" | "gallery" | "ens" | "oracle") => void;
  onOpenSettings: () => void;
  contractAddress: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenSettings,
  contractAddress,
}) => {
  const {
    address,
    isSepolia,
    balance,
    ensName,
    ensAvatar,
    isConnecting,
    connectWallet,
    disconnectWallet,
    switchToSepolia,
  } = useWallet();

  const { formattedPrice, isStale, loading: priceLoading } = useChainlinkPrice();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const truncateAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const navItems = [
    { id: "studio", label: "NFT Studio", icon: Sparkles },
    { id: "gallery", label: "On-Chain Gallery", icon: Layers },
    { id: "ens", label: "ENS Search", icon: Search },
    { id: "oracle", label: "ETH/USD Oracle", icon: Activity },
  ] as const;

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-canvas-950/80 border-b border-violet-900/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab("studio")}>
            <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-tr from-violet-700 via-violet-600 to-indigo-600 shadow-lg shadow-violet-900/40 p-2 border border-violet-400/30">
              <Sparkles className="w-6 h-6 text-white animate-pulse" />
              <div className="absolute -inset-1 rounded-xl bg-violet-500/20 blur-sm -z-10" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-white font-sans">
                  Ether<span className="text-violet-400 font-extrabold">Canvas</span>
                </span>
                <span className="px-1.5 py-0.5 text-[10px] uppercase font-mono font-semibold tracking-wider rounded bg-violet-950/80 text-violet-300 border border-violet-700/50">
                  Sepolia
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Next-Gen Web3 NFT Studio</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 bg-canvas-900/60 p-1.5 rounded-2xl border border-violet-900/40">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-violet-600 text-white shadow-md shadow-violet-700/30 font-semibold"
                      : "text-slate-300 hover:text-white hover:bg-violet-950/40"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-violet-400"}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Action Bar */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Chainlink Mini Pill */}
            <div
              onClick={() => setActiveTab("oracle")}
              title="Chainlink ETH/USD Live Feed (Sepolia)"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-canvas-900/70 border border-violet-800/40 hover:border-violet-500/60 cursor-pointer transition-colors"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <div className="text-xs font-mono">
                <span className="text-slate-400">ETH: </span>
                <span className="text-emerald-400 font-semibold">
                  {priceLoading ? "..." : formattedPrice}
                </span>
              </div>
              {isStale && (
                <span title="Data may be stale">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                </span>
              )}
            </div>

            {/* Contract Config Button */}
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-xl bg-canvas-900/70 border border-violet-900/40 hover:border-violet-600/50 text-slate-300 hover:text-violet-300 transition-colors"
              title="Contract Settings & ABI"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Wallet Action Button */}
            {!address ? (
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium text-sm shadow-lg shadow-violet-900/30 hover:shadow-violet-700/50 transition-all border border-violet-400/30 active:scale-95 disabled:opacity-50"
              >
                <Wallet className="w-4 h-4" />
                {isConnecting ? "Connecting..." : "Connect MetaMask"}
              </button>
            ) : !isSepolia ? (
              <button
                onClick={switchToSepolia}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 text-amber-300 text-sm font-semibold transition-all animate-pulse"
              >
                <AlertTriangle className="w-4 h-4" />
                Switch to Sepolia
              </button>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setUserDropdown(!userDropdown)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-canvas-900/80 border border-violet-500/30 hover:border-violet-400 text-slate-200 transition-all"
                >
                  {ensAvatar ? (
                    <img
                      src={ensAvatar}
                      alt="ENS Avatar"
                      className="w-7 h-7 rounded-lg object-cover border border-violet-500/50"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-xs font-bold text-white shadow-inner">
                      {address.substring(2, 4).toUpperCase()}
                    </div>
                  )}
                  <div className="text-left font-mono">
                    <div className="text-xs font-semibold text-white leading-tight">
                      {ensName || truncateAddress(address)}
                    </div>
                    <div className="text-[10px] text-violet-400">
                      {parseFloat(balance).toFixed(3)} SEP
                    </div>
                  </div>
                </button>

                {/* User Dropdown */}
                {userDropdown && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-canvas-900/95 backdrop-blur-2xl border border-violet-800/50 shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="pb-3 border-b border-violet-900/40">
                      <div className="text-xs text-slate-400 mb-1">Connected Account</div>
                      <div className="text-sm font-mono text-white font-semibold flex items-center justify-between">
                        <span>{truncateAddress(address)}</span>
                        <button
                          onClick={copyAddress}
                          className="p-1 rounded-md hover:bg-violet-950/60 text-slate-400 hover:text-white"
                        >
                          {copied ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      {ensName && (
                        <div className="text-xs text-violet-400 font-medium mt-0.5">{ensName}</div>
                      )}
                    </div>

                    <div className="py-2 space-y-1">
                      <a
                        href={`https://sepolia.etherscan.io/address/${address}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-violet-950/50 hover:text-white transition-colors"
                      >
                        <span>View on Sepolia Etherscan</span>
                        <ExternalLink className="w-3 h-3 text-slate-500" />
                      </a>
                    </div>

                    <div className="pt-2 border-t border-violet-900/40">
                      <button
                        onClick={() => {
                          disconnectWallet();
                          setUserDropdown(false);
                        }}
                        className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-950/30 transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Disconnect Wallet
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-canvas-900 border border-violet-900/50 text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-violet-900/40 bg-canvas-950/95 backdrop-blur-2xl px-4 pt-3 pb-6 space-y-3">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium ${
                    isActive
                      ? "bg-violet-600 text-white font-semibold"
                      : "text-slate-300 hover:bg-violet-950/40"
                  }`}
                >
                  <Icon className="w-4 h-4 text-violet-400" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="pt-3 border-t border-violet-900/40 space-y-3">
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-canvas-900 border border-violet-900/50">
              <span className="text-xs text-slate-400">ETH/USD (Sepolia):</span>
              <span className="text-xs font-mono font-semibold text-emerald-400">
                {priceLoading ? "..." : formattedPrice}
              </span>
            </div>

            {!address ? (
              <button
                onClick={() => {
                  connectWallet();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-violet-600 text-white font-medium text-sm shadow-lg shadow-violet-900/30"
              >
                <Wallet className="w-4 h-4" />
                Connect MetaMask
              </button>
            ) : !isSepolia ? (
              <button
                onClick={switchToSepolia}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-amber-500/20 text-amber-300 font-semibold text-sm border border-amber-500/40"
              >
                <AlertTriangle className="w-4 h-4" />
                Switch to Sepolia
              </button>
            ) : (
              <div className="p-3 rounded-xl bg-canvas-900 border border-violet-800/40 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Account:</span>
                  <span className="text-white font-semibold">{truncateAddress(address)}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Balance:</span>
                  <span className="text-violet-400">{parseFloat(balance).toFixed(4)} SEP</span>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="w-full mt-2 py-2 rounded-lg bg-rose-950/40 text-rose-300 text-xs font-medium border border-rose-900/40"
                >
                  Disconnect Wallet
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
