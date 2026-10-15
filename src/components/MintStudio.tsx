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
  const { address, isSepolia, signer, connectWallet, switchToSepolia } = useWallet();

  // Form states
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [recipient, setRecipient] = useState<string>("");
  const [attributes, setAttributes] = useState<TraitAttribute[]>([
    { trait_type: "Studio", value: "EtherCanvas" },
    { trait_type: "Edition", value: "Genesis" },
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

    // Gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, 600, 600);
    const hues = [260, 280, 240, 310, 200];
    const pickHue = hues[Math.floor(Math.random() * hues.length)];
    bgGrad.addColorStop(0, `hsl(${pickHue}, 80%, 10%)`);
    bgGrad.addColorStop(0.5, `hsl(${pickHue + 40}, 85%, 20%)`);
    bgGrad.addColorStop(1, `hsl(${pickHue - 30}, 90%, 8%)`);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 600, 600);

    // Glowing Neon Rings & Celestial Geometry
    for (let i = 0; i < 18; i++) {
      ctx.save();
      ctx.translate(300, 300);
      ctx.rotate((Math.PI / 9) * i);
      ctx.beginPath();
      ctx.arc(0, 0, 40 + i * 14, 0, Math.PI * 1.5);
      ctx.strokeStyle = `hsla(${pickHue + i * 8}, 95%, 70%, 0.45)`;
      ctx.lineWidth = 2 + Math.random() * 4;
      ctx.shadowColor = `hsl(${pickHue + i * 8}, 100%, 75%)`;
      ctx.shadowBlur = 18;
      ctx.stroke();
      ctx.restore();
    }

    // Inner Radiant Star
    ctx.beginPath();
    ctx.arc(300, 300, 45, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${pickHue + 50}, 100%, 85%)`;
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 30;
    ctx.fill();

    const dataUrl = canvas.toDataURL("image/png");
    setImagePreview(dataUrl);

    // Auto-fill creative metadata
    const randomEdition = Math.floor(100 + Math.random() * 900);
    if (!name) setName(`EtherCanvas #${randomEdition}`);
    if (!description) {
      setDescription(
        "A generative on-chain composition crafted with luminous violet geometry and decentralized permanence."
      );
    }
  };

  // Handle image file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File size exceeds 5MB limit. Please select a smaller image.");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Trait management
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

  // Handle Full Mint Flow
  const handleMint = async () => {
    if (!address) {
      connectWallet();
      return;
    }

    if (!isSepolia) {
      switchToSepolia();
      return;
    }

    if (!contractAddress) {
      setErrorMessage("No EtherCanvasNFT contract address configured. Please set one in settings.");
      return;
    }

    if (!imagePreview) {
      setErrorMessage("Please select or generate artwork for your NFT.");
      return;
    }

    if (!name.trim()) {
      setErrorMessage("Please enter a name for your NFT artwork.");
      return;
    }

    setErrorMessage(null);
    setStatus("uploading_ipfs");
    setStatusMessage("Uploading artwork and pinning ERC-721 metadata to Pinata IPFS...");

    try {
      // 1. Secure Server-Side Upload
      // Sends base64 data to /api/upload. PINATA_JWT is NEVER exposed to the browser.
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imagePreview,
          fileName: imageFile?.name || "ethercanvas-art.png",
          name: name.trim(),
          description: description.trim(),
          attributes: attributes.filter((a) => a.trait_type.trim() && a.value),
        }),
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        throw new Error(uploadData.error || uploadData.details || "IPFS upload failed.");
      }

      const returnedMetadataUri = uploadData.metadataUri;
      setMetadataIpfsUri(returnedMetadataUri);

      // 2. MetaMask On-Chain Minting
      setStatus("awaiting_wallet");
      setStatusMessage("Sign transaction in MetaMask to mint your NFT on Sepolia...");

      if (!signer) {
        throw new Error("Wallet signer not available. Please reconnect MetaMask.");
      }

      const nftContract = new ethers.Contract(
        contractAddress,
        EtherCanvasNFTArtifact.abi,
        signer
      );

      const targetTo = (recipient.trim() || address).trim();

      if (!ethers.isAddress(targetTo)) {
        throw new Error(`Invalid recipient address: "${targetTo}"`);
      }

      const tx = await nftContract.mint(targetTo, returnedMetadataUri);
      setTxHash(tx.hash);

      setStatus("confirming_tx");
      setStatusMessage("Waiting for Ethereum Sepolia block confirmation...");

      const receipt = await tx.wait();

      // Find Minted event in receipt
      let tokenId = 1;
      if (receipt.logs) {
        for (const log of receipt.logs) {
          try {
            const parsed = nftContract.interface.parseLog({
              topics: [...log.topics],
              data: log.data,
            });
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

      // Fire celebratory confetti!
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#8b5cf6", "#a855f7", "#ec4899", "#38bdf8", "#ffffff"],
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
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-semibold tracking-wide uppercase">
          <Sparkles className="w-3.5 h-3.5" />
          Web3 Creator Studio
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white font-sans tracking-tight">
          Create & Mint <span className="gradient-text">Masterpieces</span>
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl mx-auto">
          Upload or generate your artwork, pin standard ERC-721 metadata securely to IPFS, and mint
          directly onto Ethereum Sepolia.
        </p>
      </div>

      {/* Contract Warning Banner if Not Configured */}
      {!contractAddress && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div className="text-sm">
              <span className="font-semibold">Notice:</span> No EtherCanvasNFT contract address is
              configured. Please set one or deploy to Sepolia.
            </div>
          </div>
          <button
            onClick={onOpenSettings}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-semibold whitespace-nowrap"
          >
            Configure Contract
          </button>
        </div>
      )}

      {/* Success Modal / State */}
      {status === "success" && (
        <div className="glass-panel rounded-3xl p-8 border border-emerald-500/40 text-center space-y-6 animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/40">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white font-sans">
              Minting Successful!
            </h2>
            <p className="text-sm text-slate-300 mt-1">
              Token ID <strong className="text-violet-400">#{mintedTokenId}</strong> is now
              immutably recorded on Ethereum Sepolia.
            </p>
          </div>

          {/* Links Box */}
          <div className="max-w-md mx-auto space-y-2 text-xs font-mono">
            {txHash && (
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-canvas-900 border border-violet-900/40 text-slate-300 hover:text-violet-300 transition-colors"
              >
                <span>View Transaction on Etherscan</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            {metadataIpfsUri && (
              <a
                href={formatIpfsUrl(metadataIpfsUri)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-canvas-900 border border-violet-900/40 text-slate-300 hover:text-violet-300 transition-colors"
              >
                <span>View Metadata on IPFS Gateway</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          <div className="flex justify-center gap-4 pt-2">
            <button
              onClick={resetForm}
              className="px-6 py-2.5 rounded-xl bg-canvas-900 hover:bg-violet-950/60 border border-violet-900/50 text-slate-200 text-sm font-semibold transition-all"
            >
              Mint Another NFT
            </button>
          </div>
        </div>
      )}

      {/* Main Studio Grid */}
      {status !== "success" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Image Canvas & Art Generation (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="glass-panel rounded-3xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-violet-400" />
                  Artwork Canvas
                </span>
                <button
                  type="button"
                  onClick={generateProceduralArt}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/40 border border-violet-500/30 text-violet-300 text-xs font-semibold transition-all"
                  title="Generate neon algorithmic canvas art"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  Procedural Art
                </button>
              </div>

              {/* Upload Dropzone / Canvas Preview */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`relative group aspect-square rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-4 cursor-pointer overflow-hidden ${
                  imagePreview
                    ? "border-violet-500/50 bg-canvas-900/60"
                    : "border-violet-900/40 hover:border-violet-500/40 bg-canvas-900/30 hover:bg-canvas-900/60"
                }`}
              >
                {imagePreview ? (
                  <>
                    <img
                      src={imagePreview}
                      alt="Artwork Preview"
                      className="w-full h-full object-cover rounded-xl shadow-lg"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                      <span className="text-xs font-semibold text-white bg-violet-600 px-3 py-1.5 rounded-lg shadow">
                        Change Image
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-center space-y-3 p-4">
                    <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                      <Upload className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-200">
                        Click to select image
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
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

              {/* Security Badge */}
              <div className="p-3.5 rounded-2xl bg-canvas-900/80 border border-violet-900/40 text-xs text-slate-400 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Serverless Pinata IPFS:</strong> Uploads run via secure server routes.
                  Your Pinata API credentials are never exposed in browser bundles.
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Metadata Form (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-5">
              <h2 className="text-lg font-bold text-white font-sans flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400" />
                NFT Metadata & Attributes
              </h2>

              {/* Title & Description */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Artwork Title *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Celestial Ether #1"
                    className="w-full px-4 py-3 rounded-xl bg-canvas-900 border border-violet-900/40 focus:border-violet-500 focus:outline-none text-white text-sm placeholder:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your artwork, medium, symbolism or narrative..."
                    className="w-full px-4 py-3 rounded-xl bg-canvas-900 border border-violet-900/40 focus:border-violet-500 focus:outline-none text-white text-sm placeholder:text-slate-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Recipient Address (Optional)
                  </label>
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder={address || "0x... (defaults to connected wallet)"}
                    className="w-full px-4 py-3 rounded-xl bg-canvas-900 border border-violet-900/40 focus:border-violet-500 focus:outline-none text-white font-mono text-sm placeholder:text-slate-500"
                  />
                </div>
              </div>

              {/* Traits / Attributes Section */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Traits & Properties
                  </label>
                  <button
                    type="button"
                    onClick={addTrait}
                    className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 font-semibold"
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
                        className="flex-1 px-3 py-2 rounded-lg bg-canvas-900 border border-violet-900/30 text-white text-xs placeholder:text-slate-500"
                      />
                      <input
                        type="text"
                        placeholder="Value (e.g. Legendary)"
                        value={attr.value}
                        onChange={(e) => updateTrait(idx, "value", e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg bg-canvas-900 border border-violet-900/30 text-white text-xs placeholder:text-slate-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeTrait(idx)}
                        className="p-2 text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Error Display */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
                  <div>{errorMessage}</div>
                </div>
              )}

              {/* Status Indicator */}
              {status !== "idle" && status !== "error" && (
                <div className="p-4 rounded-2xl bg-violet-950/60 border border-violet-800/40 text-violet-200 text-xs flex items-center gap-3">
                  <Loader2 className="w-4 h-4 animate-spin text-violet-400 flex-shrink-0" />
                  <span>{statusMessage}</span>
                </div>
              )}

              {/* Action Mint Button */}
              <div className="pt-2">
                {!address ? (
                  <button
                    onClick={connectWallet}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-xl shadow-violet-900/40 transition-all active:scale-98"
                  >
                    <Coins className="w-4 h-4" />
                    Connect MetaMask to Mint
                  </button>
                ) : !isSepolia ? (
                  <button
                    onClick={switchToSepolia}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold text-sm transition-all animate-pulse"
                  >
                    <AlertCircle className="w-4 h-4" />
                    Switch Network to Sepolia
                  </button>
                ) : (
                  <button
                    onClick={handleMint}
                    disabled={status === "uploading_ipfs" || status === "awaiting_wallet" || status === "confirming_tx"}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-violet-900/40 hover:shadow-violet-700/60 transition-all border border-violet-400/30 active:scale-98 disabled:opacity-50"
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
