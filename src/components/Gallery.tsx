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
  X,
  Compass,
  ArrowUpRight,
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
  onNavigateToStudio?: () => void;
  onNavigateToCreate?: () => void;
  onOpenSettings: () => void;
  initialOwnerFilter?: boolean;
}

export const Gallery: React.FC<GalleryProps> = ({
  contractAddress,
  onNavigateToStudio,
  onNavigateToCreate,
  onOpenSettings,
  initialOwnerFilter = false,
}) => {
  const navigateToCreate = onNavigateToCreate || onNavigateToStudio || (() => {});
  const { address, provider: walletProvider } = useWallet();

  const [items, setItems] = useState<NFTItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterOwnerOnly, setFilterOwnerOnly] = useState<boolean>(initialOwnerFilter);
  const [selectedNft, setSelectedNft] = useState<NFTItem | null>(null);

  // Sync initialOwnerFilter prop if parent changes tabs (e.g. Explore vs My NFTs)
  useEffect(() => {
    setFilterOwnerOnly(initialOwnerFilter);
  }, [initialOwnerFilter]);

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
        // Try next fallback gateway
      }
    }
    return null;
  };

  // Resolve ENS Name for an address on Mainnet
  const resolveEnsName = async (addr: string): Promise<string | null> => {
    try {
      for (const rpc of MAINNET_RPC_URLS) {
        try {
          const mainnetProvider = new ethers.JsonRpcProvider(rpc);
          const name = await mainnetProvider.lookupAddress(addr);
          if (name) return name;
        } catch {
          // Try next RPC
        }
      }
    } catch {
      // Ignore
    }
    return null;
  };

  // Load All On-Chain NFTs via Contract events and totalMinted()
  const loadGallery = useCallback(async () => {
    if (!contractAddress || !ethers.isAddress(contractAddress)) {
      setLoading(false);
      setItems([]);
      return;
    }

    try {
      setRefreshing(true);
      setError(null);

      let provider: ethers.Provider | null = walletProvider;
      if (!provider) {
        provider = new ethers.JsonRpcProvider(SEPOLIA_CONFIG.rpcUrls[0]);
      }

      const contract = new ethers.Contract(
        contractAddress,
        EtherCanvasNFTArtifact.abi,
        provider
      );

      let totalMinted = 0;
      try {
        const totalBN = await contract.totalMinted();
        totalMinted = Number(totalBN);
      } catch (err: any) {
        console.warn("totalMinted() call failed, falling back to event query", err);
      }

      // Query on-chain Minted events
      let mintedEvents: any[] = [];
      try {
        const filter = contract.filters.Minted();
        mintedEvents = await contract.queryFilter(filter, -50000);
      } catch (eventErr) {
        console.warn("Minted events query error:", eventErr);
      }

      // Map event logs
      const eventMap = new Map<number, { recipient: string; tokenUri: string; txHash: string }>();
      for (const event of mintedEvents) {
        if ("args" in event) {
          const tokenId = Number(event.args[1]);
          const recipient = event.args[0];
          const tokenUri = event.args[2];
          eventMap.set(tokenId, { recipient, tokenUri, txHash: event.transactionHash });
        }
      }

      const tokenIdsToFetch: number[] = [];
      if (totalMinted > 0) {
        for (let i = totalMinted; i >= 1; i--) {
          tokenIdsToFetch.push(i);
        }
      } else if (eventMap.size > 0) {
        tokenIdsToFetch.push(...Array.from(eventMap.keys()).sort((a, b) => b - a));
      }

      // Fetch metadata & details in parallel batches
      const fetchedItems: NFTItem[] = [];
      const batchSize = 6;
      for (let i = 0; i < tokenIdsToFetch.length; i += batchSize) {
        const batch = tokenIdsToFetch.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (tokenId) => {
            try {
              let owner = eventMap.get(tokenId)?.recipient || "";
              let tokenUri = eventMap.get(tokenId)?.tokenUri || "";
              const txHash = eventMap.get(tokenId)?.txHash;

              if (!owner) {
                try {
                  owner = await contract.ownerOf(tokenId);
                } catch {
                  // Burned or invalid
                  return null;
                }
              }

              if (!tokenUri) {
                try {
                  tokenUri = await contract.tokenURI(tokenId);
                } catch {
                  // Fallback
                }
              }

              let metadata: NFTMetadata | null = null;
              if (tokenUri) {
                metadata = await fetchMetadataWithFallback(tokenUri);
              }

              return {
                tokenId,
                owner,
                tokenUri,
                metadata,
                transactionHash: txHash,
              } as NFTItem;
            } catch (itemErr) {
              console.warn(`Error fetching token #${tokenId}:`, itemErr);
              return null;
            }
          })
        );

        for (const item of batchResults) {
          if (item) fetchedItems.push(item);
        }
      }

      setItems(fetchedItems);

      // Resolve ENS names in the background
      const uniqueOwners = Array.from(new Set(fetchedItems.map((it) => it.owner)));
      for (const ownerAddr of uniqueOwners) {
        resolveEnsName(ownerAddr).then((ens) => {
          if (ens) {
            setItems((current) =>
              current.map((it) => (it.owner === ownerAddr ? { ...it, ownerEns: ens } : it))
            );
          }
        });
      }
    } catch (err: any) {
      console.error("Gallery loading error:", err);
      setError(
        err.message || "Failed to load on-chain NFTs. Verify your Sepolia network connection."
      );
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
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAFAF8] border border-[#EAEAEA] text-[#737373] text-xs font-medium mb-3">
            <Compass className="w-3.5 h-3.5 text-[#E84B55]" />
            <span>On-Chain Sepolia Gallery</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#171717] tracking-tight">
            {filterOwnerOnly ? "My Collected Artworks" : "Discover & Collect Art"}
          </h1>
          <p className="text-sm text-[#737373] mt-1.5 max-w-xl">
            Immutable ERC-721 digital artifacts verified on Ethereum Sepolia and decentralized IPFS storage.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadGallery}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-[#EAEAEA] hover:border-[#D4D4D4] text-[#171717] text-xs font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-[#E84B55]" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Pinterest-style Search & Filter Bar */}
      <div className="bg-white border border-[#EAEAEA] rounded-2xl p-2.5 sm:p-3 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737373]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, token #, or owner 0x..."
            className="w-full pl-11 pr-9 py-2.5 rounded-xl bg-[#FAFAF8] border border-transparent focus:border-[#EAEAEA] focus:bg-white focus:outline-none text-[#171717] text-xs placeholder:text-[#A3A3A3] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#737373] hover:text-[#171717]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilterOwnerOnly(false)}
              className={`px-3.5 py-2 rounded-full text-xs font-medium transition-all ${
                !filterOwnerOnly
                  ? "bg-[#171717] text-white shadow-sm"
                  : "bg-[#FAFAF8] text-[#737373] hover:text-[#171717] hover:bg-[#F4F4F0]"
              }`}
            >
              All Artworks
            </button>

            {address && (
              <button
                onClick={() => setFilterOwnerOnly(true)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium transition-all ${
                  filterOwnerOnly
                    ? "bg-[#171717] text-white shadow-sm"
                    : "bg-[#FAFAF8] text-[#737373] hover:text-[#171717] hover:bg-[#F4F4F0]"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                My Collection
              </button>
            )}
          </div>

          <div className="text-xs font-mono text-[#737373] px-3 py-2 rounded-full bg-[#FAFAF8] border border-[#EAEAEA] whitespace-nowrap">
            Total Minted: <strong className="text-[#171717]">{items.length}</strong>
          </div>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" />
          <div className="text-sm font-medium">{error}</div>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white border border-[#EAEAEA] rounded-3xl p-4 space-y-4 shadow-sm">
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
        <div className="bg-white border border-[#EAEAEA] rounded-3xl p-12 text-center max-w-xl mx-auto space-y-4 shadow-card">
          <div className="w-14 h-14 rounded-2xl bg-[#FAFAF8] border border-[#EAEAEA] text-[#171717] flex items-center justify-center mx-auto">
            <Layers className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-[#171717]">
            Connect Deployed Contract
          </h2>
          <p className="text-xs text-[#737373] leading-relaxed">
            Please configure your deployed <code className="text-[#171717] bg-[#FAFAF8] px-1.5 py-0.5 rounded border border-[#EAEAEA] font-mono">EtherCanvasNFT</code> contract address to read real on-chain events and tokens.
          </p>
          <button
            onClick={onOpenSettings}
            className="px-6 py-2.5 rounded-full bg-[#171717] hover:bg-[#262626] text-white font-medium text-xs shadow-sm transition-all"
          >
            Open Contract Settings
          </button>
        </div>
      )}

      {/* Empty State: Contract Configured, but 0 Tokens Minted */}
      {!loading && contractAddress && items.length === 0 && (
        <div className="bg-white border border-[#EAEAEA] rounded-3xl p-12 text-center max-w-xl mx-auto space-y-4 shadow-card">
          <div className="w-14 h-14 rounded-2xl bg-[#FFF5F5] border border-[#FEE2E2] text-[#E84B55] flex items-center justify-center mx-auto">
            <Sparkles className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-[#171717]">
            No NFTs Minted Yet
          </h2>
          <p className="text-xs text-[#737373] leading-relaxed">
            The contract at <code className="text-[#171717] font-mono bg-[#FAFAF8] px-1.5 py-0.5 rounded border border-[#EAEAEA]">{truncate(contractAddress)}</code> is live on Sepolia, but no tokens have been minted yet. Be the first to create!
          </p>
          <button
            onClick={navigateToCreate}
            className="px-6 py-2.5 rounded-full bg-[#E84B55] hover:bg-[#D73843] text-white font-medium text-xs shadow-sm transition-all"
          >
            Create & Mint Token #1
          </button>
        </div>
      )}

      {/* Empty State: Search filter has 0 results */}
      {!loading && items.length > 0 && filteredItems.length === 0 && (
        <div className="bg-white border border-[#EAEAEA] rounded-3xl p-12 text-center max-w-md mx-auto space-y-3 shadow-card">
          <div className="w-12 h-12 rounded-full bg-[#FAFAF8] border border-[#EAEAEA] text-[#737373] flex items-center justify-center mx-auto">
            <Search className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-[#171717]">No Matching NFTs</h3>
          <p className="text-xs text-[#737373]">
            No tokens matched your current search query or collection filter.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setFilterOwnerOnly(false);
            }}
            className="px-4 py-2 rounded-full bg-[#171717] text-white text-xs font-medium"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Pinterest-Style Masonry Gallery Cards */}
      {!loading && filteredItems.length > 0 && (
        <div className="masonry-columns">
          {filteredItems.map((nft) => {
            const rawImageUrl = nft.metadata?.image || "";
            const imageUrl = formatIpfsUrl(rawImageUrl);

            return (
              <div
                key={nft.tokenId}
                onClick={() => setSelectedNft(nft)}
                className="masonry-item glass-card bg-white border border-[#EAEAEA] rounded-3xl p-3.5 flex flex-col justify-between group cursor-pointer relative shadow-card hover:shadow-hover hover:-translate-y-1 transition-all duration-300"
              >
                {/* Artwork Image Container */}
                <div className="relative rounded-2xl overflow-hidden bg-[#FAFAF8] border border-[#EAEAEA] aspect-square">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={nft.metadata?.name || `Token #${nft.tokenId}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#A3A3A3]">
                      <ImageIcon className="w-10 h-10" />
                    </div>
                  )}

                  {/* Token ID Badge */}
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md border border-[#EAEAEA] text-[#171717] text-[11px] font-mono font-bold shadow-sm">
                    #{nft.tokenId}
                  </div>

                  {/* Hover Overlay with Quick Action Pill */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                    <span className="px-3.5 py-1.5 rounded-full bg-white text-[#171717] text-xs font-semibold shadow-lg flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                      View Details
                      <ArrowUpRight className="w-3.5 h-3.5 text-[#E84B55]" />
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="pt-3.5 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-[#171717] group-hover:text-[#E84B55] transition-colors truncate">
                      {nft.metadata?.name || `EtherCanvas #${nft.tokenId}`}
                    </h3>
                    <p className="text-xs text-[#737373] line-clamp-2 mt-0.5 leading-relaxed">
                      {nft.metadata?.description || "No description provided."}
                    </p>
                  </div>

                  {/* Attributes Pills */}
                  {nft.metadata?.attributes && nft.metadata.attributes.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {nft.metadata.attributes.slice(0, 2).map((attr, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-[#FAFAF8] border border-[#EAEAEA] text-[10px] text-[#737373] font-mono"
                        >
                          {attr.trait_type}: {attr.value}
                        </span>
                      ))}
                      {nft.metadata.attributes.length > 2 && (
                        <span className="px-1.5 py-0.5 rounded-md bg-[#FAFAF8] text-[10px] text-[#A3A3A3]">
                          +{nft.metadata.attributes.length - 2}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Owner & Links Footer */}
                  <div className="pt-2.5 border-t border-[#EAEAEA] flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-1.5 text-[#737373]">
                      <div className="w-4 h-4 rounded-full bg-[#FAFAF8] border border-[#EAEAEA] flex items-center justify-center text-[9px] font-bold text-[#171717]">
                        {nft.owner.substring(2, 4).toUpperCase()}
                      </div>
                      <span className="truncate max-w-[120px]">{nft.ownerEns || truncate(nft.owner)}</span>
                    </div>

                    <a
                      href={`https://sepolia.etherscan.io/address/${contractAddress}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[#737373] hover:text-[#171717] p-1"
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in"
          onClick={() => setSelectedNft(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto border border-[#EAEAEA] shadow-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="sm:w-1/2 aspect-square rounded-2xl overflow-hidden bg-[#FAFAF8] border border-[#EAEAEA]">
                <img
                  src={formatIpfsUrl(selectedNft.metadata?.image || "")}
                  alt={selectedNft.metadata?.name || "NFT"}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="sm:w-1/2 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-[#FFF5F5] text-[#E84B55] font-mono text-xs font-bold border border-[#FEE2E2]">
                    Token #{selectedNft.tokenId}
                  </span>
                  <button
                    onClick={() => setSelectedNft(null)}
                    className="p-1 rounded-full text-[#737373] hover:text-[#171717] hover:bg-[#FAFAF8]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <h2 className="text-2xl font-bold text-[#171717] font-sans">
                  {selectedNft.metadata?.name || `EtherCanvas #${selectedNft.tokenId}`}
                </h2>

                <p className="text-xs text-[#737373] leading-relaxed">
                  {selectedNft.metadata?.description || "No description provided."}
                </p>

                {/* Owner info */}
                <div className="p-3.5 rounded-2xl bg-[#FAFAF8] border border-[#EAEAEA] space-y-1 text-xs font-mono">
                  <div className="text-[#737373] font-medium">Owner Address:</div>
                  <div className="text-[#171717] font-semibold break-all">
                    {selectedNft.ownerEns ? `${selectedNft.ownerEns} (${selectedNft.owner})` : selectedNft.owner}
                  </div>
                </div>

                {/* Attributes list */}
                {selectedNft.metadata?.attributes && selectedNft.metadata.attributes.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase text-[#737373] font-mono">
                      Attributes & Traits
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedNft.metadata.attributes.map((attr, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-[#FAFAF8] border border-[#EAEAEA] text-xs font-mono"
                        >
                          <div className="text-[10px] text-[#737373] uppercase">{attr.trait_type}</div>
                          <div className="text-[#171717] font-semibold">{attr.value}</div>
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
                      className="flex items-center justify-between p-3 rounded-xl bg-[#FAFAF8] hover:bg-[#F4F4F0] text-[#171717] border border-[#EAEAEA] transition-colors"
                    >
                      <span>IPFS Metadata URI</span>
                      <ExternalLink className="w-3.5 h-3.5 text-[#737373]" />
                    </a>
                  )}

                  {selectedNft.transactionHash && (
                    <a
                      href={`https://sepolia.etherscan.io/tx/${selectedNft.transactionHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-3 rounded-xl bg-[#FAFAF8] hover:bg-[#F4F4F0] text-[#171717] border border-[#EAEAEA] transition-colors"
                    >
                      <span>Mint Transaction on Etherscan</span>
                      <ExternalLink className="w-3.5 h-3.5 text-[#737373]" />
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
