import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import {
  Layers,
  ExternalLink,
  RefreshCw,
  Search,
  Filter,
  AlertCircle,
  Sparkles,
  User,
  ShieldCheck,
  Tag,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import EtherCanvasNFTArtifact from "@/contracts/EtherCanvasNFT.json";
import {
  formatIpfsUrl,
  getIpfsFallbacks,
  SEPOLIA_CONFIG,
  MAINNET_RPC_URLS,
} from "@/contracts/addresses";
import { NFTItem, NFTMetadata } from "@/types";

interface GalleryProps {
  contractAddress: string;
  onNavigateToStudio: () => void;
  onOpenSettings: () => void;
}

export const Gallery: React.FC<GalleryProps> = ({
  contractAddress,
  onNavigateToStudio,
  onOpenSettings,
}) => {
  const { address, provider: walletProvider } = useWallet();

  const [items, setItems] = useState<NFTItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterOwnerOnly, setFilterOwnerOnly] = useState<boolean>(false);
  const [selectedNft, setSelectedNft] = useState<NFTItem | null>(null);

  // Helper to fetch IPFS metadata JSON with multi-gateway fallbacks
  const fetchMetadataWithFallback = async (uri: string): Promise<NFTMetadata | null> => {
    const urls = getIpfsFallbacks(uri);
    for (const url of urls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const json = await res.json();
          return json;
        }
      } catch {
        // Try next gateway
      }
    }
    return null;
  };

  // Resolve ENS name for an owner
  const resolveOwnerEns = async (ownerAddr: string): Promise<string | null> => {
    try {
      const ensProvider = new ethers.JsonRpcProvider(MAINNET_RPC_URLS[0]);
      return await ensProvider.lookupAddress(ownerAddr);
    } catch {
      return null;
    }
  };

  // Load real on-chain NFTs
  const loadGallery = useCallback(async () => {
    if (!contractAddress || !ethers.isAddress(contractAddress)) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setRefreshing(true);

      // Use connected wallet provider or public Sepolia provider
      const readProvider =
        walletProvider || new ethers.JsonRpcProvider(SEPOLIA_CONFIG.rpcUrls[0]);

      const contract = new ethers.Contract(
        contractAddress,
        EtherCanvasNFTArtifact.abi,
        readProvider
      );

      // 1. Read total minted count
      let totalMintedCount = 0;
      try {
        const count = await contract.totalMinted();
        totalMintedCount = Number(count);
      } catch (err) {
        console.warn("Could not read totalMinted, trying queryFilter:", err);
      }

      // 2. Also query Minted events for event-level accuracy & tx hashes
      let mintedEvents: any[] = [];
      try {
        const filter = contract.filters.Minted();
        // Look back over recent blocks or from block 0
        mintedEvents = await contract.queryFilter(filter, -50000);
      } catch (eventErr) {
        console.warn("Event query notice:", eventErr);
      }

      // If neither events nor totalMinted returned data
      if (totalMintedCount === 0 && mintedEvents.length === 0) {
        setItems([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Aggregate token IDs to inspect
      const tokenIds = new Set<number>();
      for (let i = 1; i <= totalMintedCount; i++) {
        tokenIds.add(i);
      }
      for (const ev of mintedEvents) {
        if (ev.args && ev.args.tokenId) {
          tokenIds.add(Number(ev.args.tokenId));
        }
      }

      const sortedIds = Array.from(tokenIds).sort((a, b) => b - a); // Newest first

      // 3. Concurrently fetch tokenURI, ownerOf, and IPFS metadata
      const nftItems: NFTItem[] = await Promise.all(
        sortedIds.map(async (tokenId) => {
          try {
            const [owner, tokenUri] = await Promise.all([
              contract.ownerOf(tokenId),
              contract.tokenURI(tokenId),
            ]);

            // Find event for transactionHash
            const eventMatch = mintedEvents.find(
              (ev) => ev.args && Number(ev.args.tokenId) === tokenId
            );

            // Fetch IPFS metadata
            const metadata = await fetchMetadataWithFallback(tokenUri);

            // Try resolving owner ENS
            const ownerEns = await resolveOwnerEns(owner);

            return {
              tokenId,
              owner,
              ownerEns,
              tokenUri,
              metadata,
              transactionHash: eventMatch?.transactionHash,
              blockNumber: eventMatch?.blockNumber,
            };
          } catch (tokenErr: any) {
            console.warn(`Failed reading token #${tokenId}:`, tokenErr);
            return {
              tokenId,
              owner: "Unknown",
              tokenUri: "",
              error: tokenErr.message,
            };
          }
        })
      );

      setItems(nftItems.filter((item) => !item.error));
    } catch (err: any) {
      console.error("Gallery load error:", err);
      setError(err.message || "Failed to load on-chain gallery.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [contractAddress, walletProvider]);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  // Filtered items
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      searchQuery.trim() === "" ||
      item.tokenId.toString() === searchQuery.trim() ||
      item.metadata?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.owner.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesOwner =
      !filterOwnerOnly ||
      (address && item.owner.toLowerCase() === address.toLowerCase());

    return matchesSearch && matchesOwner;
  });

  const truncate = (str: string) => {
    if (!str) return "";
    return `${str.substring(0, 6)}...${str.substring(str.length - 4)}`;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <Layers className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-sans">
              On-Chain NFT Gallery
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Live ERC-721 tokens verified on Ethereum Sepolia and decentralized IPFS storage
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadGallery}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-canvas-900 border border-violet-900/40 hover:border-violet-500/50 text-slate-300 text-xs font-medium transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-violet-400" : ""}`} />
            Refresh Chain
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, token ID #, or owner 0x..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-canvas-900/90 border border-violet-900/40 focus:border-violet-500 focus:outline-none text-white text-xs placeholder:text-slate-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {address && (
            <button
              onClick={() => setFilterOwnerOnly(!filterOwnerOnly)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                filterOwnerOnly
                  ? "bg-violet-600/30 border-violet-500 text-violet-200"
                  : "bg-canvas-900 border-violet-900/40 text-slate-400 hover:text-white"
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              My NFTs Only
            </button>
          )}

          <div className="text-xs font-mono text-slate-400 px-3 py-2 rounded-xl bg-canvas-900 border border-violet-900/30">
            Total Minted: <strong className="text-violet-300">{items.length}</strong>
          </div>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
          <div className="text-sm">{error}</div>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card rounded-3xl p-4 space-y-4">
              <div className="aspect-square rounded-2xl skeleton-shimmer" />
              <div className="w-2/3 h-5 rounded-lg skeleton-shimmer" />
              <div className="w-full h-4 rounded-lg skeleton-shimmer" />
              <div className="w-1/2 h-4 rounded-lg skeleton-shimmer" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State: No Contract Configured */}
      {!loading && !contractAddress && (
        <div className="glass-panel rounded-3xl p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-violet-600/20 border border-violet-500/30 text-violet-400 flex items-center justify-center mx-auto">
            <Layers className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white font-sans">
            Connect Deployed Contract
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Please configure your deployed <code className="text-violet-300 bg-canvas-900 px-1 py-0.5 rounded">EtherCanvasNFT</code> contract address to read real on-chain events and tokens.
          </p>
          <button
            onClick={onOpenSettings}
            className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition-all shadow-lg shadow-violet-900/30"
          >
            Open Contract Settings
          </button>
        </div>
      )}

      {/* Empty State: Contract Configured, but 0 Tokens Minted */}
      {!loading && contractAddress && items.length === 0 && (
        <div className="glass-panel rounded-3xl p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-violet-600/20 border border-violet-500/30 text-violet-400 flex items-center justify-center mx-auto">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white font-sans">
            No NFTs Minted Yet
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            The contract at <code className="text-violet-300 font-mono">{truncate(contractAddress)}</code> is live on Sepolia, but no tokens have been minted yet. Be the first to mint!
          </p>
          <button
            onClick={onNavigateToStudio}
            className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition-all shadow-lg shadow-violet-900/30"
          >
            Go to NFT Studio & Mint #1
          </button>
        </div>
      )}

      {/* Gallery NFT Cards Grid */}
      {!loading && filteredItems.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((nft) => {
            const rawImageUrl = nft.metadata?.image || "";
            const imageUrl = formatIpfsUrl(rawImageUrl);

            return (
              <div
                key={nft.tokenId}
                onClick={() => setSelectedNft(nft)}
                className="glass-card rounded-3xl p-4 flex flex-col justify-between group cursor-pointer relative"
              >
                {/* Artwork Image Container */}
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-canvas-900/90 border border-violet-900/30">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={nft.metadata?.name || `Token #${nft.tokenId}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        // Fallback image indicator
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                      <ImageIcon className="w-12 h-12" />
                    </div>
                  )}

                  {/* Token ID Badge */}
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-xl bg-canvas-950/80 backdrop-blur-md border border-violet-500/30 text-white text-xs font-mono font-bold">
                    #{nft.tokenId}
                  </div>
                </div>

                {/* Content */}
                <div className="pt-4 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-violet-300 transition-colors truncate">
                      {nft.metadata?.name || `EtherCanvas #${nft.tokenId}`}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                      {nft.metadata?.description || "No description provided."}
                    </p>
                  </div>

                  {/* Attributes Pills */}
                  {nft.metadata?.attributes && nft.metadata.attributes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {nft.metadata.attributes.slice(0, 2).map((attr, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-violet-950/60 border border-violet-800/40 text-[10px] text-violet-300 font-mono"
                        >
                          {attr.trait_type}: {attr.value}
                        </span>
                      ))}
                      {nft.metadata.attributes.length > 2 && (
                        <span className="px-1.5 py-0.5 rounded-md bg-canvas-900 text-[10px] text-slate-400">
                          +{nft.metadata.attributes.length - 2}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Owner & Links Footer */}
                  <div className="pt-3 border-t border-violet-900/30 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <User className="w-3.5 h-3.5 text-violet-400" />
                      <span>{nft.ownerEns || truncate(nft.owner)}</span>
                    </div>

                    <a
                      href={`https://sepolia.etherscan.io/address/${contractAddress}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-violet-400 hover:text-violet-300"
                      title="View contract on Sepolia Etherscan"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detailed Modal for Selected NFT */}
      {selectedNft && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
          onClick={() => setSelectedNft(null)}
        >
          <div
            className="glass-panel rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="sm:w-1/2 aspect-square rounded-2xl overflow-hidden bg-canvas-900 border border-violet-500/30">
                <img
                  src={formatIpfsUrl(selectedNft.metadata?.image || "")}
                  alt={selectedNft.metadata?.name || "NFT"}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="sm:w-1/2 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-violet-600/20 text-violet-300 font-mono text-xs font-bold border border-violet-500/30">
                    Token #{selectedNft.tokenId}
                  </span>
                  <button
                    onClick={() => setSelectedNft(null)}
                    className="text-slate-400 hover:text-white text-lg font-bold"
                  >
                    ✕
                  </button>
                </div>

                <h2 className="text-2xl font-bold text-white font-sans">
                  {selectedNft.metadata?.name || `EtherCanvas #${selectedNft.tokenId}`}
                </h2>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {selectedNft.metadata?.description || "No description provided."}
                </p>

                {/* Owner info */}
                <div className="p-3 rounded-xl bg-canvas-900 border border-violet-900/40 space-y-1 text-xs font-mono">
                  <div className="text-slate-400">Owner:</div>
                  <div className="text-white font-semibold break-all">
                    {selectedNft.ownerEns ? `${selectedNft.ownerEns} (${selectedNft.owner})` : selectedNft.owner}
                  </div>
                </div>

                {/* Attributes list */}
                {selectedNft.metadata?.attributes && selectedNft.metadata.attributes.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase text-violet-400 font-mono">
                      Attributes
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedNft.metadata.attributes.map((attr, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-lg bg-canvas-900/80 border border-violet-900/40 text-xs font-mono"
                        >
                          <div className="text-[10px] text-slate-400 uppercase">{attr.trait_type}</div>
                          <div className="text-violet-300 font-semibold">{attr.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* External links */}
                <div className="pt-2 space-y-2 text-xs font-mono">
                  {selectedNft.tokenUri && (
                    <a
                      href={formatIpfsUrl(selectedNft.tokenUri)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-2.5 rounded-xl bg-canvas-900 hover:bg-violet-950/40 text-violet-300 border border-violet-900/40 transition-colors"
                    >
                      <span>IPFS Metadata URI</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}

                  {selectedNft.transactionHash && (
                    <a
                      href={`https://sepolia.etherscan.io/tx/${selectedNft.transactionHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-2.5 rounded-xl bg-canvas-900 hover:bg-violet-950/40 text-violet-300 border border-violet-900/40 transition-colors"
                    >
                      <span>Mint Transaction on Etherscan</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
