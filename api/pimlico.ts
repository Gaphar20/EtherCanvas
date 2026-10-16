/**
 * Vercel Serverless Function: /api/pimlico
 * 
 * Secure, narrowly scoped JSON-RPC proxy for Pimlico Account Abstraction services on Sepolia.
 * 
 * Security Guardrails:
 * 1. PIMLICO_API_KEY is read strictly server-side from process.env and never exposed to the client bundle.
 * 2. The upstream endpoint is hard-pinned to Pimlico's Sepolia RPC service.
 * 3. Only an explicit whitelist of ERC-4337 Bundler, Paymaster, and Gas Estimation RPC methods is permitted.
 * 4. Arbitrary RPC forwarding, target overrides, and unsupported methods are strictly rejected.
 */

// Whitelist of required ERC-4337 and Pimlico JSON-RPC methods
const ALLOWED_METHODS = new Set<string>([
  // ERC-4337 Standard Bundler Methods
  "eth_sendUserOperation",
  "eth_estimateUserOperationGas",
  "eth_getUserOperationByHash",
  "eth_getUserOperationReceipt",
  "eth_supportedEntryPoints",
  "eth_chainId",
  "eth_blockNumber",

  // Pimlico Paymaster Methods (ERC-4337 v0.7 and v0.6)
  "pm_sponsorUserOperation",
  "pm_getPaymasterData",
  "pm_getPaymasterStubData",

  // Pimlico Gas Estimation and Status Methods
  "pimlico_getUserOperationGasPrice",
  "pimlico_getUserOperationStatus",
]);

interface JsonRpcRequest {
  jsonrpc?: string;
  method?: string;
  params?: any[];
  id?: string | number | null;
}

export default async function handler(req: any, res: any) {
  // 1. CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,POST"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  // Handle preflight OPTIONS
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Only POST is allowed for JSON-RPC
  if (req.method !== "POST") {
    return res.status(405).json({
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32600,
        message: "Invalid Request. Only POST method is allowed for JSON-RPC.",
      },
    });
  }

  // 2. Validate Server Environment Configuration
  const pimlicoApiKey = process.env.PIMLICO_API_KEY?.trim();
  if (!pimlicoApiKey) {
    return res.status(500).json({
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32000,
        message:
          "PIMLICO_API_KEY is not configured on the server. Please add PIMLICO_API_KEY to your Vercel Environment Variables or local .env file.",
        data: { code: "MISSING_PIMLICO_API_KEY" },
      },
    });
  }

  // 3. Parse and inspect JSON-RPC request body
  let body: any = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32700,
          message: "Parse error. Invalid JSON payload received.",
        },
      });
    }
  }

  if (!body) {
    return res.status(400).json({
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32600,
        message: "Invalid Request: Empty JSON-RPC payload.",
      },
    });
  }

  // Handle both single requests and batch JSON-RPC requests
  const isBatch = Array.isArray(body);
  const requests: JsonRpcRequest[] = isBatch ? body : [body];

  if (requests.length === 0) {
    return res.status(400).json({
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32600,
        message: "Invalid Request: Batch payload is empty.",
      },
    });
  }

  // 4. Validate all methods against our strict whitelist
  for (const rpcReq of requests) {
    const method = rpcReq?.method;
    if (!method || typeof method !== "string") {
      return res.status(400).json({
        jsonrpc: "2.0",
        id: rpcReq?.id ?? null,
        error: {
          code: -32600,
          message: "Invalid Request: Missing 'method' field.",
        },
      });
    }

    if (!ALLOWED_METHODS.has(method)) {
      console.warn(`[Pimlico Proxy] Blocked unauthorized RPC method: ${method}`);
      return res.status(403).json({
        jsonrpc: "2.0",
        id: rpcReq?.id ?? null,
        error: {
          code: -32601,
          message: `Method '${method}' is not allowed by the EtherCanvas Pimlico proxy.`,
        },
      });
    }
  }

  // 5. Proxy to Pimlico Sepolia endpoint
  const pimlicoSepoliaUrl = `https://api.pimlico.io/v2/sepolia/rpc?apikey=${pimlicoApiKey}`;

  try {
    const upstreamResponse = await fetch(pimlicoSepoliaUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const responseData = await upstreamResponse.json().catch(async () => {
      const text = await upstreamResponse.text();
      return {
        jsonrpc: "2.0",
        id: isBatch ? null : requests[0]?.id ?? null,
        error: {
          code: -32603,
          message: `Upstream Pimlico returned non-JSON response (${upstreamResponse.status}): ${text}`,
        },
      };
    });

    return res.status(upstreamResponse.status).json(responseData);
  } catch (error: any) {
    console.error("[Pimlico Proxy] Upstream communication failed:", error);
    return res.status(502).json({
      jsonrpc: "2.0",
      id: isBatch ? null : requests[0]?.id ?? null,
      error: {
        code: -32603,
        message: `Internal proxy error connecting to Pimlico: ${error.message || error}`,
      },
    });
  }
}
