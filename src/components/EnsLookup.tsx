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
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FAFAF8] border border-[#EAEAEA] text-[#737373] text-xs font-semibold uppercase tracking-wider">
          <Globe className="w-3.5 h-3.5 text-[#E84B55]" />
          Decentralized Identity Explorer
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#171717] tracking-tight">
          ENS Profile Search
        </h1>
        <p className="text-sm text-[#737373] max-w-xl mx-auto leading-relaxed">
          Resolve human-readable <span className="text-[#171717] font-mono font-medium">.eth</span> names into
          cryptographic addresses and explore on-chain avatars, bios, and social records without
          connecting a wallet.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="bg-white border border-[#EAEAEA] rounded-3xl p-4 sm:p-5 shadow-card relative">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex flex-col sm:flex-row items-center gap-3"
        >
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#737373]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter ENS name (e.g. vitalik.eth) or 0x address..."
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-[#FAFAF8] border border-[#EAEAEA] focus:border-[#171717] focus:bg-white focus:outline-none text-[#171717] font-mono text-sm placeholder:text-[#A3A3A3] transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#171717] hover:bg-[#262626] active:scale-95 text-white font-semibold text-sm shadow-sm transition-all disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
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
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-[#EAEAEA] text-xs">
          <span className="text-[#737373] font-medium">Try Popular ENS:</span>
          {presets.map((name) => (
            <button
              key={name}
              onClick={() => {
                setQuery(name);
                handleSearch(name);
              }}
              className="px-3 py-1 rounded-full bg-[#FAFAF8] hover:bg-[#F4F4F0] border border-[#EAEAEA] text-[#171717] font-mono transition-colors"
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Error Feedback */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
          <div className="text-sm font-medium">{error}</div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="bg-white border border-[#EAEAEA] rounded-3xl p-6 sm:p-8 space-y-6 shadow-card">
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
        <div className="bg-white border border-[#EAEAEA] rounded-3xl p-6 sm:p-8 space-y-6 shadow-card animate-in fade-in zoom-in-95">
          {/* Header Profile Info */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt={profile.name || "ENS Avatar"}
                className="w-24 h-24 rounded-2xl object-cover border-2 border-[#EAEAEA] shadow-sm"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-[#FAFAF8] border border-[#EAEAEA] flex items-center justify-center text-3xl font-extrabold text-[#171717] shadow-sm">
                {(profile.name ? profile.name.charAt(0) : "E").toUpperCase()}
              </div>
            )}

            <div className="space-y-2 flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h2 className="text-2xl font-bold text-[#171717]">
                  {profile.name || "Primary Name Not Set"}
                </h2>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-mono font-medium self-center sm:self-auto">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Verified on Ethereum
                </span>
              </div>

              {/* Resolved Address Box */}
              {profile.address && (
                <div className="flex items-center justify-center sm:justify-start gap-2 bg-[#FAFAF8] px-3.5 py-2 rounded-xl border border-[#EAEAEA] font-mono text-xs text-[#171717]">
                  <span className="truncate max-w-xs">{profile.address}</span>
                  <button
                    onClick={() => copyToClipboard(profile.address!)}
                    className="p-1 rounded-md hover:bg-white text-[#737373] hover:text-[#171717] transition-colors"
                    title="Copy full address"
                  >
                    {copied ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <a
                    href={`https://etherscan.io/address/${profile.address}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 rounded-md hover:bg-white text-[#737373] hover:text-[#171717] transition-colors"
                    title="View on Etherscan"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {profile.description && (
                <p className="text-xs text-[#737373] leading-relaxed italic pt-1">
                  "{profile.description}"
                </p>
              )}
            </div>
          </div>

          {/* Social / Text Records Grid */}
          <div className="pt-4 border-t border-[#EAEAEA]">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#737373] font-mono mb-3">
              On-Chain Text Records
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {profile.twitter && (
                <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-[#FAFAF8] border border-[#EAEAEA]">
                  <Twitter className="w-4 h-4 text-sky-500" />
                  <span className="text-[#737373]">Twitter/X:</span>
                  <a
                    href={`https://twitter.com/${profile.twitter.replace("@", "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#171717] hover:underline font-mono font-medium truncate"
                  >
                    {profile.twitter}
                  </a>
                </div>
              )}

              {profile.github && (
                <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-[#FAFAF8] border border-[#EAEAEA]">
                  <Github className="w-4 h-4 text-[#171717]" />
                  <span className="text-[#737373]">GitHub:</span>
                  <a
                    href={`https://github.com/${profile.github}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#171717] hover:underline font-mono font-medium truncate"
                  >
                    {profile.github}
                  </a>
                </div>
              )}

              {profile.url && (
                <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-[#FAFAF8] border border-[#EAEAEA]">
                  <Globe className="w-4 h-4 text-[#E84B55]" />
                  <span className="text-[#737373]">Website:</span>
                  <a
                    href={profile.url.startsWith("http") ? profile.url : `https://${profile.url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#171717] hover:underline font-mono font-medium truncate"
                  >
                    {profile.url}
                  </a>
                </div>
              )}

              {profile.email && (
                <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-[#FAFAF8] border border-[#EAEAEA]">
                  <Mail className="w-4 h-4 text-rose-500" />
                  <span className="text-[#737373]">Email:</span>
                  <span className="text-[#171717] font-mono font-medium truncate">{profile.email}</span>
                </div>
              )}

              {!profile.twitter && !profile.github && !profile.url && !profile.email && (
                <div className="sm:col-span-2 text-xs text-[#737373] py-1">
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
