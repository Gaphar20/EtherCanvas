import React, { useState } from "react";
import { ethers } from "ethers";
import {
  Search,
  Globe,
  User,
  Copy,
  CheckCircle2,
  ExternalLink,
  Twitter,
  Github,
  Mail,
  Sparkles,
  AlertCircle,
  ArrowRightLeft,
  Loader2,
} from "lucide-react";
import { MAINNET_RPC_URLS, formatIpfsUrl } from "@/contracts/addresses";
import { EnsProfile } from "@/types";

export const EnsLookup: React.FC = () => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<EnsProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const presets = ["vitalik.eth", "nick.eth", "ethereum.eth", "ricmoo.eth", "dr3w.eth"];

  const handleSearch = async (searchTerm?: string) => {
    const rawQuery = (searchTerm !== undefined ? searchTerm : query).trim();
    if (!rawQuery) return;

    setLoading(true);
    setError(null);
    setProfile(null);

    try {
      // Connect to Mainnet public RPC for ENS resolution (No wallet required!)
      let provider: ethers.JsonRpcProvider | null = null;
      let lastErr: any = null;

      for (const rpc of MAINNET_RPC_URLS) {
        try {
          provider = new ethers.JsonRpcProvider(rpc);
          await provider.getBlockNumber();
          break;
        } catch (e) {
          lastErr = e;
          provider = null;
        }
      }

      if (!provider) {
        throw new Error("Unable to connect to public Ethereum RPC for ENS lookup.");
      }

      let resolvedAddress: string | null = null;
      let resolvedName: string | null = null;

      // Check if user entered an Ethereum address (Reverse lookup)
      const isEthAddress = ethers.isAddress(rawQuery);
      if (isEthAddress) {
        resolvedAddress = rawQuery;
        resolvedName = await provider.lookupAddress(rawQuery);
      } else {
        // Forward lookup for .eth or other TLD
        const queryStr: string = String(rawQuery);
        const formattedName = queryStr.endsWith(".eth") ? queryStr : `${queryStr}.eth`;
        resolvedName = formattedName;
        resolvedAddress = await provider.resolveName(formattedName);
      }

      if (!resolvedAddress && !resolvedName) {
        setError(`No ENS records found for "${rawQuery}". Please check the spelling.`);
        setLoading(false);
        return;
      }

      // If we have an ENS name, query avatar and text records via Resolver
      let avatarUrl: string | null = null;
      let textRecords: Record<string, string | null> = {
        description: null,
        twitter: null,
        github: null,
        url: null,
        email: null,
      };

      if (resolvedName) {
        try {
          const resolver = await provider.getResolver(resolvedName);
          if (resolver) {
            const avatar = await resolver.getAvatar();
            if (avatar) {
              avatarUrl = formatIpfsUrl(avatar);
            }

            const [desc, tw, gh, website, mail] = await Promise.all([
              resolver.getText("description").catch(() => null),
              resolver.getText("com.twitter").catch(() => null),
              resolver.getText("com.github").catch(() => null),
              resolver.getText("url").catch(() => null),
              resolver.getText("email").catch(() => null),
            ]);

            textRecords = {
              description: desc,
              twitter: tw,
              github: gh,
              url: website,
              email: mail,
            };
          }
        } catch (resolverErr) {
          console.warn("Resolver query notice:", resolverErr);
        }
      }

      setProfile({
        name: resolvedName,
        address: resolvedAddress,
        avatar: avatarUrl,
        ...textRecords,
      });
    } catch (err: any) {
      console.error("ENS lookup failed:", err);
      setError(err.message || "Failed to resolve ENS name.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-semibold uppercase tracking-wider">
          <Globe className="w-3.5 h-3.5" />
          Decentralized Identity Explorer
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white font-sans tracking-tight">
          ENS Profile Search
        </h1>
        <p className="text-sm text-slate-400 max-w-xl mx-auto">
          Resolve human-readable <span className="text-violet-400 font-mono">.eth</span> names into
          cryptographic addresses and explore on-chain avatars, bios, and social records without
          connecting a wallet.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="glass-panel rounded-3xl p-4 sm:p-5 shadow-2xl relative">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex flex-col sm:flex-row items-center gap-3"
        >
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter ENS name (e.g. vitalik.eth) or 0x address..."
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-canvas-900/90 border border-violet-900/40 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 text-white font-mono text-sm placeholder:text-slate-500 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-500 active:scale-95 text-white font-semibold text-sm shadow-lg shadow-violet-900/40 transition-all disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Resolving...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Explore
              </>
            )}
          </button>
        </form>

        {/* Quick test presets */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-violet-900/30 text-xs">
          <span className="text-slate-400 font-medium">Try Popular ENS:</span>
          {presets.map((name) => (
            <button
              key={name}
              onClick={() => {
                setQuery(name);
                handleSearch(name);
              }}
              className="px-2.5 py-1 rounded-lg bg-canvas-900 hover:bg-violet-950/60 border border-violet-900/40 hover:border-violet-500/40 text-violet-300 font-mono transition-colors"
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Error Feedback */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
          <div className="text-sm">{error}</div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl skeleton-shimmer" />
            <div className="space-y-3 flex-1">
              <div className="w-44 h-6 rounded-lg skeleton-shimmer" />
              <div className="w-72 h-4 rounded-lg skeleton-shimmer" />
            </div>
          </div>
          <div className="w-full h-16 rounded-xl skeleton-shimmer" />
        </div>
      )}

      {/* Resolved Profile Card */}
      {profile && !loading && (
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-violet-500/30 shadow-2xl animate-in fade-in zoom-in-95">
          {/* Header Profile Info */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt={profile.name || "ENS Avatar"}
                className="w-24 h-24 rounded-2xl object-cover border-2 border-violet-500/40 shadow-xl"
                onError={(e) => {
                  // Fallback if image fails to load
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-violet-600 via-purple-600 to-indigo-600 flex items-center justify-center text-3xl font-extrabold text-white shadow-xl border-2 border-violet-400/30">
                {(profile.name ? profile.name.charAt(0) : "E").toUpperCase()}
              </div>
            )}

            <div className="space-y-2 flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h2 className="text-2xl font-bold text-white font-sans">
                  {profile.name || "Primary Name Not Set"}
                </h2>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 text-xs font-mono font-medium self-center sm:self-auto">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Verified on Ethereum
                </span>
              </div>

              {/* Resolved Address Box */}
              {profile.address && (
                <div className="flex items-center justify-center sm:justify-start gap-2 bg-canvas-900/80 px-3.5 py-2 rounded-xl border border-violet-900/40 font-mono text-xs text-slate-300">
                  <span className="truncate max-w-xs">{profile.address}</span>
                  <button
                    onClick={() => copyToClipboard(profile.address!)}
                    className="p-1 rounded hover:bg-violet-950/60 text-slate-400 hover:text-white transition-colors"
                    title="Copy full address"
                  >
                    {copied ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <a
                    href={`https://etherscan.io/address/${profile.address}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 rounded hover:bg-violet-950/60 text-slate-400 hover:text-violet-300 transition-colors"
                    title="View on Etherscan"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {profile.description && (
                <p className="text-xs text-slate-300 leading-relaxed italic pt-1">
                  "{profile.description}"
                </p>
              )}
            </div>
          </div>

          {/* Social / Text Records Grid */}
          <div className="pt-4 border-t border-violet-900/30">
            <div className="text-xs font-semibold uppercase tracking-wider text-violet-400 font-mono mb-3">
              On-Chain Text Records
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {profile.twitter && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-canvas-900/60 border border-violet-900/30">
                  <Twitter className="w-4 h-4 text-sky-400" />
                  <span className="text-slate-400">Twitter/X:</span>
                  <a
                    href={`https://twitter.com/${profile.twitter.replace("@", "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-300 hover:underline font-mono truncate"
                  >
                    {profile.twitter}
                  </a>
                </div>
              )}

              {profile.github && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-canvas-900/60 border border-violet-900/30">
                  <Github className="w-4 h-4 text-slate-200" />
                  <span className="text-slate-400">GitHub:</span>
                  <a
                    href={`https://github.com/${profile.github}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-white hover:underline font-mono truncate"
                  >
                    {profile.github}
                  </a>
                </div>
              )}

              {profile.url && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-canvas-900/60 border border-violet-900/30">
                  <Globe className="w-4 h-4 text-violet-400" />
                  <span className="text-slate-400">Website:</span>
                  <a
                    href={profile.url.startsWith("http") ? profile.url : `https://${profile.url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-violet-300 hover:underline font-mono truncate"
                  >
                    {profile.url}
                  </a>
                </div>
              )}

              {profile.email && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-canvas-900/60 border border-violet-900/30">
                  <Mail className="w-4 h-4 text-rose-400" />
                  <span className="text-slate-400">Email:</span>
                  <span className="text-slate-200 font-mono truncate">{profile.email}</span>
                </div>
              )}

              {!profile.twitter && !profile.github && !profile.url && !profile.email && (
                <div className="sm:col-span-2 text-xs text-slate-500 py-1">
                  No additional public text records (Twitter, GitHub, URL) registered for this ENS name.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
