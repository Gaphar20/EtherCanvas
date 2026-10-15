// Network and Contract Configurations for EtherCanvas

export const SEPOLIA_CHAIN_ID = 11155111;
export const SEPOLIA_CHAIN_ID_HEX = "0xaa36a7";

export const SEPOLIA_CONFIG = {
  chainId: SEPOLIA_CHAIN_ID_HEX,
  chainName: "Ethereum Sepolia",
  nativeCurrency: {
    name: "Sepolia Ether",
    symbol: "SEP",
    decimals: 18,
  },
  rpcUrls: [
    "https://ethereum-sepolia-rpc.publicnode.com",
    "https://rpc.sepolia.org",
    "https://1rpc.io/sepolia",
  ],
  blockExplorerUrls: ["https://sepolia.etherscan.io"],
};

// Chainlink ETH/USD Sepolia Feed
// Reference: https://docs.chain.link/data-feeds/price-feeds/addresses?network=ethereum&page=1
export const CHAINLINK_ETH_USD_SEPOLIA_ADDRESS =
  "0x694AA1769357215DE4FAC081bf1f309aDC325306";

export const CHAINLINK_AGGREGATOR_V3_ABI = [
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "description",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "version",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "latestRoundData",
    outputs: [
      { internalType: "uint80", name: "roundId", type: "uint80" },
      { internalType: "int256", name: "answer", type: "int256" },
      { internalType: "uint256", name: "startedAt", type: "uint256" },
      { internalType: "uint256", name: "updatedAt", type: "uint256" },
      { internalType: "uint80", name: "answeredInRound", type: "uint80" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

import { ethers } from "ethers";
import deployedAddressData from "./deployedAddress.json";
import EtherCanvasNFTArtifact from "./EtherCanvasNFT.json";

// Contract ABI export
export const ETHERCANVAS_NFT_ABI = EtherCanvasNFTArtifact.abi;

/**
 * Resolves the default deployed EtherCanvasNFT contract address.
 * Priority:
 * 1. Environment variable VITE_NFT_CONTRACT_ADDRESS (if set and valid Ethereum address)
 * 2. deployedAddress.json (if present, on Sepolia chainId 11155111, and valid Ethereum address)
 * Requirement: Do not silently fall back to local Hardhat addresses on Sepolia.
 */
export function resolveDefaultNftContractAddress(): string {
  // 1. Check environment variable VITE_NFT_CONTRACT_ADDRESS
  const envAddr = import.meta.env.VITE_NFT_CONTRACT_ADDRESS;
  if (envAddr && typeof envAddr === "string" && ethers.isAddress(envAddr.trim())) {
    return envAddr.trim();
  }

  // 2. Check deployedAddress.json as fallback
  if (deployedAddressData && typeof deployedAddressData === "object") {
    const data = deployedAddressData as {
      network?: string;
      chainId?: string | number;
      address?: string;
    };

    const isSepolia =
      String(data.chainId) === "11155111" ||
      String(data.network).toLowerCase() === "sepolia";

    // Strictly ensure we do NOT fall back to local Hardhat addresses on Sepolia
    const isLocal =
      String(data.chainId) === "31337" ||
      String(data.network).toLowerCase() === "localhost" ||
      String(data.network).toLowerCase() === "hardhat";

    if (isSepolia && !isLocal && data.address && ethers.isAddress(data.address.trim())) {
      return data.address.trim();
    }
  }

  return "";
}

// Default contract address from env or deployed address
export const DEFAULT_NFT_CONTRACT_ADDRESS = resolveDefaultNftContractAddress();

// Public Ethereum Mainnet RPCs for ENS resolution (works without wallet connection)
export const MAINNET_RPC_URLS = [
  "https://eth.llamarpc.com",
  "https://cloudflare-eth.com",
  "https://ethereum.publicnode.com",
];

// IPFS Gateway helper
export const formatIpfsUrl = (ipfsUri: string): string => {
  if (!ipfsUri) return "";
  if (ipfsUri.startsWith("ipfs://")) {
    const cidAndPath = ipfsUri.replace("ipfs://", "");
    return `https://gateway.pinata.cloud/ipfs/${cidAndPath}`;
  }
  return ipfsUri;
};

// Fallback IPFS URLs
export const getIpfsFallbacks = (ipfsUri: string): string[] => {
  if (!ipfsUri || !ipfsUri.startsWith("ipfs://")) return [ipfsUri];
  const cidAndPath = ipfsUri.replace("ipfs://", "");
  return [
    `https://gateway.pinata.cloud/ipfs/${cidAndPath}`,
    `https://ipfs.io/ipfs/${cidAndPath}`,
    `https://cloudflare-ipfs.com/ipfs/${cidAndPath}`,
    `https://dweb.link/ipfs/${cidAndPath}`,
  ];
};
