# EtherCanvas 🎨✨
> **Premium Web3 NFT Studio & On-Chain Gallery on Ethereum Sepolia**

EtherCanvas is a production-grade Web3 dApp engineered for artists, collectors, and mentors. It provides end-to-end functionality including client-side procedural art generation, secure serverless Pinata IPFS uploads, ERC-721 sequential minting, real-time Chainlink ETH/USD Sepolia price feeds, and ENS (Ethereum Name Service) resolution.

---

## 🌟 Key Features

1. **Dark Violet NFT Studio**:
   - Sleek glassmorphic UI with vibrant violet/indigo glowing accents and mobile-first responsiveness.
   - Built-in **Procedural Canvas Art Generator** allowing instant algorithmic art creation directly in the browser with zero external files needed.
   - Dynamic ERC-721 metadata and attributes builder (traits, rarity, descriptions).
   - Confetti micro-animations on confirmed block minting.

2. **Secure Server-Side Pinata IPFS Pipeline**:
   - High-resolution artwork is pinned to Pinata IPFS via `/api/upload`.
   - ERC-721 compliant JSON metadata is generated and pinned, returning an immutable `ipfs://` URI to the client.
   - **Zero Credential Leakage**: The `PINATA_JWT` is kept strictly server-side and is never exposed in browser bundles.

3. **OpenZeppelin ERC-721 Smart Contract (`EtherCanvasNFT.sol`)**:
   - Sequential token IDs starting at `1`.
   - On-chain storage of token URIs (`ERC721URIStorage`).
   - Custom `Minted(address indexed to, uint256 indexed tokenId, string uri)` event emitted on every mint.
   - Comprehensive automated unit tests with Hardhat, Ethers v6, and Chai.

4. **Chainlink Sepolia ETH/USD Price Oracle**:
   - Reads directly from Chainlink's official Sepolia aggregator at `0x694AA1769357215DE4FAC081bf1f309aDC325306`.
   - Displays live USD price, 8-decimal conversion, and round information.
   - Shows live update age (e.g. "Updated 42s ago") and automated stale-data warning badges.
   - 15-second automatic refresh timer with clean component unmount teardown.

5. **ENS Decentralized Identity Explorer**:
   - Forward resolution: `.eth` name $\rightarrow$ `0x` address, on-chain avatar, and social text records (Twitter, GitHub, Website, Email).
   - Reverse resolution: `0x` address $\rightarrow$ Primary `.eth` name.
   - **Zero-Wallet Requirement**: Powered by public Ethereum JSON-RPC providers, allowing mentors or visitors to resolve ENS domains without connecting MetaMask.

6. **Real On-Chain Gallery**:
   - Indexes verified `Minted` events and queries `tokenURI` and `ownerOf` directly on Ethereum Sepolia.
   - Fetches and parses real IPFS metadata with multi-gateway fallbacks (`gateway.pinata.cloud`, `ipfs.io`, `cloudflare-ipfs.com`).
   - Displays actual token IDs, owners, creator ENS names, and direct Etherscan links.
   - Strictly honest: **never fabricates fake NFTs or simulated transactions**.

---

## 🔒 Security: Why Pinata Credentials Must Stay Server-Side

> **Pinata JWTs and API secret keys grant administrative write and unpinning permissions over your entire IPFS cloud account.**
> If credentials are included in client-side code or prefixed with `VITE_`, any visitor can extract them from the browser bundle or DevTools network tab. Malicious actors could exhaust your storage and bandwidth quotas, delete pinned assets, or pin abusive content under your account identity. Routing uploads through a dedicated serverless route (`/api/upload`) keeps credentials protected in a secure environment while allowing request validation before contacting the Pinata API.

---

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Canvas Confetti
- **Web3 Interaction**: Ethers.js v6, MetaMask (EIP-1193)
- **Smart Contracts**: Solidity `^0.8.24` (Cancun EVM target), OpenZeppelin Contracts v5
- **Testing & Deployment**: Hardhat, `@nomicfoundation/hardhat-toolbox`, Chai
- **Storage**: Pinata IPFS (Serverless route + multi-gateway fallback)
- **Decentralized Services**: Chainlink Data Feeds (Sepolia), Ethereum Name Service (ENS)
- **Hosting**: Vercel (Frontend SPA + Serverless API functions)

