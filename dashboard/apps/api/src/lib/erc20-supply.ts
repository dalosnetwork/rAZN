import { getAddress, isAddress } from "viem";

const JSON_RPC_VERSION = "2.0";
const TOTAL_SUPPLY_METHOD_ID = "0x18160ddd";
const DECIMALS_METHOD_ID = "0x313ce567";

export const DEFAULT_BSC_TESTNET_RPC_URL =
  "https://data-seed-prebsc-1-s1.binance.org:8545";
export const DEFAULT_BSC_TOKEN_CONTRACT_ADDRESS =
  "0xb11fc1e75b837e1719565271ba4ba5b6b2e794fe";

type EthCallResponse =
  | {
      jsonrpc: string;
      id: number;
      result: string;
    }
  | {
      jsonrpc: string;
      id: number;
      error: {
        code: number;
        message: string;
        data?: unknown;
      };
    };

export type FetchErc20TotalSupplyInput = {
  rpcUrl: string;
  contractAddress: string;
  fetchImpl?: typeof fetch;
};

export type Erc20TotalSupplyResult = {
  rpcUrl: string;
  contractAddress: string;
  rawTotalSupply: string;
  decimals: number;
  totalSupply: string;
};

function assertHexString(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]+$/.test(value)) {
    throw new Error(`Invalid ${field} hex response`);
  }
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

function parseHexToBigInt(hexValue: string, field: string) {
  assertHexString(hexValue, field);
  return BigInt(hexValue);
}

async function ethCall(input: {
  rpcUrl: string;
  contractAddress: string;
  data: string;
  fetchImpl: typeof fetch;
  id: number;
}) {
  const response = await input.fetchImpl(input.rpcUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: JSON_RPC_VERSION,
      id: input.id,
      method: "eth_call",
      params: [
        {
          to: input.contractAddress,
          data: input.data,
        },
        "latest",
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`RPC request failed with HTTP ${response.status}`);
  }

  const payload = (await response.json()) as EthCallResponse;
  if ("error" in payload) {
    throw new Error(`RPC eth_call failed: ${payload.error.message}`);
  }

  assertHexString(payload.result, "eth_call");
  return payload.result;
}

export function formatRawTokenAmount(rawAmount: bigint, decimals: number) {
  if (decimals < 0) {
    throw new Error("decimals must be non-negative");
  }

  if (decimals === 0) {
    return rawAmount.toString();
  }

  const base = 10n ** BigInt(decimals);
  const whole = rawAmount / base;
  const fraction = rawAmount % base;

  if (fraction === 0n) {
    return whole.toString();
  }

  const fractionString = fraction
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, "");

  return `${whole.toString()}.${fractionString}`;
}

export async function fetchErc20TotalSupply(
  input: FetchErc20TotalSupplyInput,
): Promise<Erc20TotalSupplyResult> {
  if (!isAddress(input.contractAddress)) {
    throw new Error("contractAddress is invalid");
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  const contractAddress = getAddress(input.contractAddress);

  const totalSupplyHex = await ethCall({
    rpcUrl: input.rpcUrl,
    contractAddress,
    data: TOTAL_SUPPLY_METHOD_ID,
    fetchImpl,
    id: 1,
  });

  const decimalsHex = await ethCall({
    rpcUrl: input.rpcUrl,
    contractAddress,
    data: DECIMALS_METHOD_ID,
    fetchImpl,
    id: 2,
  });

  const totalSupplyRaw = parseHexToBigInt(totalSupplyHex, "totalSupply");
  const decimalsRaw = parseHexToBigInt(decimalsHex, "decimals");
  if (decimalsRaw > 255n) {
    throw new Error("decimals response is out of uint8 bounds");
  }

  const decimals = Number(decimalsRaw);
  const totalSupply = formatRawTokenAmount(totalSupplyRaw, decimals);

  return {
    rpcUrl: input.rpcUrl,
    contractAddress,
    rawTotalSupply: totalSupplyRaw.toString(),
    decimals,
    totalSupply,
  };
}

export function getErc20SupplyRuntimeConfig() {
  const rpcUrl = process.env.BSC_TESTNET_RPC_URL ?? DEFAULT_BSC_TESTNET_RPC_URL;
  const contractAddress =
    process.env.BSC_TOKEN_CONTRACT_ADDRESS ??
    DEFAULT_BSC_TOKEN_CONTRACT_ADDRESS;
  if (!isAddress(contractAddress)) {
    throw new Error("BSC_TOKEN_CONTRACT_ADDRESS is invalid");
  }

  return {
    rpcUrl,
    contractAddress: getAddress(contractAddress),
    intervalMinutes: parsePositiveInteger(
      process.env.RESERVE_SNAPSHOT_INTERVAL_MINUTES,
      1,
      "RESERVE_SNAPSHOT_INTERVAL_MINUTES",
    ),
  };
}

