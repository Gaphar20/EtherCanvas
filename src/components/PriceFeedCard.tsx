import React from "react";
import {
  Activity,
  RefreshCw,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ExternalLink,
  Layers,
  Info,
} from "lucide-react";
import { useChainlinkPrice } from "@/hooks/useChainlinkPrice";
import { CHAINLINK_ETH_USD_SEPOLIA_ADDRESS } from "@/contracts/addresses";

export const PriceFeedCard: React.FC = () => {
  const {
    price,
    formattedPrice,
    roundId,
    updatedAt,
    updateAgeSeconds,
    isStale,
    decimals,
    loading,
    error,
    refresh,
    lastFetchedAt,
  } = useChainlinkPrice();

  const formatAge = (seconds: number) => {
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    const remainingSecs = seconds % 60;
    if (minutes < 60) return `${minutes}m ${remainingSecs}s ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ago`;
  };

  const formattedTimestamp = updatedAt
    ? new Date(updatedAt * 1000).toLocaleString()
    : "—";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Activity className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-sans">
              Chainlink Data Feed
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time decentralized ETH/USD price oracle on Ethereum Sepolia
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-canvas-900 border border-violet-900/40 text-xs font-mono text-slate-400">
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            Auto-refresh: 15s
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/40 text-violet-200 text-xs font-medium transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-violet-400" : ""}`} />
            Refresh Now
          </button>
        </div>
      </div>

      {/* Stale Warning Banner */}
      {isStale && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex items-start gap-3 animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-semibold text-amber-300">Stale Data Warning: </span>
            The oracle has not updated in over an hour ({formatAge(updateAgeSeconds)}). On testnets,
            heartbeats may extend during low volatility periods. Do not rely on stale data for
            high-value liquidation or mint transactions.
          </div>
        </div>
      )}

      {/* Main Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Big Live Price Card */}
        <div className="md:col-span-2 glass-panel rounded-3xl p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />

          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
            <span>PAIR: ETH / USD</span>
            <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-800/50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              LIVE ORACLE
            </span>
          </div>

          <div className="my-4">
            <div className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight font-sans">
              {loading && price === 0 ? (
                <div className="h-14 w-64 rounded-xl skeleton-shimmer" />
              ) : (
                formattedPrice
              )}
            </div>
            <div className="text-xs text-slate-400 mt-2 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-violet-400" />
              <span>
                Oracle update age:{" "}
                <strong className={isStale ? "text-amber-400" : "text-slate-200"}>
                  {formatAge(updateAgeSeconds)}
                </strong>
              </span>
              <span>•</span>
              <span>Updated: {formattedTimestamp}</span>
            </div>
          </div>

          {/* Aggregator address info */}
          <div className="pt-4 border-t border-violet-900/30 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-400">Sepolia Aggregator:</span>
            <a
              href={`https://sepolia.etherscan.io/address/${CHAINLINK_ETH_USD_SEPOLIA_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-violet-400 hover:text-violet-300 flex items-center gap-1"
            >
              <span>{CHAINLINK_ETH_USD_SEPOLIA_ADDRESS}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Oracle Technical Parameters */}
        <div className="glass-panel rounded-3xl p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-violet-400 font-mono mb-3">
              Oracle Specs
            </div>
            <div className="space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-violet-900/30">
                <span className="text-slate-400">Decimals:</span>
                <span className="text-white font-semibold">{decimals}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-violet-900/30">
                <span className="text-slate-400">Round ID:</span>
                <span className="text-white font-semibold truncate max-w-[140px]" title={roundId}>
                  {roundId}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-violet-900/30">
                <span className="text-slate-400">Network:</span>
                <span className="text-violet-300 font-semibold">Sepolia Testnet</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-400">Heartbeat:</span>
                <span className="text-white font-semibold">1,800s (30m)</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-canvas-900/90 border border-violet-900/40 text-[11px] text-slate-400 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>Cryptographically secured by decentralized Chainlink node consensus.</span>
          </div>
        </div>
      </div>

      {/* Student & Mentor Educational Reference Box */}
      <div className="glass-card rounded-2xl p-5 border border-violet-900/30">
        <div className="flex items-center gap-2 text-sm font-semibold text-violet-300 mb-2">
          <Info className="w-4 h-4 text-violet-400" />
          Web3 Architecture Explanation (For Mentor Review)
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          This widget integrates the official Chainlink Sepolia <code className="text-violet-300 bg-canvas-900 px-1 py-0.5 rounded">AggregatorV3Interface</code> contract at <code className="text-violet-300 bg-canvas-900 px-1 py-0.5 rounded">{CHAINLINK_ETH_USD_SEPOLIA_ADDRESS}</code>. It executes Ethers.js v6 calls against <code className="text-violet-300 bg-canvas-900 px-1 py-0.5 rounded">latestRoundData()</code> and converts the raw integer by <code className="text-violet-300 bg-canvas-900 px-1 py-0.5 rounded">10^decimals()</code>. Stale checks evaluate <code className="text-violet-300 bg-canvas-900 px-1 py-0.5 rounded">now - updatedAt &gt; 3600</code> to prevent oracle latency exploits.
        </p>
      </div>
    </div>
  );
};
