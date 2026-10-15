import { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import {
  CHAINLINK_ETH_USD_SEPOLIA_ADDRESS,
  CHAINLINK_AGGREGATOR_V3_ABI,
  SEPOLIA_CONFIG,
} from "@/contracts/addresses";
import { ChainlinkPriceData } from "@/types";

export function useChainlinkPrice() {
  const [data, setData] = useState<ChainlinkPriceData>({
    price: 0,
    formattedPrice: "—",
    roundId: "0",
    updatedAt: 0,
    updateAgeSeconds: 0,
    isStale: false,
    decimals: 8,
    loading: true,
    error: null,
    lastFetchedAt: null,
  });

  const updatedAtRef = useRef<number>(0);

  const fetchPrice = useCallback(async () => {
    try {
      setData((prev) => ({ ...prev, loading: true, error: null }));

      // Use public Sepolia RPC fallback for guaranteed access even without MetaMask
      let rpcUrl = SEPOLIA_CONFIG.rpcUrls[0];
      const provider = new ethers.JsonRpcProvider(rpcUrl);

      const aggregator = new ethers.Contract(
        CHAINLINK_ETH_USD_SEPOLIA_ADDRESS,
        CHAINLINK_AGGREGATOR_V3_ABI,
        provider
      );

      const [decimalsBN, roundData] = await Promise.all([
        aggregator.decimals(),
        aggregator.latestRoundData(),
      ]);

      const decimals = Number(decimalsBN);
      const answer = roundData.answer;
      const roundId = roundData.roundId.toString();
      const updatedAt = Number(roundData.updatedAt);
      const answeredInRound = roundData.answeredInRound;

      updatedAtRef.current = updatedAt;

      // Price calculation: answer / 10^decimals
      const rawPrice = Number(answer) / Math.pow(10, decimals);
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(rawPrice);

      const now = Math.floor(Date.now() / 1000);
      const age = Math.max(0, now - updatedAt);

      // Chainlink stale criteria: older than 3600 seconds or incomplete round
      const isStale = age > 3600 || answeredInRound < roundData.roundId;

      setData({
        price: rawPrice,
        formattedPrice: formatted,
        roundId,
        updatedAt,
        updateAgeSeconds: age,
        isStale,
        decimals,
        loading: false,
        error: null,
        lastFetchedAt: new Date(),
      });
    } catch (err: any) {
      console.error("Chainlink fetch error:", err);
      setData((prev) => ({
        ...prev,
        loading: false,
        error: err.message || "Failed to query Chainlink ETH/USD Sepolia feed.",
      }));
    }
  }, []);

  // Set up 15-second automatic refresh and proper cleanup
  useEffect(() => {
    fetchPrice();

    const refreshInterval = setInterval(() => {
      fetchPrice();
    }, 15000);

    // 1-second interval to keep the "age in seconds" counter active
    const ageInterval = setInterval(() => {
      if (updatedAtRef.current > 0) {
        const now = Math.floor(Date.now() / 1000);
        const currentAge = Math.max(0, now - updatedAtRef.current);
        setData((prev) => ({
          ...prev,
          updateAgeSeconds: currentAge,
          isStale: currentAge > 3600,
        }));
      }
    }, 1000);

    return () => {
      clearInterval(refreshInterval);
      clearInterval(ageInterval);
    };
  }, [fetchPrice]);

  return {
    ...data,
    refresh: fetchPrice,
  };
}
