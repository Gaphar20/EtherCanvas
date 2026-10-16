import React, { useState, useRef } from "react";
import { ethers } from "ethers";
import confetti from "canvas-confetti";
import {
  Upload,
  Sparkles,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Plus,
  Trash2,
  Wand2,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Coins,
  AlertTriangle,
  Layers,
} from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import EtherCanvasNFTArtifact from "@/contracts/EtherCanvasNFT.json";
import { formatIpfsUrl } from "@/contracts/addresses";
import { TraitAttribute } from "@/types";

interface MintStudioProps {
  contractAddress: string;
  onMintSuccess: (tokenId: number) => void;
  onOpenSettings: () => void;
}

export const MintStudio: React.FC<MintStudioProps> = ({
  contractAddress,
  onMintSuccess,
  onOpenSettings,
}) => {
  const {
    address,
    isSepolia,
    signer,
    connectWallet,
    switchToSepolia,
    isConnecting,
    error: walletError,
    hasProvider,
    clearError: clearWalletError,
  } = useWallet();

  // Form states
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [recipient, setRecipient] = useState<string>("");
  const [attributes, setAttributes] = useState<TraitAttribute[]>([
    { trait_type: "Studio", value: "EtherCanvas" },
    { trait_type: "Edition", value: "Minimalist" },
  ]);

  // Minting progression states
  const [status, setStatus] = useState<
    "idle" | "uploading_ipfs" | "awaiting_wallet" | "confirming_tx" | "success" | "error"
  >("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [mintedTokenId, setMintedTokenId] = useState<number | null>(null);
  const [metadataIpfsUri, setMetadataIpfsUri] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Generate Cool Procedural Generative Art (Zero files needed to test)
  const generateProceduralArt = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 600;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clean aesthetic warm/neutral or vibrant generative background
    const bgGrad = ctx.createLinearGradient(0, 0, 600, 600);
    const hues = [350, 10, 220, 260, 45];
    const pickHue = hues[Math.floor(Math.random() * hues.length)];
    bgGrad.addColorStop(0, `hsl(${pickHue}, 85%, 96%)`);
    bgGrad.addColorStop(0.5, `hsl(${pickHue + 25}, 80%, 92%)`);
    bgGrad.addColorStop(1, `hsl(${pickHue - 20}, 75%, 88%)`);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 600, 600);

    // Minimalist geometric forms & celestial curves
    for (let i = 0; i < 16; i++) {
      ctx.save();
      ctx.translate(300, 300);
      ctx.rotate((Math.PI / 8) * i);
      ctx.beginPath();
      ctx.arc(0, 0, 50 + i * 14, 0, Math.PI * 1.4);
      ctx.strokeStyle = `hsla(${pickHue + i * 5}, 70%, 50%, 0.4)`;
      ctx.lineWidth = 2 + Math.random() * 3;
      ctx.stroke();
      ctx.restore();
    }

    // Modern central accent circle
    ctx.beginPath();
    ctx.arc(300, 300, 50, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${pickHue}, 80%, 60%)`;
    ctx.fill();

    const dataUrl = canvas.toDataURL("image/png");
    setImagePreview(dataUrl);

    // Auto-fill creative metadata
    const randomEdition = Math.floor(100 + Math.random() * 900);
    if (!name) setName(`EtherCanvas #${randomEdition}`);
    if (!description) {
      setDescription(
        "A minimalist algorithmic generative piece created in EtherCanvas Studio, pinned immutably to decentralized IPFS."
      );
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage("Image file size must be less than 5MB.");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setImagePreview(uploadEvent.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addTrait = () => {
    setAttributes([...attributes, { trait_type: "", value: "" }]);
  };

  const updateTrait = (index: number, field: "trait_type" | "value", val: string) => {
    const updated = [...attributes];
    updated[index][field] = val;
    setAttributes(updated);
  };

  const removeTrait = (index: number) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  const handleMint = async () => {
    if (!signer || !address) {
      await connectWallet();
      return;
    }

    if (!isSepolia) {
      await switchToSepolia();
      return;
    }

    if (!contractAddress || !ethers.isAddress(contractAddress)) {
      setErrorMessage("Please set a valid deployed EtherCanvasNFT contract address first.");
      onOpenSettings();
      return;
    }

    if (!imagePreview && !imageFile) {
      setErrorMessage("Please upload an artwork image or click 'Procedural Art' to generate one.");
      return;
    }

    if (!name.trim()) {
      setErrorMessage("Artwork Title is required.");
      return;
    }

    const mintTarget = recipient.trim() || address;
    if (!ethers.isAddress(mintTarget)) {
      setErrorMessage("Recipient address is not a valid Ethereum address.");
      return;
    }

    setErrorMessage(null);
    setStatus("uploading_ipfs");
    setStatusMessage("Uploading artwork and metadata to decentralized IPFS via Pinata...");

    try {
      // 1. Upload to IPFS via Serverless Pinata API
      const formData = new FormData();
      if (imageFile) {
        formData.append("file", imageFile);
      } else if (imagePreview) {
        // Convert data URL to Blob
        const response = await fetch(imagePreview);
        const blob = await response.blob();
        formData.append("file", blob, "artwork.png");
      }

      formData.append("name", name);
      formData.append("description", description);
      formData.append("attributes", JSON.stringify(attributes.filter((a) => a.trait_type && a.value)));

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json().catch(() => ({}));
        throw new Error(
          errorData.error || `IPFS upload failed with HTTP status ${uploadRes.status}`
        );
      }

      const uploadResult = await uploadRes.json();
      const ipfsMetadataUri = uploadResult.metadataUri;
      setMetadataIpfsUri(ipfsMetadataUri);

      // 2. Prepare Contract Mint Transaction
      setStatus("awaiting_wallet");
      setStatusMessage("Please confirm the mint transaction in your MetaMask wallet...");

      const contract = new ethers.Contract(
        contractAddress,
        EtherCanvasNFTArtifact.abi,
        signer
      );

      // Call mint(recipient, tokenURI)
      const mintFn = typeof contract.mint === "function" ? contract.mint.bind(contract) : (contract as any).mintNFT.bind(contract);
      const tx = await mintFn(mintTarget, ipfsMetadataUri);
      setTxHash(tx.hash);

      setStatus("confirming_tx");
      setStatusMessage(`Transaction submitted: ${tx.hash.substring(0, 10)}... Mining on Sepolia...`);

      const receipt = await tx.wait(1);

      // 3. Extract Token ID from Minted Event
      let tokenId = 0;
      if (receipt && receipt.logs) {
        for (const log of receipt.logs) {
          try {
            const parsed = contract.interface.parseLog(log);
            if (parsed && parsed.name === "Minted") {
              tokenId = Number(parsed.args.tokenId);
              break;
            }
          } catch {
            // Not this log
          }
        }
      }

      setMintedTokenId(tokenId);
      setStatus("success");
      setStatusMessage(`NFT Successfully Minted! Token ID: #${tokenId}`);

      // Celebratory Confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#E84B55", "#171717", "#737373", "#F4F4F0"],
      });

      onMintSuccess(tokenId);
    } catch (err: any) {
      console.error("Minting process error:", err);
      setStatus("error");
      setErrorMessage(err.reason || err.message || "Failed to mint NFT.");
    }
  };

  const resetForm = () => {
    setStatus("idle");
    setStatusMessage("");
    setTxHash(null);
    setMintedTokenId(null);
    setImagePreview(null);
    setImageFile(null);
    setName("");
    setDescription("");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Studio Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FAFAF8] border border-[#EAEAEA] text-[#737373] text-xs font-semibold tracking-wide uppercase">
          <Sparkles className="w-3.5 h-3.5 text-[#E84B55]" />
          Web3 Creator Studio
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-[#171717] tracking-tight">
          Create & Mint Your NFT
        </h1>
        <p className="text-sm text-[#737373] max-w-2xl mx-auto leading-relaxed">
          Upload or algorithmically generate your artwork, pin standard ERC-721 metadata securely to IPFS, and mint directly onto Ethereum Sepolia.
        </p>
      </div>

      {/* Contract Warning Banner if Not Configured */}
      {!contractAddress && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div className="text-sm font-medium">
              <span>Notice:</span> No EtherCanvasNFT contract address configured.
            </div>
          </div>
          <button
            onClick={onOpenSettings}
            className="px-4 py-2 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-semibold whitespace-nowrap"
          >
            Configure Contract
          </button>
        </div>
      )}

      {/* Success Modal / State */}
      {status === "success" && (
        <div className="bg-white border border-[#EAEAEA] rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-card animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#171717]">
              Minting Successful!
            </h2>
            <p className="text-sm text-[#737373] mt-1.5">
              Token ID <strong className="text-[#E84B55]">#{mintedTokenId}</strong> is now immutably recorded on Ethereum Sepolia.
            </p>
          </div>

          {/* Links Box */}
          <div className="max-w-md mx-auto space-y-2 text-xs font-mono">
            {txHash && (
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FAFAF8] border border-[#EAEAEA] text-[#171717] hover:border-[#D4D4D4] transition-colors"
              >
                <span>View on Sepolia Etherscan</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#737373]" />
              </a>
            )}

            {metadataIpfsUri && (
              <a
                href={formatIpfsUrl(metadataIpfsUri)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FAFAF8] border border-[#EAEAEA] text-[#171717] hover:border-[#D4D4D4] transition-colors"
              >
                <span>View Metadata on IPFS</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#737373]" />
              </a>
            )}
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={resetForm}
              className="px-6 py-2.5 rounded-full bg-[#171717] hover:bg-[#262626] text-white text-xs sm:text-sm font-semibold transition-all shadow-sm"
            >
              Mint Another NFT
            </button>
          </div>
        </div>
      )}

      {/* Main Studio Grid */}
      {status !== "success" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Artwork Canvas & Generator (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-[#EAEAEA] rounded-3xl p-6 sm:p-7 space-y-5 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#171717] flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[#E84B55]" />
                  Artwork Canvas
                </span>
                <button
                  type="button"
                  onClick={generateProceduralArt}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FAFAF8] hover:bg-[#F4F4F0] border border-[#EAEAEA] hover:border-[#D4D4D4] text-[#171717] text-xs font-semibold transition-all"
                  title="Generate algorithmic canvas art without uploading files"
                >
                  <Wand2 className="w-3.5 h-3.5 text-[#E84B55]" />
                  Procedural Art
                </button>
              </div>

              {/* Upload Dropzone / Canvas Preview */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`relative group aspect-square rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-4 cursor-pointer overflow-hidden ${
                  imagePreview
                    ? "border-[#EAEAEA] bg-[#FAFAF8]"
                    : "border-[#EAEAEA] hover:border-[#171717] bg-[#FAFAF8] hover:bg-[#F4F4F0]"
                }`}
              >
                {imagePreview ? (
                  <>
                    <img
                      src={imagePreview}
                      alt="Artwork Preview"
                      className="w-full h-full object-cover rounded-xl shadow-sm"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                      <span className="text-xs font-semibold text-[#171717] bg-white px-3.5 py-2 rounded-full shadow-lg">
                        Change Artwork
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-center space-y-3 p-4">
                    <div className="w-14 h-14 rounded-full bg-white border border-[#EAEAEA] text-[#737373] flex items-center justify-center mx-auto group-hover:scale-105 transition-transform shadow-sm">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#171717]">
                        Click to select image
                      </div>
                      <div className="text-xs text-[#737373] mt-1">
                        PNG, JPG, SVG, WebP up to 5MB
                      </div>
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Serverless IPFS Security Assurance */}
              <div className="p-3.5 rounded-2xl bg-[#FAFAF8] border border-[#EAEAEA] text-xs text-[#737373] flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  <strong className="text-[#171717]">Serverless Pinata IPFS:</strong> Uploads execute securely via server routes. Your Pinata API keys are never exposed.
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Metadata Form (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            <div className="bg-white border border-[#EAEAEA] rounded-3xl p-6 sm:p-8 space-y-5 shadow-card">
              <h2 className="text-lg font-bold text-[#171717] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#E84B55]" />
                NFT Metadata & Attributes
              </h2>

              {/* Title & Description */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#737373] uppercase tracking-wider mb-2">
                    Artwork Title *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Celestial Harmony #1"
                    className="w-full px-4 py-3 rounded-xl bg-[#FAFAF8] border border-[#EAEAEA] focus:border-[#171717] focus:bg-white focus:outline-none text-[#171717] text-sm placeholder:text-[#A3A3A3] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#737373] uppercase tracking-wider mb-2">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your artwork, medium, symbolism or narrative..."
                    className="w-full px-4 py-3 rounded-xl bg-[#FAFAF8] border border-[#EAEAEA] focus:border-[#171717] focus:bg-white focus:outline-none text-[#171717] text-sm placeholder:text-[#A3A3A3] transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#737373] uppercase tracking-wider mb-2">
                    Recipient Address (Optional)
                  </label>
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder={address || "0x... (defaults to connected wallet)"}
                    className="w-full px-4 py-3 rounded-xl bg-[#FAFAF8] border border-[#EAEAEA] focus:border-[#171717] focus:bg-white focus:outline-none text-[#171717] font-mono text-sm placeholder:text-[#A3A3A3] transition-all"
                  />
                </div>
              </div>

              {/* Traits / Attributes Section */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-[#737373] uppercase tracking-wider">
                    Traits & Properties
                  </label>
                  <button
                    type="button"
                    onClick={addTrait}
                    className="flex items-center gap-1 text-xs text-[#E84B55] hover:text-[#D73843] font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Trait
                  </button>
                </div>

                <div className="space-y-2">
                  {attributes.map((attr, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Trait Type (e.g. Rarity)"
                        value={attr.trait_type}
                        onChange={(e) => updateTrait(idx, "trait_type", e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl bg-[#FAFAF8] border border-[#EAEAEA] text-[#171717] text-xs placeholder:text-[#A3A3A3] focus:bg-white focus:border-[#171717] focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Value (e.g. Legendary)"
                        value={attr.value}
                        onChange={(e) => updateTrait(idx, "value", e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl bg-[#FAFAF8] border border-[#EAEAEA] text-[#171717] text-xs placeholder:text-[#A3A3A3] focus:bg-white focus:border-[#171717] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeTrait(idx)}
                        className="p-2 text-[#A3A3A3] hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* MetaMask Installation Guidance */}
              {!address && !hasProvider && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
                  <div className="space-y-2 flex-1">
                    <div className="font-semibold text-amber-900 text-sm">
                      MetaMask Not Detected
                    </div>
                    <p className="text-amber-800/90 leading-relaxed">
                      To mint NFTs on EtherCanvas, you need the MetaMask browser extension. Please install MetaMask to interact with Ethereum Sepolia.
                    </p>
                    <div>
                      <a
                        href="https://metamask.io/download/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-xs font-semibold transition-colors"
                      >
                        <span>Install MetaMask Extension</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {(errorMessage || walletError) && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 mt-0.5" />
                  <div className="flex-1 space-y-1.5">
                    <div>{errorMessage || walletError}</div>
                    {!hasProvider ? (
                      <div>
                        <a
                          href="https://metamask.io/download/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-900 border border-rose-300 text-xs font-medium transition-colors"
                        >
                          <span>Get MetaMask</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ) : walletError ? (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={connectWallet}
                          disabled={isConnecting}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-[#171717] border border-[#EAEAEA] text-xs font-medium transition-colors shadow-sm"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Retry Connection</span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                  {walletError && (
                    <button
                      type="button"
                      onClick={() => clearWalletError()}
                      className="text-rose-600 hover:text-rose-800 text-xs px-1 font-bold"
                      title="Dismiss"
                    >
                      ×
                    </button>
                  )}
                </div>
              )}

              {/* Status Indicator */}
              {status !== "idle" && status !== "error" && (
                <div className="p-4 rounded-2xl bg-[#FAFAF8] border border-[#EAEAEA] text-[#171717] text-xs flex items-center gap-3">
                  <Loader2 className="w-4 h-4 animate-spin text-[#E84B55] flex-shrink-0" />
                  <span className="font-medium">{statusMessage}</span>
                </div>
              )}

              {/* Action Mint Button */}
              <div className="pt-2">
                {!address ? (
                  <button
                    type="button"
                    onClick={connectWallet}
                    disabled={isConnecting}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#171717] hover:bg-[#262626] text-white font-semibold text-sm shadow-sm transition-all active:scale-98 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Connecting to MetaMask...</span>
                      </>
                    ) : (
                      <>
                        <Coins className="w-4 h-4" />
                        <span>{hasProvider ? "Connect MetaMask to Mint" : "Connect MetaMask (Install Required)"}</span>
                      </>
                    )}
                  </button>
                ) : !isSepolia ? (
                  <button
                    onClick={switchToSepolia}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-sm transition-all animate-pulse"
                  >
                    <AlertCircle className="w-4 h-4" />
                    Switch Network to Sepolia
                  </button>
                ) : (
                  <button
                    onClick={handleMint}
                    disabled={status === "uploading_ipfs" || status === "awaiting_wallet" || status === "confirming_tx"}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#E84B55] hover:bg-[#D73843] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-98 disabled:opacity-50"
                  >
                    {status === "uploading_ipfs" ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading to IPFS...
                      </>
                    ) : status === "awaiting_wallet" ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Confirm in MetaMask...
                      </>
                    ) : status === "confirming_tx" ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Mining Block on Sepolia...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Pin to IPFS & Mint NFT
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
