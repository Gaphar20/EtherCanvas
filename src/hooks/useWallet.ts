import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import {
  SEPOLIA_CHAIN_ID,
  SEPOLIA_CONFIG,
  MAINNET_RPC_URLS,
  formatIpfsUrl,
} from "@/contracts/addresses";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [balance, setBalance] = useState<string>("0");
  const [ensName, setEnsName] = useState<string | null>(null);
  const [ensAvatar, setEnsAvatar] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);

  const isSepolia = chainId === SEPOLIA_CHAIN_ID;

  // Resolve ENS name & avatar using Ethereum Mainnet provider
  const resolveEns = useCallback(async (targetAddress: string) => {
    try {
      const mainnetProvider = new ethers.JsonRpcProvider(MAINNET_RPC_URLS[0]);
      const name = await mainnetProvider.lookupAddress(targetAddress);
      if (name) {
        setEnsName(name);
        const resolver = await mainnetProvider.getResolver(name);
        if (resolver) {
          const avatar = await resolver.getAvatar();
          setEnsAvatar(avatar ? formatIpfsUrl(avatar) : null);
        }
      } else {
        setEnsName(null);
        setEnsAvatar(null);
      }
    } catch (err) {
      console.warn("ENS resolution error (non-fatal):", err);
      setEnsName(null);
      setEnsAvatar(null);
    }
  }, []);

  // Fetch ETH balance
  const updateBalance = useCallback(async (userAddress: string, activeProvider: ethers.BrowserProvider) => {
    try {
      const bal = await activeProvider.getBalance(userAddress);
      setBalance(ethers.formatEther(bal));
    } catch (err) {
      console.warn("Failed to fetch balance:", err);
    }
  }, []);

  // Switch to Sepolia network
  const switchToSepolia = useCallback(async () => {
    if (!window.ethereum) {
      setError("MetaMask or Web3 wallet is not installed.");
      return false;
    }

    try {
      setError(null);
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CONFIG.chainId }],
      });
      return true;
    } catch (switchError: any) {
      // Chain not added error code 4902
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [SEPOLIA_CONFIG],
          });
          return true;
        } catch (addError: any) {
          setError(addError.message || "Failed to add Sepolia network.");
          return false;
        }
      } else {
        setError(switchError.message || "Failed to switch to Sepolia.");
        return false;
      }
    }
  }, []);

  // Connect MetaMask
  const connectWallet = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      setError("Please install MetaMask to interact with EtherCanvas.");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await browserProvider.send("eth_requestAccounts", []);

      if (accounts && accounts.length > 0) {
        const userAddress = accounts[0];
        setAddress(userAddress);

        const network = await browserProvider.getNetwork();
        const currentChainId = Number(network.chainId);
        setChainId(currentChainId);

        const currentSigner = await browserProvider.getSigner();
        setProvider(browserProvider);
        setSigner(currentSigner);

        await updateBalance(userAddress, browserProvider);
        await resolveEns(userAddress);

        // Auto prompt network switch if not on Sepolia
        if (currentChainId !== SEPOLIA_CHAIN_ID) {
          await switchToSepolia();
        }
      }
    } catch (err: any) {
      console.error("Wallet connection failed:", err);
      setError(err.message || "Failed to connect wallet.");
    } finally {
      setIsConnecting(false);
    }
  }, [resolveEns, switchToSepolia, updateBalance]);

  // Disconnect
  const disconnectWallet = useCallback(() => {
    setAddress(null);
    setSigner(null);
    setEnsName(null);
    setEnsAvatar(null);
    setBalance("0");
    setChainId(null);
  }, []);

  // Listen to account and network change events
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        const newAddress = accounts[0];
        setAddress(newAddress);
        if (provider) {
          const currentSigner = await provider.getSigner();
          setSigner(currentSigner);
          await updateBalance(newAddress, provider);
        }
        await resolveEns(newAddress);
      }
    };

    const handleChainChanged = (chainIdHex: string) => {
      const newChainId = parseInt(chainIdHex, 16);
      setChainId(newChainId);
      // Re-instantiate provider on chain change
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      setProvider(browserProvider);
      if (address) {
        browserProvider.getSigner().then(setSigner).catch(console.error);
        updateBalance(address, browserProvider);
      }
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    // Initial check if already connected
    window.ethereum
      .request({ method: "eth_accounts" })
      .then(async (accounts: string[]) => {
        if (accounts && accounts.length > 0) {
          const browserProvider = new ethers.BrowserProvider(window.ethereum);
          const network = await browserProvider.getNetwork();
          const currentChainId = Number(network.chainId);
          const currentSigner = await browserProvider.getSigner();

          setAddress(accounts[0]);
          setChainId(currentChainId);
          setProvider(browserProvider);
          setSigner(currentSigner);

          updateBalance(accounts[0], browserProvider);
          resolveEns(accounts[0]);
        }
      })
      .catch((err: any) => console.warn("Check connected accounts error:", err));

    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, [address, disconnectWallet, provider, resolveEns, updateBalance]);

  return {
    address,
    chainId,
    isSepolia,
    balance,
    ensName,
    ensAvatar,
    isConnecting,
    error,
    provider,
    signer,
    connectWallet,
    disconnectWallet,
    switchToSepolia,
    refreshBalance: () => {
      if (address && provider) {
        updateBalance(address, provider);
      }
    },
  };
}
