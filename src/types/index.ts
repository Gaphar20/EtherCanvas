export interface TraitAttribute {
  trait_type: string;
  value: string | number;
}

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  external_url?: string;
  attributes?: TraitAttribute[];
  created_at?: string;
}

export interface NFTItem {
  tokenId: number;
  owner: string;
  ownerEns?: string | null;
  tokenUri: string;
  metadata?: NFTMetadata | null;
  transactionHash?: string;
  blockNumber?: number;
  loading?: boolean;
  error?: string | null;
}

export interface ChainlinkPriceData {
  price: number;
  formattedPrice: string;
  roundId: string;
  updatedAt: number;
  updateAgeSeconds: number;
  isStale: boolean;
  decimals: number;
  loading: boolean;
  error: string | null;
  lastFetchedAt: Date | null;
}

export interface EnsProfile {
  name: string | null;
  address: string | null;
  avatar: string | null;
  description?: string | null;
  twitter?: string | null;
  github?: string | null;
  url?: string | null;
  email?: string | null;
}

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title: string;
  message?: string;
  txHash?: string;
}