---

## 📂 Project Architecture

```
EtherCanvas/
├── api/
│   └── upload.ts                 # Vercel Serverless Function for secure Pinata pinning
├── contracts/
│   └── EtherCanvasNFT.sol        # ERC-721 URIStorage contract with sequential IDs & Minted event
├── test/
│   └── EtherCanvasNFT.test.cjs   # Hardhat automated test suite (9 passing tests)
├── scripts/
│   └── deploy.cjs                # Hardhat deployment script for Sepolia
├── src/
│   ├── App.tsx                   # Main application layout and tab navigation
│   ├── main.tsx                  # React entry point
│   ├── index.css                 # Custom glassmorphic styling and glow animations
│   ├── components/
│   │   ├── Navbar.tsx            # Navigation, MetaMask connector, live price ticker
│   │   ├── MintStudio.tsx        # Image upload/procedural generator, IPFS pinning, minting
│   │   ├── Gallery.tsx           # Real on-chain gallery reading contract events & IPFS
│   │   ├── EnsLookup.tsx         # ENS search without wallet connection
│   │   ├── PriceFeedCard.tsx     # Chainlink ETH/USD oracle display with stale warnings
│   │   └── ContractSettingsModal.tsx # Dynamic contract address and ABI viewer
│   ├── contracts/
│   │   ├── addresses.ts          # Network configurations, Chainlink ABI, and gateway formatters
│   │   └── EtherCanvasNFT.json   # Exported contract ABI
│   └── hooks/
│       ├── useWallet.ts          # MetaMask connect, Sepolia switch, balance & ENS lookup
│       └── useChainlinkPrice.ts  # Chainlink AggregatorV3 reader with 15s timer cleanup
├── hardhat.config.cjs            # Hardhat configuration (Solidity 0.8.24, Cancun EVM)
├── vite.config.ts                # Vite config + local dev middleware for /api/upload
├── vercel.json                   # Vercel routing configuration for SPA & /api serverless functions
├── .env.example                  # Safe template for environment variables
└── .gitignore                    # Prevents secrets and artifacts from being tracked
```

---

## 🚀 Quickstart & Local Setup

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher
- **MetaMask**: Browser extension configured with Ethereum Sepolia testnet

### 2. Installation
Clone the repository and install all dependencies:
```bash
git clone <YOUR_REPOSITORY_URL>
cd EtherCanvas
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to create your local `.env`:
```bash
cp .env.example .env
```

Open `.env` and fill in your values:
```env
# Hardhat deployment on Sepolia
SEPOLIA_RPC_URL="https://ethereum-sepolia-rpc.publicnode.com"
PRIVATE_KEY="YOUR_SEPOLIA_WALLET_PRIVATE_KEY"
ETHERSCAN_API_KEY="YOUR_ETHERSCAN_API_KEY"

# Pinata IPFS (Server-side only)
PINATA_JWT="YOUR_PINATA_SCOPED_JWT_KEY"

# Frontend Contract Address (Populated after deployment)
VITE_NFT_CONTRACT_ADDRESS=""
VITE_CHAINLINK_ETH_USD_ADDRESS="0x694AA1769357215DE4FAC081bf1f309aDC325306"
```

### 4. Run Contract Unit Tests
Execute the automated test suite:
```bash
npm run test:contracts
```
Expected output:
```
  EtherCanvasNFT
    Deployment
      ✔ Should deploy with correct name and symbol
      ✔ Should initialize with zero minted tokens and nextTokenId at 1
    Minting
      ✔ Should allow any user to mint an NFT to themselves
      ✔ Should allow minting to a different recipient address
      ✔ Should increment token IDs sequentially for consecutive mints
      ✔ Should emit the Minted event with correct indexed args and URI
      ✔ Should revert if recipient is zero address
      ✔ Should revert if URI is empty
      ✔ Should revert when querying tokenURI for non-existent token

  9 passing (2s)
