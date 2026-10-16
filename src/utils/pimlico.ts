import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  encodeFunctionData,
  formatEther,
  Address,
} from "viem";
import { sepolia } from "viem/chains";
import { entryPoint07Address } from "viem/account-abstraction";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { createSmartAccountClient } from "permissionless";
import { toSimpleSmartAccount } from "permissionless/accounts";
import { ethers } from "ethers";
import { ETHERCANVAS_NFT_ABI, SEPOLIA_CONFIG } from "@/contracts/addresses";
import { UserOpExecutionResult, BatchCallInfo } from "@/types";

// Public Sepolia RPC for chain read operations
export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(SEPOLIA_CONFIG.rpcUrls[0]),
});

// Resolves the proxy URL for Pimlico JSON-RPC (keeping API key protected on the server)
export const getPimlicoRpcUrl = (): string => {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/pimlico`;
  }
  return "/api/pimlico";
};

// Pimlico Bundler and Paymaster Client using EntryPoint v0.7
export const createPimlicoSepoliaClient = () => {
  return createPimlicoClient({
    transport: http(getPimlicoRpcUrl()),
    entryPoint: {
      address: entryPoint07Address,
      version: "0.7",
    },
  });
};

/**
 * Creates or connects a SimpleSmartAccount instance for the given connected wallet.
 * Uses the connected user's wallet as the owner without requesting private keys.
 */
export async function getSimpleSmartAccountInstance(
  ownerAddress: string,
  provider: any
) {
  if (!ownerAddress || !provider) {
    throw new Error("Connected wallet provider and owner address are required.");
  }

  // Create viem wallet client wrapping the injected EIP-1193 provider
  const walletClient = createWalletClient({
    account: ownerAddress as Address,
    chain: sepolia,
    transport: custom(provider),
  });

  // SimpleAccount with EntryPoint v0.7
  const simpleAccount = await toSimpleSmartAccount({
    client: publicClient,
    owner: walletClient,
    entryPoint: {
      address: entryPoint07Address,
      version: "0.7",
    },
  });

  return { simpleAccount, walletClient };
}

/**
 * Resolves the deterministic counterfactual Smart Account address for an EOA owner.
 */
export async function resolveSmartAccountAddress(
  ownerAddress: string,
  provider: any
): Promise<string> {
  const { simpleAccount } = await getSimpleSmartAccountInstance(ownerAddress, provider);
  return simpleAccount.address;
}

/**
 * Queries the native Sepolia ETH balance for the specified Smart Account address.
 */
export async function getSmartAccountBalance(
  accountAddress: string
): Promise<{ balanceWei: bigint; balanceEth: string }> {
  try {
    const balanceWei = await publicClient.getBalance({
      address: accountAddress as Address,
    });
    return {
      balanceWei,
      balanceEth: parseFloat(formatEther(balanceWei)).toFixed(4),
    };
  } catch (error) {
    console.warn("Failed to fetch smart account balance:", error);
    return { balanceWei: 0n, balanceEth: "0.0000" };
  }
}

export interface BatchMintParams {
  ownerAddress: string;
  provider: any;
  contractAddress: string;
  firstMint: {
    recipient: string;
    tokenUri: string;
  };
  secondMint: {
    recipient: string;
    tokenUri: string;
  };
  sponsor: boolean;
  onStatusUpdate?: (status: string) => void;
}

/**
 * Submits ONE UserOperation containing TWO calls to the deployed NFT contract.
 * Atomically mints both NFTs in a single ERC-4337 UserOperation.
 */
export async function executeSmartAccountBatchMint({
  ownerAddress,
  provider,
  contractAddress,
  firstMint,
  secondMint,
  sponsor,
  onStatusUpdate,
}: BatchMintParams): Promise<UserOpExecutionResult> {
  if (!ethers.isAddress(contractAddress)) {
    throw new Error(`Invalid EtherCanvas NFT contract address: ${contractAddress}`);
  }
  if (!ethers.isAddress(firstMint.recipient)) {
    throw new Error(`Invalid recipient address for NFT #1: ${firstMint.recipient}`);
  }
  if (!ethers.isAddress(secondMint.recipient)) {
    throw new Error(`Invalid recipient address for NFT #2: ${secondMint.recipient}`);
  }
  if (!firstMint.tokenUri?.trim()) {
    throw new Error("Token URI for NFT #1 cannot be empty.");
  }
  if (!secondMint.tokenUri?.trim()) {
    throw new Error("Token URI for NFT #2 cannot be empty.");
  }

  onStatusUpdate?.("Initializing SimpleAccount on Sepolia...");
  const pimlicoClient = createPimlicoSepoliaClient();
  const { simpleAccount } = await getSimpleSmartAccountInstance(ownerAddress, provider);
  const smartAccountAddress = simpleAccount.address;

  // Encode call #1: mint(recipient1, uri1)
  const callData1 = encodeFunctionData({
    abi: ETHERCANVAS_NFT_ABI,
    functionName: "mint",
    args: [firstMint.recipient as Address, firstMint.tokenUri],
  });

  // Encode call #2: mint(recipient2, uri2)
  const callData2 = encodeFunctionData({
    abi: ETHERCANVAS_NFT_ABI,
    functionName: "mint",
    args: [secondMint.recipient as Address, secondMint.tokenUri],
  });

  const calls = [
    {
      to: contractAddress as Address,
      value: 0n,
      data: callData1,
    },
    {
      to: contractAddress as Address,
      value: 0n,
      data: callData2,
    },
  ];

  // Check balance if self-funded
  if (!sponsor) {
    onStatusUpdate?.("Verifying Smart Account Sepolia balance for self-funded execution...");
    const { balanceWei } = await getSmartAccountBalance(smartAccountAddress);
    if (balanceWei === 0n) {
      throw new Error(
        `Smart Account (${smartAccountAddress}) has 0 SEP balance. For self-funded mode, please send a small amount of Sepolia ETH (e.g. 0.01 SEP) to your smart account address to cover the gas prefund, or switch to Pimlico Paymaster sponsorship.`
      );
    }
  }

  // Create Smart Account Client
  onStatusUpdate?.(
    sponsor
      ? "Configuring Pimlico Paymaster sponsorship..."
      : "Configuring self-funded Smart Account execution..."
  );

  const smartAccountClient = createSmartAccountClient({
    account: simpleAccount,
    chain: sepolia,
    bundlerTransport: http(getPimlicoRpcUrl()),
    paymaster: sponsor ? pimlicoClient : undefined,
    userOperation: {
      estimateFeesPerGas: async () => {
        try {
          const gasPrice = await pimlicoClient.getUserOperationGasPrice();
          return gasPrice.fast;
        } catch (e: any) {
          console.warn("Falling back on standard gas price estimation:", e);
          const feeData = await publicClient.estimateFeesPerGas();
          return {
            maxFeePerGas: feeData.maxFeePerGas ?? 2000000000n,
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? 1000000000n,
          };
        }
      },
    },
  });

  // Prompt user to sign the single UserOperation containing both calls
  onStatusUpdate?.("Please approve the batched UserOperation in your wallet...");

  let userOpHash: string;
  try {
    userOpHash = await smartAccountClient.sendUserOperation({
      calls,
    });
  } catch (err: any) {
    const errMsg = err?.message || String(err);

    // Handle user rejection
    if (
      errMsg.includes("User rejected") ||
      errMsg.includes("User denied") ||
      err?.code === 4001
    ) {
      throw new Error("UserOperation signature was rejected in your wallet.");
    }

    // Handle Paymaster sponsorship rejection
    if (errMsg.includes("paymaster") || errMsg.includes("sponsor") || errMsg.includes("policy")) {
      throw new Error(
        `Pimlico Paymaster rejected sponsorship: ${errMsg}. You can switch to Self-Funded mode to execute using your Smart Account ETH balance.`
      );
    }

    // Handle missing API key proxy error
    if (errMsg.includes("MISSING_PIMLICO_API_KEY") || errMsg.includes("PIMLICO_API_KEY is not configured")) {
      throw new Error(
        "PIMLICO_API_KEY is not configured on the server. Please add PIMLICO_API_KEY to your .env or Vercel Environment Variables."
      );
    }

    throw new Error(`Failed to submit UserOperation: ${errMsg}`);
  }

  // Wait for UserOperation to be bundled and mined on Sepolia
  onStatusUpdate?.(
    `UserOp submitted: ${userOpHash.substring(0, 10)}... Waiting for bundler on Sepolia...`
  );

  const receipt = await pimlicoClient.waitForUserOperationReceipt({
    hash: userOpHash as `0x${string}`,
  });

  const txHash = receipt.receipt.transactionHash;
  const blockNumber = Number(receipt.receipt.blockNumber);
  const actualGasUsed = receipt.actualGasUsed ? receipt.actualGasUsed.toString() : undefined;
  const actualGasCost = receipt.actualGasCost
    ? formatEther(receipt.actualGasCost)
    : undefined;

  // Extract both minted token IDs from receipt logs using contract interface
  const nftInterface = new ethers.Interface(ETHERCANVAS_NFT_ABI);
  const tokenIds: number[] = [];

  if (receipt.receipt.logs && Array.isArray(receipt.receipt.logs)) {
    for (const log of receipt.receipt.logs) {
      try {
        const parsed = nftInterface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });
        if (parsed && parsed.name === "Minted") {
          tokenIds.push(Number(parsed.args.tokenId));
        }
      } catch {
        // Ignore logs from EntryPoint or other contracts
      }
    }
  }

  return {
    userOpHash,
    transactionHash: txHash,
    blockNumber,
    smartAccountAddress,
    ownerAddress,
    sponsored: sponsor,
    actualGasUsed,
    actualGasCostSep: actualGasCost,
    tokenIds,
    mintedUris: [firstMint.tokenUri, secondMint.tokenUri],
    etherscanTxUrl: `https://sepolia.etherscan.io/tx/${txHash}`,
    entryPointAddress: entryPoint07Address,
    timestamp: Date.now(),
  };
}

/**
 * Builds inspection details for the two calls in the batch.
 */
export function buildBatchCallPreviews(
  contractAddress: string,
  recipient1: string,
  uri1: string,
  recipient2: string,
  uri2: string
): BatchCallInfo[] {
  const nftInterface = new ethers.Interface(ETHERCANVAS_NFT_ABI);

  const callData1 = recipient1 && uri1 && ethers.isAddress(recipient1)
    ? nftInterface.encodeFunctionData("mint", [recipient1, uri1])
    : "0x (Awaiting valid recipient & URI)";

  const callData2 = recipient2 && uri2 && ethers.isAddress(recipient2)
    ? nftInterface.encodeFunctionData("mint", [recipient2, uri2])
    : "0x (Awaiting valid recipient & URI)";

  return [
    {
      callIndex: 1,
      targetContract: contractAddress,
      recipient: recipient1,
      tokenUri: uri1,
      functionSignature: "mint(address to, string memory uri)",
      callData: callData1,
    },
    {
      callIndex: 2,
      targetContract: contractAddress,
      recipient: recipient2,
      tokenUri: uri2,
      functionSignature: "mint(address to, string memory uri)",
      callData: callData2,
    },
  ];
}
