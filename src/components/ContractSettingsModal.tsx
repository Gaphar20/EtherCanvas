import React, { useState } from "react";
import { ethers } from "ethers";
import {
  Settings,
  X,
  CheckCircle2,
  Copy,
  ExternalLink,
  Code,
  Shield,
  RefreshCw,
} from "lucide-react";
import EtherCanvasNFTArtifact from "@/contracts/EtherCanvasNFT.json";
import { CHAINLINK_ETH_USD_SEPOLIA_ADDRESS, SEPOLIA_CHAIN_ID } from "@/contracts/addresses";

interface ContractSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractAddress: string;
  onUpdateAddress: (newAddr: string) => void;
}

export const ContractSettingsModal: React.FC<ContractSettingsModalProps> = ({
  isOpen,
  onClose,
  contractAddress,
  onUpdateAddress,
}) => {
  const [inputAddr, setInputAddr] = useState(contractAddress);
  const [copied, setCopied] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [addrError, setAddrError] = useState<string | null>(null);
  const [showAbi, setShowAbi] = useState(false);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSave = () => {
    const trimmed = inputAddr.trim();
    if (trimmed && !ethers.isAddress(trimmed)) {
      setAddrError("Invalid Ethereum address format.");
      return;
    }
    setAddrError(null);
    onUpdateAddress(trimmed);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="glass-panel rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-violet-900/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white font-sans">
                Contract Configuration
              </h2>
              <p className="text-xs text-slate-400">EtherCanvas Web3 Architecture & Parameters</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-violet-950/40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contract Address Override */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            EtherCanvasNFT Address (Sepolia)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputAddr}
              onChange={(e) => setInputAddr(e.target.value)}
              placeholder="0x..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-canvas-900 border border-violet-900/40 focus:border-violet-500 focus:outline-none text-white font-mono text-xs placeholder:text-slate-500"
            />
            <button
              onClick={handleSave}
              className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition-all shadow"
            >
              {saveSuccess ? "Saved!" : "Update"}
            </button>
          </div>
          {addrError && <p className="text-xs text-rose-400 mt-1">{addrError}</p>}
          <p className="text-[11px] text-slate-400">
            Paste your deployed contract address here to immediately switch gallery inspection to your live contract.
          </p>
        </div>

        {/* Specifications Box */}
        <div className="p-4 rounded-2xl bg-canvas-900/80 border border-violet-900/40 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Network:</span>
            <span className="text-violet-300 font-semibold">Sepolia ({SEPOLIA_CHAIN_ID})</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Standard:</span>
            <span className="text-white">ERC-721 URIStorage (OpenZeppelin 5)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Token Name & Symbol:</span>
            <span className="text-white">EtherCanvas (ECANVAS)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Chainlink Feed:</span>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className="truncate max-w-[150px]">{CHAINLINK_ETH_USD_SEPOLIA_ADDRESS}</span>
              <button
                onClick={() => copyToClipboard(CHAINLINK_ETH_USD_SEPOLIA_ADDRESS, "feed")}
                className="hover:text-white"
              >
                {copied === "feed" ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>

        {/* Toggle ABI Explorer */}
        <div>
          <button
            onClick={() => setShowAbi(!showAbi)}
            className="flex items-center justify-between w-full p-3 rounded-xl bg-canvas-900 hover:bg-violet-950/40 border border-violet-900/40 text-xs font-semibold text-violet-300 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Code className="w-4 h-4 text-violet-400" />
              Contract ABI ({EtherCanvasNFTArtifact.abi.length} entries)
            </span>
            <span>{showAbi ? "Hide" : "View"}</span>
          </button>

          {showAbi && (
            <div className="mt-2 p-3 rounded-xl bg-canvas-950 border border-violet-900/50 max-h-52 overflow-y-auto">
              <pre className="text-[10px] font-mono text-slate-300 leading-tight">
                {JSON.stringify(EtherCanvasNFTArtifact.abi, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-canvas-900 hover:bg-violet-950/60 border border-violet-900/50 text-slate-200 text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
