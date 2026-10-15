import React, { useState, useEffect } from "react";
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
  RotateCcw,
} from "lucide-react";
import EtherCanvasNFTArtifact from "@/contracts/EtherCanvasNFT.json";
import {
  CHAINLINK_ETH_USD_SEPOLIA_ADDRESS,
  SEPOLIA_CHAIN_ID,
  DEFAULT_NFT_CONTRACT_ADDRESS,
} from "@/contracts/addresses";

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
  const [inputAddr, setInputAddr] = useState(contractAddress || DEFAULT_NFT_CONTRACT_ADDRESS);
  const [copied, setCopied] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [addrError, setAddrError] = useState<string | null>(null);
  const [showAbi, setShowAbi] = useState(false);

  useEffect(() => {
    setInputAddr(contractAddress || DEFAULT_NFT_CONTRACT_ADDRESS);
  }, [contractAddress, isOpen]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto border border-[#EAEAEA] shadow-modal">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#EAEAEA]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-[#FAFAF8] text-[#171717] border border-[#EAEAEA]">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#171717]">
                Contract Configuration
              </h2>
              <p className="text-xs text-[#737373]">EtherCanvas Web3 Architecture & Parameters</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[#737373] hover:text-[#171717] hover:bg-[#FAFAF8]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contract Address Override */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-[#737373] uppercase tracking-wider">
            EtherCanvasNFT Address (Sepolia)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputAddr}
              onChange={(e) => setInputAddr(e.target.value)}
              placeholder="0x..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#FAFAF8] border border-[#EAEAEA] focus:border-[#171717] focus:bg-white focus:outline-none text-[#171717] font-mono text-xs placeholder:text-[#A3A3A3]"
            />
            <button
              onClick={handleSave}
              className="px-4 py-2.5 rounded-xl bg-[#171717] hover:bg-[#262626] text-white font-semibold text-xs transition-all shadow-sm"
            >
              {saveSuccess ? "Saved!" : "Update"}
            </button>
          </div>
          {addrError && <p className="text-xs text-rose-600 mt-1">{addrError}</p>}
          <div className="flex items-center justify-between gap-2 text-[11px] text-[#737373]">
            <span>
              Configured Sepolia contract address used for on-chain querying and minting.
            </span>
            {DEFAULT_NFT_CONTRACT_ADDRESS && inputAddr !== DEFAULT_NFT_CONTRACT_ADDRESS && (
              <button
                type="button"
                onClick={() => {
                  setInputAddr(DEFAULT_NFT_CONTRACT_ADDRESS);
                  onUpdateAddress(DEFAULT_NFT_CONTRACT_ADDRESS);
                  setSaveSuccess(true);
                  setTimeout(() => setSaveSuccess(false), 2000);
                }}
                className="inline-flex items-center gap-1 text-[#E84B55] hover:text-[#D73843] font-medium whitespace-nowrap"
              >
                <RotateCcw className="w-3 h-3" />
                Reset to Default
              </button>
            )}
          </div>
        </div>

        {/* Specifications Box */}
        <div className="p-4 rounded-2xl bg-[#FAFAF8] border border-[#EAEAEA] space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[#737373]">Network:</span>
            <span className="text-[#171717] font-semibold">Sepolia ({SEPOLIA_CHAIN_ID})</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#737373]">Standard:</span>
            <span className="text-[#171717]">ERC-721 URIStorage (OpenZeppelin 5)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#737373]">Token Name & Symbol:</span>
            <span className="text-[#171717]">EtherCanvas (ECANVAS)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#737373]">Chainlink Feed:</span>
            <div className="flex items-center gap-1.5 text-emerald-700">
              <span className="truncate max-w-[150px]">{CHAINLINK_ETH_USD_SEPOLIA_ADDRESS}</span>
              <button
                onClick={() => copyToClipboard(CHAINLINK_ETH_USD_SEPOLIA_ADDRESS, "feed")}
                className="hover:text-emerald-900"
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
            className="flex items-center justify-between w-full p-3 rounded-2xl bg-[#FAFAF8] hover:bg-[#F4F4F0] border border-[#EAEAEA] text-xs font-semibold text-[#171717] transition-colors"
          >
            <span className="flex items-center gap-2">
              <Code className="w-4 h-4 text-[#E84B55]" />
              Contract ABI ({EtherCanvasNFTArtifact.abi.length} entries)
            </span>
            <span>{showAbi ? "Hide" : "View"}</span>
          </button>

          {showAbi && (
            <div className="mt-2 p-3 rounded-2xl bg-[#FAFAF8] border border-[#EAEAEA] max-h-52 overflow-y-auto">
              <pre className="text-[10px] font-mono text-[#171717] leading-tight">
                {JSON.stringify(EtherCanvasNFTArtifact.abi, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-[#FAFAF8] hover:bg-[#F4F4F0] border border-[#EAEAEA] text-[#171717] text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