```

### 5. Start Local Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.
The local dev server includes built-in middleware for `/api/upload` so Pinata IPFS uploads work seamlessly during development!

### 6. Production Bundle Build Check
```bash
npm run build
```

---

## 📜 Smart Contract Deployment Guide (Ethereum Sepolia)

### Step 1: Fund Your Deployer Wallet
Obtain Sepolia testnet ETH from any reliable faucet:
- [Google Cloud Sepolia Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia)
- [Alchemy Sepolia Faucet](https://sepoliafaucet.com)
- [Infura Sepolia Faucet](https://www.infura.io/faucet/sepolia)

### Step 2: Deploy Using Hardhat
Ensure `PRIVATE_KEY` and `SEPOLIA_RPC_URL` are set in `.env`:
```bash
npm run deploy:sepolia
```

The script will:
1. Deploy `EtherCanvasNFT.sol` to Ethereum Sepolia.
2. Output the verified contract address.
3. Automatically export deployment metadata to `src/contracts/deployedAddress.json`.
4. Automatically update the ABI in `src/contracts/EtherCanvasNFT.json`.

### Step 3: Link Address to Frontend
Add the printed contract address to your `.env` file:
```env
VITE_NFT_CONTRACT_ADDRESS="0xYourDeployedContractAddressHere"
```
Or paste the address directly into the application's **Settings Modal** (gear icon in the top right) to view it live immediately.

---

## 🌐 Vercel Deployment Instructions

EtherCanvas is pre-configured with `vercel.json` to deploy both the Vite React SPA and the serverless Pinata upload API seamlessly.

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "feat: initial commit of EtherCanvas NFT Studio"
   git branch -M main
   git remote add origin https://github.com/<YOUR_USERNAME>/EtherCanvas.git
   git push -u origin main
   ```

2. **Import into Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New Project"**.
   - Select your GitHub repository `EtherCanvas`.
   - Vercel will automatically detect `Vite` as the framework.
   - Build Command: `npm run build`
   - Output Directory: `dist`

3. **Configure Environment Variables in Vercel**:
   In the Vercel project settings, add the following environment variables:
   - `PINATA_JWT`: Your Pinata JWT secret (stored server-side in Vercel).
   - `VITE_NFT_CONTRACT_ADDRESS`: Your deployed `EtherCanvasNFT` address.
   - `VITE_CHAINLINK_ETH_USD_ADDRESS`: `0x694AA1769357215DE4FAC081bf1f309aDC325306`

4. **Deploy**:
   - Click **Deploy**. Vercel will build the frontend and deploy `/api/upload` as a Serverless Function.

---

## 📋 Mentor Submission Checklist

- [x] **Smart Contract**: ERC-721 `EtherCanvasNFT.sol` with sequential token IDs, `_setTokenURI`, and `Minted` event.
- [x] **Contract Tests**: 9 comprehensive automated tests passing with Chai & Ethers v6.
- [x] **Pinata IPFS Security**: Server-side `/api/upload` endpoint utilizing server-only `PINATA_JWT`.
- [x] **Chainlink Price Oracle**: Live Sepolia feed integration with 15s refresh, stale warning, and timer cleanup.
- [x] **ENS Search**: Resolves `.eth` names and avatars without requiring wallet connection.
- [x] **MetaMask Wallet**: Connect, account switching, balance polling, and Sepolia auto-switch.
- [x] **On-Chain Gallery**: Real-time reading of on-chain tokens, owners, and IPFS metadata without fabrication.
- [x] **Production Build**: Clean TypeScript compilation (`npm run build`) with zero linting/build errors.
- [x] **Vercel Ready**: `vercel.json` rewrite configuration for SPA routing and serverless API execution.
- [x] **Security Audited**: Safe `.gitignore` and `.env.example` templates; zero credentials committed.
