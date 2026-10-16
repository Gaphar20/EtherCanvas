import React, { useState } from "react";
import {
  Wallet,
  Sparkles,
  Search,
  Compass,
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
  Loader2,
  Plus,
  Zap,
  Bell,
} from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useChainlinkPrice } from "@/hooks/useChainlinkPrice";

export type NavTab = "explore" | "create" | "batch_mint" | "alerts" | "my_nfts" | "ens" | "oracle";

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
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
    error: walletError,
    hasProvider,
    connectWallet,
    disconnectWallet,
    switchToSepolia,
    clearError,
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

  const navItems: { id: NavTab; label: string; icon: React.ElementType }[] = [
    { id: "explore", label: "Explore", icon: Compass },
    { id: "create", label: "Create", icon: Plus },
    { id: "batch_mint", label: "Batch Mint", icon: Zap },
    { id: "alerts", label: "Live Alerts", icon: Bell },
    { id: "my_nfts", label: "My NFTs", icon: Layers },
    { id: "ens", label: "ENS", icon: Search },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-[#EAEAEA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setActiveTab("explore")}
          >
            <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-[#171717] group-hover:bg-[#262626] transition-colors shadow-sm p-2">
              <Sparkles className="w-5 h-5 text-white" />
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#E84B55] border-2 border-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-[#171717] font-sans">
                  Ether<span className="text-[#E84B55]">Canvas</span>
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-medium rounded-full bg-[#FAFAF8] text-[#737373] border border-[#EAEAEA]">
                  Sepolia
                </span>
              </div>
              <p className="text-[11px] text-[#737373] hidden sm:block font-medium">
                Minimalist Web3 NFT Studio
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 bg-[#FAFAF8] p-1.5 rounded-full border border-[#EAEAEA]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-[#171717] text-white shadow-sm"
                      : "text-[#737373] hover:text-[#171717] hover:bg-[#F4F4F0]"
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 ${
                      isActive
                        ? "text-white"
                        : item.id === "create" || item.id === "batch_mint"
                        ? "text-[#E84B55]"
                        : item.id === "alerts"
                        ? "text-[#10B981]"
                        : "text-[#737373]"
                    }`}
                  />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Action Bar */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Live ETH/USD Pill */}
            <button
              onClick={() => setActiveTab("oracle")}
              title="Chainlink ETH/USD Live Feed (Sepolia)"
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FAFAF8] border border-[#EAEAEA] hover:border-[#D4D4D4] text-[#171717] transition-all shadow-sm"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <div className="text-xs font-mono">
                <span className="text-[#737373]">ETH: </span>
                <span className="font-semibold">{priceLoading ? "..." : formattedPrice}</span>
              </div>
              {isStale && (
                <span title="Data may be stale">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                </span>
              )}
            </button>

            {/* Contract Settings */}
            <button
              onClick={onOpenSettings}
              className="p-2.5 rounded-full bg-[#FAFAF8] border border-[#EAEAEA] hover:border-[#D4D4D4] text-[#737373] hover:text-[#171717] transition-all shadow-sm"
              title="Contract Settings & Parameters"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Wallet Action Button */}
            {!address ? (
              <button
                type="button"
                onClick={connectWallet}
                disabled={isConnecting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#171717] hover:bg-[#262626] text-white font-medium text-xs sm:text-sm shadow-sm hover:shadow transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <Wallet className="w-4 h-4" />
                    <span>Connect MetaMask</span>
                  </>
                )}
              </button>
            ) : !isSepolia ? (
              <button
                onClick={switchToSepolia}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 text-xs sm:text-sm font-semibold transition-all animate-pulse"
              >
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Switch to Sepolia
              </button>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setUserDropdown(!userDropdown)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white border border-[#EAEAEA] hover:border-[#D4D4D4] text-[#171717] shadow-sm transition-all"
                >
                  {ensAvatar ? (
                    <img
                      src={ensAvatar}
                      alt="ENS Avatar"
                      className="w-7 h-7 rounded-full object-cover border border-[#EAEAEA]"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[#FAFAF8] border border-[#EAEAEA] flex items-center justify-center text-xs font-semibold text-[#171717]">
                      {address.substring(2, 4).toUpperCase()}
                    </div>
                  )}
                  <div className="text-left font-mono">
                    <div className="text-xs font-semibold text-[#171717] leading-tight">
                      {ensName || truncateAddress(address)}
                    </div>
                    <div className="text-[10px] text-[#737373]">
                      {parseFloat(balance).toFixed(3)} SEP
                    </div>
                  </div>
                </button>

                {/* User Dropdown */}
                {userDropdown && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-[#EAEAEA] shadow-xl p-3 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="pb-3 border-b border-[#EAEAEA]">
                      <div className="text-xs text-[#737373] mb-1 font-medium">Connected Account</div>
                      <div className="text-xs font-mono text-[#171717] font-semibold flex items-center justify-between">
                        <span>{truncateAddress(address)}</span>
                        <button
                          onClick={copyAddress}
                          className="p-1.5 rounded-md hover:bg-[#FAFAF8] text-[#737373] hover:text-[#171717]"
                          title="Copy address"
                        >
                          {copied ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      {ensName && (
                        <div className="text-xs text-[#E84B55] font-medium mt-1">{ensName}</div>
                      )}
                    </div>

                    <div className="py-2 space-y-1">
                      <a
                        href={`https://sepolia.etherscan.io/address/${address}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between px-2.5 py-2 rounded-xl text-xs text-[#737373] hover:bg-[#FAFAF8] hover:text-[#171717] transition-colors"
                      >
                        <span>Sepolia Etherscan</span>
                        <ExternalLink className="w-3.5 h-3.5 text-[#A3A3A3]" />
                      </a>
                    </div>

                    <div className="pt-2 border-t border-[#EAEAEA]">
                      <button
                        onClick={() => {
                          disconnectWallet();
                          setUserDropdown(false);
                        }}
                        className="flex items-center gap-2 w-full px-2.5 py-2 rounded-xl text-xs text-rose-600 hover:bg-rose-50 transition-colors font-medium"
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
              className="p-2 rounded-xl bg-[#FAFAF8] border border-[#EAEAEA] text-[#171717]"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#EAEAEA] bg-white px-4 pt-4 pb-6 space-y-3 shadow-lg">
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
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-medium ${
                    isActive
                      ? "bg-[#171717] text-white font-semibold"
                      : "text-[#737373] hover:bg-[#FAFAF8]"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-[#737373]"}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="pt-3 border-t border-[#EAEAEA] space-y-3">
            <div
              onClick={() => {
                setActiveTab("oracle");
                setMobileMenuOpen(false);
              }}
              className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-[#FAFAF8] border border-[#EAEAEA] cursor-pointer"
            >
              <span className="text-xs text-[#737373]">ETH/USD (Sepolia):</span>
              <span className="text-xs font-mono font-semibold text-[#171717]">
                {priceLoading ? "..." : formattedPrice}
              </span>
            </div>

            {!address ? (
              <button
                type="button"
                onClick={() => {
                  connectWallet();
                  setMobileMenuOpen(false);
                }}
                disabled={isConnecting}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-[#171717] text-white font-medium text-sm shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <Wallet className="w-4 h-4" />
                    <span>Connect MetaMask</span>
                  </>
                )}
              </button>
            ) : !isSepolia ? (
              <button
                onClick={switchToSepolia}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-amber-50 text-amber-800 font-semibold text-sm border border-amber-200"
              >
                <AlertTriangle className="w-4 h-4" />
                Switch to Sepolia
              </button>
            ) : (
              <div className="p-3.5 rounded-2xl bg-[#FAFAF8] border border-[#EAEAEA] space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#737373]">Account:</span>
                  <span className="text-[#171717] font-semibold">{truncateAddress(address)}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#737373]">Balance:</span>
                  <span className="text-[#E84B55] font-semibold">{parseFloat(balance).toFixed(4)} SEP</span>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="w-full mt-2 py-2 rounded-xl bg-rose-50 text-rose-600 text-xs font-medium border border-rose-100"
                >
                  Disconnect Wallet
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Wallet Error Banner */}
      {walletError && (
        <div className="bg-[#FFF5F5] border-t border-[#FEE2E2] text-[#B91C1C] px-4 py-2.5 text-xs animate-in fade-in">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <AlertTriangle className="w-4 h-4 text-[#E84B55] flex-shrink-0" />
              <span>{walletError}</span>
              {!hasProvider && (
                <a
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-[#B91C1C] hover:underline ml-1"
                >
                  Install MetaMask
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <button
              type="button"
              onClick={clearError}
              className="text-[#E84B55] hover:text-[#B91C1C] text-sm font-bold px-2 py-0.5 rounded hover:bg-[#FEE2E2] transition-colors flex-shrink-0"
              title="Dismiss error"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
