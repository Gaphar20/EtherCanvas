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

// ----------------------------------------------------
// Day 4: Smart Account Batch Mint Types
// ----------------------------------------------------

export interface BatchMintItemConfig {
  name: string;
  description: string;
  recipient: string;
  imagePreview: string | null;
  imageFile: File | null;
  metadataUri: string | null;
  attributes: TraitAttribute[];
}

export interface BatchCallInfo {
  callIndex: number;
  targetContract: string;
  recipient: string;
  tokenUri: string;
  functionSignature: string;
  callData: string;
}

export type BatchMintStatus =
  | "idle"
  | "uploading_ipfs"
  | "connecting_smart_account"
  | "awaiting_signature"
  | "submitting_userop"
  | "confirming_userop"
  | "success"
  | "error";

export interface UserOpExecutionResult {
  userOpHash: string;
  transactionHash?: string;
  blockNumber?: number;
  smartAccountAddress: string;
  ownerAddress: string;
  sponsored: boolean;
  actualGasUsed?: string;
  actualGasCostSep?: string;
  tokenIds: number[];
  mintedUris: string[];
  etherscanTxUrl?: string;
  entryPointAddress: string;
  timestamp: number;
}

// ----------------------------------------------------
// Day 4: Live Event Alerts Types
// ----------------------------------------------------

export interface MintEventAlert {
  id: string; // `${txHash}-${logIndex}`
  transactionHash: string;
  logIndex: number;
  tokenId: number;
  recipient: string;
  recipientEns?: string | null;
  tokenUri: string;
  metadata?: NFTMetadata | null;
  blockNumber: number;
  timestamp?: number;
  isLiveEvent: boolean;
  etherscanUrl: string;
}

export type AlertConnectionStatus =
  | "connecting"
  | "listening"
  | "reconnecting"
  | "error"
  | "paused";
