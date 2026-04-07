import {
  getAddress,
  isAddress,
  parseUnits,
  type Address,
  type PublicClient,
} from "viem";

const DEFAULT_TOKEN_CONTRACT_ADDRESS =
  "0xb11fc1e75b837e1719565271ba4ba5b6b2e794fe";
const DEFAULT_CHAIN_ID = 97;

export type RedeemFunctionName = "burnFrom" | "burn" | "redeem";

export const tokenAbi = [
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

function normalizeAmountString(amount: string | number) {
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

export function getTokenChainId() {
  return parsePositiveInteger(
    process.env.NEXT_PUBLIC_BSC_CHAIN_ID,
    DEFAULT_CHAIN_ID,
    "NEXT_PUBLIC_BSC_CHAIN_ID",
  );
}

export function getTokenContractAddress() {
  const tokenAddressRaw =
    process.env.NEXT_PUBLIC_BSC_TOKEN_CONTRACT_ADDRESS ??
    DEFAULT_TOKEN_CONTRACT_ADDRESS;
  if (!isAddress(tokenAddressRaw)) {
    throw new Error("NEXT_PUBLIC_BSC_TOKEN_CONTRACT_ADDRESS is invalid");
  }
  return getAddress(tokenAddressRaw);
}

export function getRedeemFunctionName(): RedeemFunctionName {
  const redeemFunctionRaw = (
    process.env.NEXT_PUBLIC_BSC_TOKEN_REDEEM_FUNCTION ?? "burnFrom"
  ).trim() as RedeemFunctionName;
  if (
    redeemFunctionRaw !== "burnFrom" &&
    redeemFunctionRaw !== "burn" &&
    redeemFunctionRaw !== "redeem"
  ) {
    throw new Error(
      "NEXT_PUBLIC_BSC_TOKEN_REDEEM_FUNCTION is invalid (supported: burnFrom, burn, redeem)",
    );
  }
  return redeemFunctionRaw;
}

export function toChecksumAddress(address: string, fieldName = "address") {
  if (!isAddress(address)) {
    throw new Error(`${fieldName} is invalid`);
  }
  return getAddress(address);
}

export async function toTokenUnits(input: {
  publicClient: PublicClient;
  tokenAddress: Address;
  amount: string | number;
}) {
  const amount = normalizeAmountString(input.amount);
  const decimals = await input.publicClient.readContract({
    address: input.tokenAddress,
    abi: tokenAbi,
    functionName: "decimals",
  });
  return parseUnits(amount, Number(decimals));
}
