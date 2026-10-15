import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { MintStudio } from "@/components/MintStudio";
import { Gallery } from "@/components/Gallery";
import { EnsLookup } from "@/components/EnsLookup";
import { PriceFeedCard } from "@/components/PriceFeedCard";
import { ContractSettingsModal } from "@/components/ContractSettingsModal";
import { DEFAULT_NFT_CONTRACT_ADDRESS } from "@/contracts/addresses";
import { Sparkles, Layers, Search, Activity, ShieldCheck, Heart } from "lucide-react";

export function App() {
  const [activeTab, setActiveTab] = useState<"studio" | "gallery" | "ens" | "oracle">("studio");
  const [contractAddress, setContractAddress] = useState<string>(DEFAULT_NFT_CONTRACT_ADDRESS);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Load any previously saved custom address from localStorage or fallback to default
  useEffect(() => {
    const saved = localStorage.getItem("ethercanvas_contract_address");
    if (saved) {
      setContractAddress(saved);
    }
  }, []);

  const handleUpdateContractAddress = (newAddr: string) => {
    setContractAddress(newAddr);
    localStorage.setItem("ethercanvas_contract_address", newAddr);
  };

  return (
    <div className="min-h-screen flex flex-col bg-canvas-950 text-slate-100 selection:bg-violet-600 selection:text-white">
      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSettings={() => setSettingsOpen(true)}
        contractAddress={contractAddress}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {activeTab === "studio" && (
          <MintStudio
            contractAddress={contractAddress}
            onMintSuccess={() => setActiveTab("gallery")}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        )}

        {activeTab === "gallery" && (
          <Gallery
            contractAddress={contractAddress}
            onNavigateToStudio={() => setActiveTab("studio")}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        )}

        {activeTab === "ens" && <EnsLookup />}

        {activeTab === "oracle" && <PriceFeedCard />}
      </main>

      {/* Contract Settings Modal */}
      <ContractSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        contractAddress={contractAddress}
        onUpdateAddress={handleUpdateContractAddress}
      />

      {/* Footer */}
      <footer className="border-t border-violet-900/30 bg-canvas-950/90 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white font-bold text-sm shadow">
              EC
            </div>
            <div>
              <div className="text-sm font-bold text-white font-sans">
                EtherCanvas Studio
              </div>
              <p className="text-xs text-slate-400">
                Ethereum Sepolia Web3 Assignment Project
              </p>
            </div>
          </div>

          {/* Technology Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-mono text-slate-400">
            <span className="px-2.5 py-1 rounded-md bg-canvas-900 border border-violet-900/30">
              ERC-721
            </span>
            <span className="px-2.5 py-1 rounded-md bg-canvas-900 border border-violet-900/30">
              Ethers v6
            </span>
            <span className="px-2.5 py-1 rounded-md bg-canvas-900 border border-violet-900/30">
              Hardhat
            </span>
            <span className="px-2.5 py-1 rounded-md bg-canvas-900 border border-violet-900/30">
              Pinata IPFS
            </span>
            <span className="px-2.5 py-1 rounded-md bg-canvas-900 border border-violet-900/30">
              Chainlink
            </span>
            <span className="px-2.5 py-1 rounded-md bg-canvas-900 border border-violet-900/30">
              ENS
            </span>
          </div>

          <div className="text-xs text-slate-400 text-center md:text-right">
            <span>Built with precision for Web3 mentors & developers</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
