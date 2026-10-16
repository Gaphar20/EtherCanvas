import React, { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import confetti from "canvas-confetti";
import {
  Layers,
  Sparkles,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Loader2,
  RefreshCw,
  Info,
  Wallet,
  ArrowRight,
  Upload,
  Coins,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import {
  resolveSmartAccountAddress,
  getSmartAccountBalance,
  executeSmartAccountBatchMint,
  buildBatchCallPreviews,
} from "@/utils/pimlico";
import {
  BatchMintItemConfig,
  BatchMintStatus,
  UserOpExecutionResult,
} from "@/types";
import { formatIpfsUrl } from "@/contracts/addresses";

interface SmartAccountBatchMintProps {
  contractAddress: string;
  onOpenSettings: () => void;
  onNavigateToExplore: () => void;
}

export const SmartAccountBatchMint: React.FC<SmartAccountBatchMintProps> = ({
  contractAddress,
  onOpenSettings,
  onNavigateToExplore,
}) => {
  const {
    address,
    isSepolia,
    connectWallet,
    switchToSepolia,
    isConnecting,
    hasProvider,
  } = useWallet();

  // Smart Account state
  const [smartAccountAddress, setSmartAccountAddress] = useState<string | null>(null);
  const [smartAccountBalance, setSmartAccountBalance] = useState<string>("0.0000");
  const [isLoadingAccount, setIsLoadingAccount] = useState<boolean>(false);
  const [sponsorGas, setSponsorGas] = useState<boolean>(true);

  // Form states for NFT 1 and NFT 2
  const [nft1, setNft1] = useState<BatchMintItemConfig>({
    name: "EtherCanvas Minimal #1 — Sunrise",
    description: "Algorithmic minimalist generative canvas created via Pimlico Account Abstraction.",
    recipient: "",
    imagePreview: null,
    imageFile: null,
    metadataUri: null,
    attributes: [
      { trait_type: "Batch", value: "Pimlico ERC-4337" },
      { trait_type: "Slot", value: "1 of 2" },
      { trait_type: "Palette", value: "Solar Flare" },
    ],
  });

  const [nft2, setNft2] = useState<BatchMintItemConfig>({
    name: "EtherCanvas Minimal #2 — Twilight",
    description: "Algorithmic minimalist generative canvas created via Pimlico Account Abstraction.",
    recipient: "",
    imagePreview: null,
    imageFile: null,
    metadataUri: null,
    attributes: [
      { trait_type: "Batch", value: "Pimlico ERC-4337" },
      { trait_type: "Slot", value: "2 of 2" },
      { trait_type: "Palette", value: "Celestial Indigo" },
    ],
  });

  // Flow & execution state
  const [status, setStatus] = useState<BatchMintStatus>("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userOpResult, setUserOpResult] = useState<UserOpExecutionResult | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showCalldataPreview, setShowCalldataPreview] = useState<boolean>(false);

  const fileInputRef1 = useRef<HTMLInputElement | null>(null);
  const fileInputRef2 = useRef<HTMLInputElement | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Helper to generate a generative procedural canvas art
  const generateProceduralArt = (slot: 1 | 2) => {
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 600;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (slot === 1) {
      // Warm sunrise gradient
      const grad = ctx.createLinearGradient(0, 0, 600, 600);
      grad.addColorStop(0, "#FFF1F2");
      grad.addColorStop(0.5, "#FFE4E6");
      grad.addColorStop(1, "#FECDD3");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 600, 600);

      // Geometric circular arcs
      for (let i = 0; i < 12; i++) {
        ctx.save();
        ctx.translate(300, 300);
        ctx.rotate((Math.PI / 6) * i);
        ctx.beginPath();
        ctx.arc(0, 0, 80 + i * 16, 0, Math.PI * 1.2);
        ctx.strokeStyle = `hsla(${350 + i * 4}, 80%, 60%, 0.45)`;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      }

      // Center disc
      ctx.beginPath();
      ctx.arc(300, 300, 48, 0, Math.PI * 2);
      ctx.fillStyle = "#E84B55";
      ctx.fill();
    } else {
      // Celestial violet/indigo gradient
      const grad = ctx.createLinearGradient(0, 0, 600, 600);
      grad.addColorStop(0, "#EEF2FF");
      grad.addColorStop(0.5, "#E0E7FF");
      grad.addColorStop(1, "#C7D2FE");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 600, 600);

      // Minimal celestial orbits
      for (let i = 0; i < 14; i++) {
        ctx.save();
        ctx.translate(300, 300);
        ctx.rotate((Math.PI / 7) * i);
        ctx.beginPath();
        ctx.ellipse(0, 0, 180, 70 + i * 12, (Math.PI / 4) * i, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${245 + i * 6}, 75%, 62%, 0.35)`;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
      }

      // Center sphere
      ctx.beginPath();
      ctx.arc(300, 300, 44, 0, Math.PI * 2);
      ctx.fillStyle = "#4F46E5";
      ctx.fill();
    }

    const dataUrl = canvas.toDataURL("image/png");
    if (slot === 1) {
      setNft1((prev) => ({ ...prev, imagePreview: dataUrl, imageFile: null }));
    } else {
      setNft2((prev) => ({ ...prev, imagePreview: dataUrl, imageFile: null }));
    }
  };

  // Generate initial procedural artwork for both slots on mount
  useEffect(() => {
    if (!nft1.imagePreview) generateProceduralArt(1);
    if (!nft2.imagePreview) generateProceduralArt(2);
  }, []);

  // Resolve Smart Account whenever connected wallet changes
  useEffect(() => {
    let isCancelled = false;

    async function loadAccount() {
      if (!address || !isSepolia) {
        setSmartAccountAddress(null);
        setSmartAccountBalance("0.0000");
        return;
      }

      setIsLoadingAccount(true);
      try {
        const provider = (window as any).ethereum;
        if (!provider) return;

        const saAddr = await resolveSmartAccountAddress(address, provider);
        if (isCancelled) return;

        setSmartAccountAddress(saAddr);

        // Set default recipients to smart account address or connected EOA
        setNft1((prev) => ({
          ...prev,
          recipient: prev.recipient || saAddr,
        }));
        setNft2((prev) => ({
          ...prev,
          recipient: prev.recipient || saAddr,
        }));

        const { balanceEth } = await getSmartAccountBalance(saAddr);
        if (isCancelled) return;
        setSmartAccountBalance(balanceEth);
      } catch (err) {
        console.warn("Error resolving smart account address:", err);
      } finally {
        if (!isCancelled) setIsLoadingAccount(false);
      }
    }

    loadAccount();

    return () => {
      isCancelled = true;
    };
  }, [address, isSepolia]);

  // Upload artwork and metadata to IPFS via /api/upload
  const uploadItemToIpfs = async (
    item: BatchMintItemConfig,
    slotNumber: number
  ): Promise<string> => {
    if (item.metadataUri && item.metadataUri.startsWith("ipfs://")) {
      return item.metadataUri;
    }

    setStatusMessage(`Uploading NFT #${slotNumber} artwork and metadata to IPFS...`);

    const formData = new FormData();
    if (item.imageFile) {
      formData.append("file", item.imageFile);
    } else if (item.imagePreview) {
      const res = await fetch(item.imagePreview);
      const blob = await res.blob();
      formData.append("file", blob, `batch-nft-${slotNumber}.png`);
    } else {
      throw new Error(`Artwork for NFT #${slotNumber} is required.`);
    }

    formData.append("name", item.name.trim() || `EtherCanvas Batch #${slotNumber}`);
    formData.append("description", item.description.trim());
    formData.append("attributes", JSON.stringify(item.attributes));

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(
        errJson.error || `IPFS upload failed for NFT #${slotNumber} with status ${response.status}`
      );
    }

    const data = await response.json();
    return data.metadataUri;
  };

  // Main submission handler: Submits 1 UserOperation with 2 calls
  const handleBatchMint = async () => {
    setErrorMessage(null);
    setUserOpResult(null);

    if (!address) {
      setErrorMessage("Please connect your MetaMask wallet first.");
      return;
    }

    if (!isSepolia) {
      setErrorMessage("Please switch your network to Ethereum Sepolia (Chain ID 11155111).");
      return;
    }

    if (!contractAddress || !ethers.isAddress(contractAddress)) {
      setErrorMessage("Please configure a valid deployed EtherCanvas contract address in Settings.");
      return;
    }

    const recipient1 = (nft1.recipient.trim() || smartAccountAddress || address).toLowerCase();
    const recipient2 = (nft2.recipient.trim() || smartAccountAddress || address).toLowerCase();

    if (!ethers.isAddress(recipient1)) {
      setErrorMessage("Recipient address for NFT #1 is not a valid Ethereum address.");
      return;
    }
    if (!ethers.isAddress(recipient2)) {
      setErrorMessage("Recipient address for NFT #2 is not a valid Ethereum address.");
      return;
    }

    try {
      // Step 1: Upload both NFTs to IPFS
      setStatus("uploading_ipfs");
      const uri1 = await uploadItemToIpfs(nft1, 1);
      setNft1((prev) => ({ ...prev, metadataUri: uri1 }));

      const uri2 = await uploadItemToIpfs(nft2, 2);
      setNft2((prev) => ({ ...prev, metadataUri: uri2 }));

      // Step 2: Prepare & execute single UserOperation with 2 calls
      setStatus("connecting_smart_account");
      const provider = (window as any).ethereum;

      const result = await executeSmartAccountBatchMint({
        ownerAddress: address,
        provider,
        contractAddress,
        firstMint: {
          recipient: recipient1,
          tokenUri: uri1,
        },
        secondMint: {
          recipient: recipient2,
          tokenUri: uri2,
        },
        sponsor: sponsorGas,
        onStatusUpdate: (msg) => {
          setStatusMessage(msg);
          if (msg.includes("approve") || msg.includes("wallet")) {
            setStatus("awaiting_signature");
          } else if (msg.includes("Waiting for bundler") || msg.includes("submitted")) {
            setStatus("confirming_userop");
          }
        },
      });

      setUserOpResult(result);
      setStatus("success");
      setStatusMessage("Batch UserOperation executed successfully on Sepolia!");

      // Fire celebratory confetti!
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#E84B55", "#4F46E5", "#10B981", "#F59E0B"],
      });

      // Refresh smart account balance
      if (smartAccountAddress) {
        getSmartAccountBalance(smartAccountAddress).then((b) =>
          setSmartAccountBalance(b.balanceEth)
        );
      }
    } catch (err: any) {
      console.error("Batch mint failure:", err);
      setStatus("error");
      setErrorMessage(err.message || "Failed to execute batched UserOperation.");
    }
  };

  const previewCalls = buildBatchCallPreviews(
    contractAddress,
    nft1.recipient.trim() || smartAccountAddress || address || "",
    nft1.metadataUri || "ipfs://... (generated upon submission)",
    nft2.recipient.trim() || smartAccountAddress || address || "",
    nft2.metadataUri || "ipfs://... (generated upon submission)"
  );

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EAEAEA] shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#E84B55]/10 via-[#4F46E5]/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAFAF8] border border-[#EAEAEA] text-xs font-mono text-[#737373]">
              <Layers className="w-3.5 h-3.5 text-[#E84B55]" />
              <span>ERC-4337 Account Abstraction • Sepolia</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#171717]">
              Smart Account Batch Mint
            </h1>
            <p className="text-sm text-[#737373] max-w-2xl leading-relaxed">
              Mint two distinct NFTs in <strong>one single atomic UserOperation</strong> powered by Pimlico and SimpleAccount.
              Zero private keys stored. Sign once with your connected wallet.
            </p>
          </div>

          {/* Quick Stats or Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <button
              onClick={onOpenSettings}
              className="text-xs font-mono text-[#737373] hover:text-[#171717] px-3 py-2 rounded-xl border border-[#EAEAEA] hover:border-[#D4D4D4] transition-colors bg-[#FAFAF8]"
            >
              Contract: {contractAddress ? `${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}` : "Not set"}
            </button>
          </div>
        </div>
      </div>

      {/* Smart Account Status & Gas Sponsorship Config Card */}
      <div className="bg-white rounded-3xl p-6 border border-[#EAEAEA] shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAEAEA] pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FAFAF8] border border-[#EAEAEA] flex items-center justify-center text-[#171717]">
              <ShieldCheck className="w-5 h-5 text-[#E84B55]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#171717]">
                Your Counterfactual Smart Account (SimpleAccount)
              </h2>
              <p className="text-xs text-[#737373]">
                EntryPoint v0.7 • Owner: {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Not Connected"}
              </p>
            </div>
          </div>

          {/* Smart Account Address and Balance Badges */}
          {smartAccountAddress ? (
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAFAF8] border border-[#EAEAEA]">
                <span className="text-[#737373]">Smart Account:</span>
                <span className="font-semibold text-[#171717]">
                  {smartAccountAddress.slice(0, 6)}...{smartAccountAddress.slice(-4)}
                </span>
                <button
                  onClick={() => copyToClipboard(smartAccountAddress, "sa-addr")}
                  className="hover:text-[#E84B55] transition-colors ml-1"
                  title="Copy Smart Account Address"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <a
                  href={`https://sepolia.etherscan.io/address/${smartAccountAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#E84B55] transition-colors ml-0.5"
                  title="View on Etherscan"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAFAF8] border border-[#EAEAEA]">
                <Coins className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[#737373]">Balance:</span>
                <span className="font-semibold text-[#171717]">{smartAccountBalance} SEP</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-[#737373] italic">
              {isLoadingAccount ? "Calculating counterfactual address..." : "Connect wallet to compute smart account"}
            </div>
          )}
        </div>

        {/* Sponsorship Mode Selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Option 1: Pimlico Paymaster */}
          <div
            onClick={() => setSponsorGas(true)}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              sponsorGas
                ? "border-[#E84B55] bg-[#E84B55]/5 ring-1 ring-[#E84B55]"
                : "border-[#EAEAEA] bg-[#FAFAF8] hover:border-[#D4D4D4]"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    sponsorGas ? "bg-[#E84B55] text-white" : "bg-white text-[#737373] border border-[#EAEAEA]"
                  }`}
                >
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#171717] flex items-center gap-1.5">
                    <span>Pimlico Paymaster Sponsorship</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-100 text-emerald-800">
                      Gasless
                    </span>
                  </div>
                  <p className="text-[11px] text-[#737373] mt-0.5">
                    Gas fee is sponsored via Pimlico's Sepolia Paymaster. Zero ETH required in your smart account.
                  </p>
                </div>
              </div>
              <input
                type="radio"
                checked={sponsorGas}
                onChange={() => setSponsorGas(true)}
                className="accent-[#E84B55] mt-1"
              />
            </div>
          </div>

          {/* Option 2: Self-Funded */}
          <div
            onClick={() => setSponsorGas(false)}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              !sponsorGas
                ? "border-[#171717] bg-[#171717]/5 ring-1 ring-[#171717]"
                : "border-[#EAEAEA] bg-[#FAFAF8] hover:border-[#D4D4D4]"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    !sponsorGas ? "bg-[#171717] text-white" : "bg-white text-[#737373] border border-[#EAEAEA]"
                  }`}
                >
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#171717] flex items-center gap-1.5">
                    <span>Self-Funded Smart Account</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-neutral-200 text-neutral-800">
                      Native ETH
                    </span>
                  </div>
                  <p className="text-[11px] text-[#737373] mt-0.5">
                    Smart Account pays its own gas prefund from its Sepolia ETH balance ({smartAccountBalance} SEP).
                  </p>
                </div>
              </div>
              <input
                type="radio"
                checked={!sponsorGas}
                onChange={() => setSponsorGas(false)}
                className="accent-[#171717] mt-1"
              />
            </div>
          </div>
        </div>

        {/* Warning if self-funded with 0 balance */}
        {!sponsorGas && parseFloat(smartAccountBalance) <= 0 && smartAccountAddress && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold">Smart Account has 0.0000 SEP balance:</span>
              <p className="text-[11px] text-amber-700">
                In self-funded mode, you must deposit Sepolia ETH into your Smart Account (
                <code className="font-mono">{smartAccountAddress}</code>) to pay the gas prefund. Alternatively, select
                <strong> Pimlico Paymaster Sponsorship</strong> for gasless execution.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Two NFT Config Cards in the Batch */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* NFT #1 Card */}
        <div className="bg-white rounded-3xl p-6 border border-[#EAEAEA] shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#E84B55] text-white flex items-center justify-center font-mono text-xs font-bold">
                  1
                </span>
                <h3 className="text-sm font-bold text-[#171717]">First Batch NFT</h3>
              </div>
              <button
                type="button"
                onClick={() => generateProceduralArt(1)}
                className="inline-flex items-center gap-1.5 text-xs text-[#E84B55] hover:text-[#d33842] font-medium"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Re-generate Art</span>
              </button>
            </div>

            {/* Artwork Preview */}
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden border border-[#EAEAEA] bg-[#FAFAF8] group">
              {nft1.imagePreview ? (
                <img
                  src={nft1.imagePreview}
                  alt="NFT #1 Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-[#737373]">
                  <Upload className="w-8 h-8 mb-2 opacity-50" />
                  <span className="text-xs">No artwork chosen</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-4">
                <button
                  type="button"
                  onClick={() => generateProceduralArt(1)}
                  className="px-3 py-1.5 rounded-xl bg-white text-[#171717] text-xs font-semibold shadow"
                >
                  Regenerate
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef1.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-[#171717] text-white text-xs font-semibold shadow"
                >
                  Upload File
                </button>
              </div>
              <input
                ref={fileInputRef1}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      setNft1((prev) => ({
                        ...prev,
                        imagePreview: event.target?.result as string,
                        imageFile: file,
                      }));
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </div>

            {/* Metadata Fields */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#737373] mb-1">
                  NFT Name
                </label>
                <input
                  type="text"
                  value={nft1.name}
                  onChange={(e) => setNft1({ ...nft1, name: e.target.value })}
                  placeholder="e.g. EtherCanvas Sunrise"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAFAF8] border border-[#EAEAEA] text-xs text-[#171717] focus:outline-none focus:border-[#171717]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#737373] mb-1">
                  Recipient Address
                </label>
                <input
                  type="text"
                  value={nft1.recipient}
                  onChange={(e) => setNft1({ ...nft1, recipient: e.target.value })}
                  placeholder={smartAccountAddress || "0x..."}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAFAF8] border border-[#EAEAEA] text-xs font-mono text-[#171717] focus:outline-none focus:border-[#171717]"
                />
                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => smartAccountAddress && setNft1({ ...nft1, recipient: smartAccountAddress })}
                    className="text-[10px] text-[#737373] hover:text-[#171717] underline"
                  >
                    Set to Smart Account
                  </button>
                  {address && (
                    <button
                      type="button"
                      onClick={() => setNft1({ ...nft1, recipient: address })}
                      className="text-[10px] text-[#737373] hover:text-[#171717] underline"
                    >
                      Set to EOA ({address.slice(0, 6)}...)
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* NFT #2 Card */}
        <div className="bg-white rounded-3xl p-6 border border-[#EAEAEA] shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#4F46E5] text-white flex items-center justify-center font-mono text-xs font-bold">
                  2
                </span>
                <h3 className="text-sm font-bold text-[#171717]">Second Batch NFT</h3>
              </div>
              <button
                type="button"
                onClick={() => generateProceduralArt(2)}
                className="inline-flex items-center gap-1.5 text-xs text-[#4F46E5] hover:text-[#3730a3] font-medium"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Re-generate Art</span>
              </button>
            </div>

            {/* Artwork Preview */}
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden border border-[#EAEAEA] bg-[#FAFAF8] group">
              {nft2.imagePreview ? (
                <img
                  src={nft2.imagePreview}
                  alt="NFT #2 Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-[#737373]">
                  <Upload className="w-8 h-8 mb-2 opacity-50" />
                  <span className="text-xs">No artwork chosen</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-4">
                <button
                  type="button"
                  onClick={() => generateProceduralArt(2)}
                  className="px-3 py-1.5 rounded-xl bg-white text-[#171717] text-xs font-semibold shadow"
                >
                  Regenerate
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef2.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-[#171717] text-white text-xs font-semibold shadow"
                >
                  Upload File
                </button>
              </div>
              <input
                ref={fileInputRef2}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      setNft2((prev) => ({
                        ...prev,
                        imagePreview: event.target?.result as string,
                        imageFile: file,
                      }));
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </div>

            {/* Metadata Fields */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#737373] mb-1">
                  NFT Name
                </label>
                <input
                  type="text"
                  value={nft2.name}
                  onChange={(e) => setNft2({ ...nft2, name: e.target.value })}
                  placeholder="e.g. EtherCanvas Twilight"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAFAF8] border border-[#EAEAEA] text-xs text-[#171717] focus:outline-none focus:border-[#171717]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#737373] mb-1">
                  Recipient Address
                </label>
                <input
                  type="text"
                  value={nft2.recipient}
                  onChange={(e) => setNft2({ ...nft2, recipient: e.target.value })}
                  placeholder={smartAccountAddress || "0x..."}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAFAF8] border border-[#EAEAEA] text-xs font-mono text-[#171717] focus:outline-none focus:border-[#171717]"
                />
                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => smartAccountAddress && setNft2({ ...nft2, recipient: smartAccountAddress })}
                    className="text-[10px] text-[#737373] hover:text-[#171717] underline"
                  >
                    Set to Smart Account
                  </button>
                  {address && (
                    <button
                      type="button"
                      onClick={() => setNft2({ ...nft2, recipient: address })}
                      className="text-[10px] text-[#737373] hover:text-[#171717] underline"
                    >
                      Set to EOA ({address.slice(0, 6)}...)
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Batch UserOperation Execution Summary Box */}
      <div className="bg-white rounded-3xl p-6 border border-[#EAEAEA] shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#171717] text-white flex items-center justify-center font-bold text-xs">
              2x
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#171717]">
                Batched UserOperation Specification (Single Transaction)
              </h3>
              <p className="text-xs text-[#737373]">
                Both mint function invocations are submitted atomically within 1 UserOperation
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowCalldataPreview(!showCalldataPreview)}
            className="text-xs text-[#737373] hover:text-[#171717] flex items-center gap-1 font-mono"
          >
            <span>{showCalldataPreview ? "Hide Calldata" : "Inspect Calls"}</span>
            {showCalldataPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Detailed Call Inspection (Collapsible) */}
        {showCalldataPreview && (
          <div className="space-y-3 font-mono text-xs">
            {previewCalls.map((call) => (
              <div key={call.callIndex} className="p-4 rounded-2xl bg-[#FAFAF8] border border-[#EAEAEA] space-y-1.5">
                <div className="flex items-center justify-between text-[#171717] font-semibold">
                  <span>Call #{call.callIndex}: EtherCanvasNFT.mint(to, uri)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-white border border-[#EAEAEA]">
                    Target: {call.targetContract.slice(0, 6)}...{call.targetContract.slice(-4)}
                  </span>
                </div>
                <div className="text-[11px] text-[#737373] space-y-0.5">
                  <div>
                    <span className="text-[#171717]">Recipient:</span> {call.recipient || "(empty)"}
                  </div>
                  <div>
                    <span className="text-[#171717]">URI:</span> {call.tokenUri}
                  </div>
                  <div className="truncate">
                    <span className="text-[#171717]">Encoded Data:</span> {call.callData}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Status Message / Progress */}
        {status !== "idle" && (
          <div
            className={`p-4 rounded-2xl border text-xs flex items-center gap-3 ${
              status === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : status === "error"
                ? "bg-red-50 border-red-200 text-red-800"
                : "bg-blue-50 border-blue-200 text-blue-800"
            }`}
          >
            {status === "uploading_ipfs" ||
            status === "connecting_smart_account" ||
            status === "awaiting_signature" ||
            status === "confirming_userop" ? (
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            ) : status === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <div className="flex-1 font-medium">{statusMessage || errorMessage}</div>
          </div>
        )}

        {/* Action Button */}
        {!address ? (
          <button
            onClick={connectWallet}
            disabled={isConnecting}
            className="w-full py-4 rounded-2xl bg-[#171717] hover:bg-[#262626] text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Wallet className="w-4 h-4" />
            <span>{isConnecting ? "Connecting MetaMask..." : "Connect Wallet to Batch Mint"}</span>
          </button>
        ) : !isSepolia ? (
          <button
            onClick={switchToSepolia}
            className="w-full py-4 rounded-2xl bg-[#E84B55] hover:bg-[#d33842] text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <span>Switch Wallet to Ethereum Sepolia</span>
          </button>
        ) : (
          <button
            onClick={handleBatchMint}
            disabled={status !== "idle" && status !== "success" && status !== "error"}
            className="w-full py-4 rounded-2xl bg-[#171717] hover:bg-[#262626] disabled:bg-[#D4D4D4] text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            {status === "uploading_ipfs" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading Both Artworks to IPFS...</span>
              </>
            ) : status === "awaiting_signature" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Awaiting Wallet Signature for UserOp...</span>
              </>
            ) : status === "confirming_userop" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Bundling UserOp on Sepolia...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-[#E84B55]" />
                <span>
                  Submit 1 UserOperation (Batch 2 Mints • {sponsorGas ? "Gas Sponsored" : "Self-Funded"})
                </span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Success Receipt Details Modal / Card */}
      {userOpResult && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-200 shadow-sm space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#171717]">
                  Batched UserOperation Successfully Executed!
                </h3>
                <p className="text-xs text-[#737373]">
                  Both NFTs were minted on Ethereum Sepolia in a single transaction.
                </p>
              </div>
            </div>

            <button
              onClick={onNavigateToExplore}
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-[#FAFAF8] border border-[#EAEAEA] hover:border-[#171717] transition-colors"
            >
              View in Gallery &rarr;
            </button>
          </div>

          {/* Minted Token Badges */}
          {userOpResult.tokenIds.length > 0 && (
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-emerald-900">
                  Confirmed Minted Tokens:
                </span>
                <div className="flex items-center gap-2">
                  {userOpResult.tokenIds.map((id) => (
                    <span
                      key={id}
                      className="px-3 py-1 rounded-xl bg-white border border-emerald-200 text-emerald-800 font-mono text-xs font-bold"
                    >
                      Token #{id}
                    </span>
                  ))}
                </div>
              </div>
              <span className="text-xs text-emerald-800">
                Mode: {userOpResult.sponsored ? "Pimlico Paymaster Sponsored (Gasless)" : "Self-Funded"}
              </span>
            </div>
          )}

          {/* UserOp & Tx Details Table */}
          <div className="space-y-3 text-xs font-mono">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-[#FAFAF8] border border-[#EAEAEA] gap-2">
              <span className="text-[#737373]">UserOperation Hash:</span>
              <div className="flex items-center gap-2">
                <span className="text-[#171717] font-semibold break-all">
                  {userOpResult.userOpHash}
                </span>
                <button
                  onClick={() => copyToClipboard(userOpResult.userOpHash, "uop")}
                  className="hover:text-[#E84B55] transition-colors"
                  title="Copy UserOp Hash"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {userOpResult.transactionHash && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-[#FAFAF8] border border-[#EAEAEA] gap-2">
                <span className="text-[#737373]">On-Chain Transaction Hash:</span>
                <div className="flex items-center gap-2">
                  <a
                    href={userOpResult.etherscanTxUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#E84B55] hover:underline font-semibold break-all flex items-center gap-1"
                  >
                    <span>{userOpResult.transactionHash}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => copyToClipboard(userOpResult.transactionHash!, "tx")}
                    className="hover:text-[#E84B55] transition-colors"
                    title="Copy Tx Hash"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-[#FAFAF8] border border-[#EAEAEA]">
                <div className="text-[#737373] text-[11px]">Block Number</div>
                <div className="text-[#171717] font-semibold mt-0.5">
                  {userOpResult.blockNumber ?? "Pending"}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#FAFAF8] border border-[#EAEAEA]">
                <div className="text-[#737373] text-[11px]">Gas Used</div>
                <div className="text-[#171717] font-semibold mt-0.5">
                  {userOpResult.actualGasUsed ? `${parseInt(userOpResult.actualGasUsed).toLocaleString()} gas` : "Sponsored"}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#FAFAF8] border border-[#EAEAEA]">
                <div className="text-[#737373] text-[11px]">Sponsorship</div>
                <div className="text-emerald-700 font-semibold mt-0.5">
                  {userOpResult.sponsored ? "Pimlico Paymaster (0 ETH Paid)" : `${userOpResult.actualGasCostSep || "Self-Funded"} SEP`}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
