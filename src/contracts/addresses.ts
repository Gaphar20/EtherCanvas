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

// Default contract address from env or deployed address
export const DEFAULT_NFT_CONTRACT_ADDRESS =
  import.meta.env.VITE_NFT_CONTRACT_ADDRESS || "";

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
