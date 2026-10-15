import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { Navbar, NavTab } from "@/components/Navbar";
import { MintStudio } from "@/components/MintStudio";
import { Gallery } from "@/components/Gallery";
import { EnsLookup } from "@/components/EnsLookup";
import { PriceFeedCard } from "@/components/PriceFeedCard";
import { ContractSettingsModal } from "@/components/ContractSettingsModal";
import { WalletProvider } from "@/context/WalletContext";
import { DEFAULT_NFT_CONTRACT_ADDRESS } from "@/contracts/addresses";
import { Sparkles, Heart } from "lucide-react";

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>("explore");
  const [contractAddress, setContractAddress] = useState<string>(DEFAULT_NFT_CONTRACT_ADDRESS);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Load any previously saved custom address from localStorage or fallback to default
  useEffect(() => {
    const saved = localStorage.getItem("ethercanvas_contract_address");
    if (saved && ethers.isAddress(saved.trim())) {
      setContractAddress(saved.trim());
    } else {
      if (saved !== null) {
        localStorage.removeItem("ethercanvas_contract_address");
      }
      if (DEFAULT_NFT_CONTRACT_ADDRESS) {
        setContractAddress(DEFAULT_NFT_CONTRACT_ADDRESS);
      }
    }
  }, []);

  const handleUpdateContractAddress = (newAddr: string) => {
    const trimmed = newAddr.trim();
    if (trimmed && ethers.isAddress(trimmed)) {
      setContractAddress(trimmed);
      localStorage.setItem("ethercanvas_contract_address", trimmed);
    } else {
      setContractAddress(DEFAULT_NFT_CONTRACT_ADDRESS);
      localStorage.removeItem("ethercanvas_contract_address");
    }
  };

  return (
    <WalletProvider>
      <div className="min-h-screen flex flex-col bg-[#FAFAF8] text-[#171717] selection:bg-[#E84B55]/15 selection:text-[#E84B55]">
        {/* Navigation */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenSettings={() => setSettingsOpen(true)}
          contractAddress={contractAddress}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {activeTab === "explore" && (
            <Gallery
              contractAddress={contractAddress}
              initialOwnerFilter={false}
              onNavigateToCreate={() => setActiveTab("create")}
              onNavigateToStudio={() => setActiveTab("create")}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          )}

          {activeTab === "my_nfts" && (
            <Gallery
              contractAddress={contractAddress}
              initialOwnerFilter={true}
              onNavigateToCreate={() => setActiveTab("create")}
              onNavigateToStudio={() => setActiveTab("create")}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          )}

          {activeTab === "create" && (
            <MintStudio
              contractAddress={contractAddress}
              onMintSuccess={() => setActiveTab("explore")}
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

        {/* Minimalist Footer */}
        <footer className="border-t border-[#EAEAEA] bg-white py-12 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#171717] flex items-center justify-center text-white font-bold text-xs shadow-sm">
                EC
              </div>
              <div>
                <div className="text-sm font-bold text-[#171717] font-sans">
                  EtherCanvas Studio
                </div>
                <p className="text-xs text-[#737373]">
                  Minimalist Ethereum Sepolia NFT Platform
                </p>
              </div>
            </div>

            {/* Technology Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-mono text-[#737373]">
              <span className="px-2.5 py-1 rounded-full bg-[#FAFAF8] border border-[#EAEAEA]">
                ERC-721
              </span>
              <span className="px-2.5 py-1 rounded-full bg-[#FAFAF8] border border-[#EAEAEA]">
                Ethers v6
              </span>
              <span className="px-2.5 py-1 rounded-full bg-[#FAFAF8] border border-[#EAEAEA]">
                Sepolia
              </span>
              <span className="px-2.5 py-1 rounded-full bg-[#FAFAF8] border border-[#EAEAEA]">
                Hardhat
              </span>
              <span className="px-2.5 py-1 rounded-full bg-[#FAFAF8] border border-[#EAEAEA]">
                Pinata IPFS
              </span>
              <span className="px-2.5 py-1 rounded-full bg-[#FAFAF8] border border-[#EAEAEA]">
                Chainlink
              </span>
              <span className="px-2.5 py-1 rounded-full bg-[#FAFAF8] border border-[#EAEAEA]">
                ENS
              </span>
            </div>

            <div className="text-xs text-[#737373] text-center md:text-right">
              <span>Designed with precision & minimalist aesthetics</span>
            </div>
          </div>
        </footer>
      </div>
    </WalletProvider>
  );
}

export default App;
