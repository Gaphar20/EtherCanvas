/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NFT_CONTRACT_ADDRESS?: string;
  readonly VITE_CHAINLINK_ETH_USD_ADDRESS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
