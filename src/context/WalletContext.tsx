import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
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

export interface WalletContextType {
  address: string | null;
  chainId: number | null;
  isSepolia: boolean;
  balance: string;
  ensName: string | null;
  ensAvatar: string | null;
  isConnecting: boolean;
  error: string | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  hasProvider: boolean;
  isMetaMaskInstalled: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchToSepolia: () => Promise<boolean>;
  refreshBalance: () => void;
  clearError: () => void;
}

// EIP-6963: Multi Injected Provider Discovery
let eip6963MetaMaskProvider: any = null;

if (typeof window !== "undefined") {
  window.addEventListener("eip6963:announceProvider", (event: any) => {
    const info = event?.detail?.info;
    if (
      info?.rdns === "io.metamask" ||
      info?.name?.toLowerCase().includes("metamask")
    ) {
      eip6963MetaMaskProvider = event.detail.provider;
    }
  });
  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

/**
 * Safely resolves the active Ethereum provider from window.ethereum,
 * supporting multi-wallet environments (EIP-6963 / window.ethereum.providers).
 */
export function getEthereumProvider(): any {
  if (typeof window === "undefined") {
    return undefined;
  }

  // 1. Direct EIP-6963 announced MetaMask provider (immune to window.ethereum hijacking)
  if (eip6963MetaMaskProvider) {
    return eip6963MetaMaskProvider;
  }

  const eth = window.ethereum;
  if (!eth) return undefined;

  // 2. If multiple injected wallets exist, prioritize pure MetaMask
  if (Array.isArray(eth.providers) && eth.providers.length > 0) {
    const pureMetaMask = eth.providers.find(
      (p: any) =>
        p.isMetaMask &&
        !p.isPhantom &&
        !p.isBraveWallet &&
        !p.isCoinbaseWallet &&
        !p.isOkxWallet
    );
    if (pureMetaMask) return pureMetaMask;

    const anyMetaMask = eth.providers.find((p: any) => p.isMetaMask);
    if (anyMetaMask) return anyMetaMask;

    return eth.providers[0];
  }

  return eth;
}

export const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [balance, setBalance] = useState<string>("0");
  const [ensName, setEnsName] = useState<string | null>(null);
  const [ensAvatar, setEnsAvatar] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);

  const [hasProvider, setHasProvider] = useState<boolean>(() => {
    return typeof window !== "undefined" && !!getEthereumProvider();
  });

  const isSepolia = chainId === SEPOLIA_CHAIN_ID;

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

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
  const updateBalance = useCallback(
    async (userAddress: string, activeProvider: ethers.BrowserProvider) => {
      try {
        const bal = await activeProvider.getBalance(userAddress);
        setBalance(ethers.formatEther(bal));
      } catch (err) {
        console.warn("Failed to fetch balance:", err);
      }
    },
    []
  );

  // Switch to Sepolia network
  const switchToSepolia = useCallback(async () => {
    const eth = getEthereumProvider();
    if (!eth) {
      setError("MetaMask is not detected. Please install MetaMask to switch networks.");
      return false;
    }

    try {
      setError(null);
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CONFIG.chainId }],
      });
      return true;
    } catch (switchError: any) {
      if (switchError.code === 4001) {
        setError("Network switch was canceled or rejected in MetaMask.");
        return false;
      }

      // Chain not added error code 4902 or unrecognized chain
      if (
        switchError.code === 4902 ||
        switchError?.data?.originalError?.code === 4902 ||
        /unrecognized chain/i.test(switchError.message || "")
      ) {
        try {
          await eth.request({
            method: "wallet_addEthereumChain",
            params: [SEPOLIA_CONFIG],
          });
          return true;
        } catch (addError: any) {
          if (addError.code === 4001) {
            setError("Adding Sepolia network was rejected in MetaMask.");
          } else {
            setError(addError.message || "Failed to add Sepolia network.");
          }
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
    const eth = getEthereumProvider();
    if (!eth) {
      setError(
        "MetaMask is not detected. Please install the MetaMask browser extension to use EtherCanvas."
      );
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      let accounts: string[] = [];

      // 1. Check if an account is already authorized / exposed
      try {
        const existing = await eth.request({ method: "eth_accounts" });
        if (Array.isArray(existing) && existing.length > 0) {
          accounts = existing;
        }
      } catch (checkErr) {
        console.warn("eth_accounts check error:", checkErr);
      }

      // 2. If not already connected, request connection
      if (accounts.length === 0) {
        try {
          const requested = await eth.request({ method: "eth_requestAccounts" });
          if (Array.isArray(requested) && requested.length > 0) {
            accounts = requested;
          }
        } catch (requestErr: any) {
          console.warn("eth_requestAccounts call error:", requestErr);
          const rawMsg = (
            requestErr?.message ||
            requestErr?.info?.error?.message ||
            requestErr?.shortMessage ||
            ""
          ).toLowerCase();

          // If MetaMask failed with "wallet must has at least one account" or code 4001 without popup:
          // Try fallback via wallet_requestPermissions (EIP-2255) which forces MetaMask to prompt account selection
          if (
            rawMsg.includes("at least one account") ||
            requestErr?.code === 4001 ||
            requestErr?.code === -32603
          ) {
            try {
              console.log("Attempting wallet_requestPermissions fallback...");
              await eth.request({
                method: "wallet_requestPermissions",
                params: [{ eth_accounts: {} }],
              });
              const refreshed = await eth.request({ method: "eth_accounts" });
              if (Array.isArray(refreshed) && refreshed.length > 0) {
                accounts = refreshed;
              } else {
                throw requestErr;
              }
            } catch (permErr: any) {
              console.warn("wallet_requestPermissions fallback failed:", permErr);
              throw requestErr;
            }
          } else {
            throw requestErr;
          }
        }
      }

      if (accounts && accounts.length > 0) {
        const userAddress = accounts[0];
        setAddress(userAddress);

        const browserProvider = new ethers.BrowserProvider(eth);
        setProvider(browserProvider);

        const network = await browserProvider.getNetwork();
        const currentChainId = Number(network.chainId);
        setChainId(currentChainId);

        const currentSigner = await browserProvider.getSigner();
        setSigner(currentSigner);

        await updateBalance(userAddress, browserProvider);
        await resolveEns(userAddress);

        // Auto prompt network switch if not on Sepolia
        if (currentChainId !== SEPOLIA_CHAIN_ID) {
          await switchToSepolia();
        }
      } else {
        setError(
          "MetaMask did not return an active account. Please ensure an account is selected and unlocked in your MetaMask extension."
        );
      }
    } catch (err: any) {
      console.error("Wallet connection failed:", err);
      const rawMsg = (
        err?.message ||
        err?.info?.error?.message ||
        err?.shortMessage ||
        ""
      ).toLowerCase();

      if (
        rawMsg.includes("wallet must has at least one account") ||
        rawMsg.includes("at least one account")
      ) {
        setError(
          "MetaMask account not detected. Please open your MetaMask extension, make sure your account is unlocked, or go to (⋮) > 'Connected sites' and reconnect EtherCanvas."
        );
      } else if (err.code === 4001 || err.action === "ACTION_REJECTED") {
        if (rawMsg.includes("user rejected") || rawMsg.includes("user denied")) {
          setError("Connection request was rejected in MetaMask.");
        } else {
          setError(
            err.message ||
              "Connection request was not approved by MetaMask. Please unlock your account in MetaMask and try again."
          );
        }
      } else if (err.code === -32002) {
        setError(
          "A connection request is already pending in MetaMask. Please open your MetaMask extension icon to approve it."
        );
      } else {
        setError(err.message || "Failed to connect wallet.");
      }
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
    setProvider(null);
    setError(null);
  }, []);

  // Refresh balance manually
  const refreshBalance = useCallback(() => {
    if (address && provider) {
      updateBalance(address, provider);
    }
  }, [address, provider, updateBalance]);

  // Track provider availability & handle async injection
  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateStatus = () => {
      const p = getEthereumProvider();
      setHasProvider(!!p);
    };

    updateStatus();

    window.addEventListener("ethereum#initialized", updateStatus, { once: true });
    return () => {
      window.removeEventListener("ethereum#initialized", updateStatus);
    };
  }, []);

  // Stable refs for listener callbacks to avoid recreating listeners on state changes
  const updateBalanceRef = useRef(updateBalance);
  updateBalanceRef.current = updateBalance;

  const resolveEnsRef = useRef(resolveEns);
  resolveEnsRef.current = resolveEns;

  const disconnectWalletRef = useRef(disconnectWallet);
  disconnectWalletRef.current = disconnectWallet;

  const addressRef = useRef(address);
  addressRef.current = address;

  // Single shared event listener & initial account check
  useEffect(() => {
    const eth = getEthereumProvider();
    if (!eth) return;

    let isMounted = true;

    const handleAccountsChanged = async (accounts: string[]) => {
      if (!isMounted) return;
      if (!accounts || accounts.length === 0) {
        disconnectWalletRef.current();
      } else {
        const newAddress = accounts[0];
        setAddress(newAddress);
        try {
          const browserProvider = new ethers.BrowserProvider(eth);
          setProvider(browserProvider);
          const currentSigner = await browserProvider.getSigner();
          if (isMounted) setSigner(currentSigner);
          const network = await browserProvider.getNetwork();
          if (isMounted) setChainId(Number(network.chainId));
          await updateBalanceRef.current(newAddress, browserProvider);
          await resolveEnsRef.current(newAddress);
        } catch (e) {
          console.warn("Accounts changed handler error:", e);
        }
      }
    };

    const handleChainChanged = async (chainIdHex: string) => {
      if (!isMounted) return;
      const newChainId = parseInt(chainIdHex, 16);
      setChainId(newChainId);
      try {
        const browserProvider = new ethers.BrowserProvider(eth);
        setProvider(browserProvider);
        if (addressRef.current) {
          const currentSigner = await browserProvider.getSigner();
          if (isMounted) setSigner(currentSigner);
          await updateBalanceRef.current(addressRef.current, browserProvider);
        }
      } catch (e) {
        console.warn("Chain changed handler error:", e);
      }
    };

    if (eth.on) {
      eth.on("accountsChanged", handleAccountsChanged);
      eth.on("chainChanged", handleChainChanged);
    }

    // Initial check if already connected
    eth
      .request({ method: "eth_accounts" })
      .then(async (accounts: string[]) => {
        if (!isMounted) return;
        if (accounts && accounts.length > 0) {
          const userAddress = accounts[0];
          const browserProvider = new ethers.BrowserProvider(eth);
          const network = await browserProvider.getNetwork();
          const currentChainId = Number(network.chainId);
          const currentSigner = await browserProvider.getSigner();

          if (isMounted) {
            setAddress(userAddress);
            setChainId(currentChainId);
            setProvider(browserProvider);
            setSigner(currentSigner);
          }

          await updateBalanceRef.current(userAddress, browserProvider);
          await resolveEnsRef.current(userAddress);
        }
      })
      .catch((err: any) => console.warn("Check connected accounts error:", err));

    return () => {
      isMounted = false;
      if (eth?.removeListener) {
        eth.removeListener("accountsChanged", handleAccountsChanged);
        eth.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, [hasProvider]);

  const value: WalletContextType = {
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
    hasProvider,
    isMetaMaskInstalled: hasProvider,
    connectWallet,
    disconnectWallet,
    switchToSepolia,
    refreshBalance,
    clearError,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextType {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
