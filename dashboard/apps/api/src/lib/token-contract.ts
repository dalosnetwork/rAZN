import {
  decodeFunctionData,
  createPublicClient,
  getAddress,
  http,
  isAddress,
  parseUnits,
  type Address,
  type Hex,
} from "viem";
import { bscTestnet } from "viem/chains";

const DEFAULT_TOKEN_CONTRACT_ADDRESS =
  "0xb11fc1e75b837e1719565271ba4ba5b6b2e794fe";
const DEFAULT_BSC_TESTNET_RPC_URL =
  "https://data-seed-prebsc-1-s1.binance.org:8545";

const tokenAbi = [
  {
    type: "function",
    stateMutability: "view",
    name: "decimals",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "mint",
    inputs: [
      { type: "address" },
      { type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "burn",
    inputs: [{ type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "burnFrom",
    inputs: [
      { type: "address" },
      { type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "redeem",
    inputs: [
      { type: "address" },
      { type: "uint256" },
    ],
    outputs: [],
  },
] as const;

type RedeemFunctionName = "burnFrom" | "burn" | "redeem";

type RuntimePublicClient = Pick<
  ReturnType<typeof createPublicClient>,
  "readContract" | "getTransaction" | "waitForTransactionReceipt"
>;

type Runtime = {
  tokenAddress: Address;
  publicClient: RuntimePublicClient;
  redeemFunction: RedeemFunctionName;
  confirmations: number;
  timeoutMs: number;
  expectedChainId: number;
};

export type VerifiedOnChainExecution = {
  txHash: Hex;
  blockNumber: bigint;
  from: Address;
  functionName: string;
};

let runtimeCache: Runtime | null = null;
let decimalsCache: number | null = null;

export function __resetTokenContractRuntimeForTests() {
  runtimeCache = null;
  decimalsCache = null;
}

export function __setTokenContractRuntimeForTests(runtime: Runtime) {
  runtimeCache = runtime;
  decimalsCache = null;
}

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
  field: string,
) {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(`Invalid ${field}`);
  }
  return parsed;
}

function getRuntime() {
  if (runtimeCache) {
    return runtimeCache;
  }

  const tokenAddressRaw =
    process.env.BSC_TOKEN_CONTRACT_ADDRESS ?? DEFAULT_TOKEN_CONTRACT_ADDRESS;
  if (!isAddress(tokenAddressRaw)) {
    throw new Error("BSC_TOKEN_CONTRACT_ADDRESS is invalid");
  }

  const redeemFunctionRaw = (
    process.env.BSC_TOKEN_REDEEM_FUNCTION ?? "burnFrom"
  ).trim() as RedeemFunctionName;
  if (
    redeemFunctionRaw !== "burnFrom" &&
    redeemFunctionRaw !== "burn" &&
    redeemFunctionRaw !== "redeem"
  ) {
    throw new Error(
      "BSC_TOKEN_REDEEM_FUNCTION is invalid (supported: burnFrom, burn, redeem)",
    );
  }

  const rpcUrl = process.env.BSC_TESTNET_RPC_URL ?? DEFAULT_BSC_TESTNET_RPC_URL;
  const transport = http(rpcUrl);
  const publicClient = createPublicClient({
    chain: bscTestnet,
    transport,
  });

  runtimeCache = {
    tokenAddress: getAddress(tokenAddressRaw),
    publicClient,
    redeemFunction: redeemFunctionRaw,
    confirmations: parsePositiveInteger(
      process.env.BSC_TX_CONFIRMATIONS,
      1,
      "BSC_TX_CONFIRMATIONS",
    ),
    timeoutMs: parsePositiveInteger(
      process.env.BSC_TX_TIMEOUT_MS,
      120_000,
      "BSC_TX_TIMEOUT_MS",
    ),
    expectedChainId: parsePositiveInteger(
      process.env.BSC_CHAIN_ID,
      bscTestnet.id,
      "BSC_CHAIN_ID",
    ),
  };

  return runtimeCache;
}

function asHexTransactionHash(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!/^0x[0-9a-f]{64}$/.test(normalized)) {
    throw new Error("txHash is invalid");
  }
  return normalized as Hex;
}

function parseAmountString(amount: string | number) {
  if (typeof amount === "number") {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error("amount must be a positive number");
    }
    return amount.toString();
  }

  const normalized = amount.trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error("amount must be a positive decimal string");
  }
  return normalized;
}

export function isAddressLike(value: string | null | undefined) {
  if (!value) {
    return false;
  }
  return isAddress(value.trim());
}

export function toChecksumAddress(value: string) {
  return getAddress(value.trim());
}

async function getTokenDecimals(runtime: Runtime) {
  if (decimalsCache !== null) {
    return decimalsCache;
  }
  const decimals = await runtime.publicClient.readContract({
    address: runtime.tokenAddress,
    abi: tokenAbi,
    functionName: "decimals",
  });
  decimalsCache = Number(decimals);
  return decimalsCache;
}

async function getVerifiedTransaction(input: {
  txHash: string;
  expectedFrom?: string;
  expectedChainId?: number;
}): Promise<
  VerifiedOnChainExecution & {
    inputData: Hex;
  }
> {
  const runtime = getRuntime();
  const txHash = asHexTransactionHash(input.txHash);
  const expectedChainId = input.expectedChainId ?? runtime.expectedChainId;

  const tx = await runtime.publicClient.getTransaction({ hash: txHash });
  if (Number(tx.chainId) !== expectedChainId) {
    throw new Error(`txHash is not on expected chainId ${expectedChainId}`);
  }
  if (!tx.to || getAddress(tx.to) !== runtime.tokenAddress) {
    throw new Error("txHash target contract does not match token proxy");
  }

  const from = getAddress(tx.from);
  if (input.expectedFrom) {
    if (!isAddress(input.expectedFrom)) {
      throw new Error("adminWalletAddress is invalid");
    }
    if (from !== getAddress(input.expectedFrom)) {
      throw new Error("tx sender does not match admin wallet");
    }
  }

  const receipt = await runtime.publicClient.waitForTransactionReceipt({
    hash: txHash,
    confirmations: runtime.confirmations,
    timeout: runtime.timeoutMs,
  });
  if (receipt.status !== "success") {
    throw new Error("transaction reverted on-chain");
  }

  return {
    txHash,
    blockNumber: receipt.blockNumber,
    from,
    functionName: "",
    inputData: tx.input,
  };
}

export async function verifyMintApprovalTx(input: {
  txHash: string;
  recipientAddress: string;
  amount: string | number;
  adminWalletAddress?: string;
  chainId?: number;
}): Promise<VerifiedOnChainExecution> {
  const runtime = getRuntime();
  if (!isAddressLike(input.recipientAddress)) {
    throw new Error("recipientAddress is invalid");
  }

  const verifiedTx = await getVerifiedTransaction({
    txHash: input.txHash,
    expectedFrom: input.adminWalletAddress,
    expectedChainId: input.chainId,
  });

  const decoded = decodeFunctionData({
    abi: tokenAbi,
    data: verifiedTx.inputData,
  });
  if (decoded.functionName !== "mint") {
    throw new Error("tx function is not mint");
  }

  const recipient = getAddress(decoded.args[0] as Address);
  const decimals = await getTokenDecimals(runtime);
  const expectedAmount = parseUnits(parseAmountString(input.amount), decimals);
  const txAmount = decoded.args[1] as bigint;

  if (recipient !== getAddress(input.recipientAddress)) {
    throw new Error("tx mint recipient does not match request");
  }
  if (txAmount !== expectedAmount) {
    throw new Error("tx mint amount does not match request");
  }

  return {
    txHash: verifiedTx.txHash,
    blockNumber: verifiedTx.blockNumber,
    from: verifiedTx.from,
    functionName: "mint",
  };
}

export async function verifyRedeemApprovalTx(input: {
  txHash: string;
  holderAddress: string;
  amount: string | number;
  adminWalletAddress?: string;
  chainId?: number;
}): Promise<VerifiedOnChainExecution> {
  const runtime = getRuntime();
  if (!isAddressLike(input.holderAddress)) {
    throw new Error("holderAddress is invalid");
  }

  const verifiedTx = await getVerifiedTransaction({
    txHash: input.txHash,
    expectedFrom: input.adminWalletAddress,
    expectedChainId: input.chainId,
  });

  const decoded = decodeFunctionData({
    abi: tokenAbi,
    data: verifiedTx.inputData,
  });

  const decimals = await getTokenDecimals(runtime);
  const expectedAmount = parseUnits(parseAmountString(input.amount), decimals);

  if (runtime.redeemFunction === "burnFrom") {
    if (decoded.functionName !== "burnFrom") {
      throw new Error("tx function is not burnFrom");
    }
    const holder = getAddress(decoded.args[0] as Address);
    const txAmount = decoded.args[1] as bigint;
    if (holder !== getAddress(input.holderAddress)) {
      throw new Error("tx burnFrom address does not match request");
    }
    if (txAmount !== expectedAmount) {
      throw new Error("tx burnFrom amount does not match request");
    }
  } else if (runtime.redeemFunction === "burn") {
    if (decoded.functionName !== "burn") {
      throw new Error("tx function is not burn");
    }
    const txAmount = decoded.args[0] as bigint;
    if (txAmount !== expectedAmount) {
      throw new Error("tx burn amount does not match request");
    }
  } else {
    if (decoded.functionName !== "redeem") {
      throw new Error("tx function is not redeem");
    }
    const holder = getAddress(decoded.args[0] as Address);
    const txAmount = decoded.args[1] as bigint;
    if (holder !== getAddress(input.holderAddress)) {
      throw new Error("tx redeem address does not match request");
    }
    if (txAmount !== expectedAmount) {
      throw new Error("tx redeem amount does not match request");
    }
  }

  return {
    txHash: verifiedTx.txHash,
    blockNumber: verifiedTx.blockNumber,
    from: verifiedTx.from,
    functionName: decoded.functionName,
  };
}
