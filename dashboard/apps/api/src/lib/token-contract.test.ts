import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  encodeFunctionData,
  getAddress,
  parseUnits,
  type Address,
  type Hex,
} from "viem";

import {
  __resetTokenContractRuntimeForTests,
  __setTokenContractRuntimeForTests,
  verifyMintApprovalTx,
  verifyRedeemApprovalTx,
} from "./token-contract";

const TOKEN_ADDRESS = getAddress("0xb11fc1e75b837e1719565271ba4ba5b6b2e794fe");
const ADMIN_ADDRESS = getAddress("0x1111111111111111111111111111111111111111");
const USER_ADDRESS = getAddress("0x2222222222222222222222222222222222222222");
const TX_HASH = `0x${"a".repeat(64)}` as Hex;

afterEach(() => {
  __resetTokenContractRuntimeForTests();
});

function setRuntime(input: {
  txData: Hex;
  from?: Address;
  chainId?: number;
  redeemFunction?: "burnFrom" | "burn" | "redeem";
  receiptStatus?: "success" | "reverted";
  blockNumber?: bigint;
  decimals?: number;
}) {
  __setTokenContractRuntimeForTests({
    tokenAddress: TOKEN_ADDRESS,
    redeemFunction: input.redeemFunction ?? "burnFrom",
    confirmations: 1,
    timeoutMs: 10_000,
    expectedChainId: 97,
    publicClient: {
      getTransaction: async () =>
        ({
          chainId: input.chainId ?? 97,
          to: TOKEN_ADDRESS,
          from: input.from ?? ADMIN_ADDRESS,
          input: input.txData,
        }) as never,
      waitForTransactionReceipt: async () =>
        ({
          status: input.receiptStatus ?? "success",
          blockNumber: input.blockNumber ?? 123n,
        }) as never,
      readContract: async () => BigInt(input.decimals ?? 18),
    } as never,
  });
}

test("verifyMintApprovalTx succeeds for matching mint tx", async () => {
  const amount = parseUnits("12.5", 18);
  const txData = encodeFunctionData({
    abi: [
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
    ] as const,
    functionName: "mint",
    args: [USER_ADDRESS, amount],
  });
  setRuntime({ txData });

  const result = await verifyMintApprovalTx({
    txHash: TX_HASH,
    recipientAddress: USER_ADDRESS,
    amount: "12.5",
    adminWalletAddress: ADMIN_ADDRESS,
    chainId: 97,
  });

  assert.equal(result.functionName, "mint");
  assert.equal(result.from, ADMIN_ADDRESS);
  assert.equal(result.blockNumber, 123n);
  assert.equal(result.txHash, TX_HASH);
});

test("verifyMintApprovalTx fails when tx sender is not admin wallet", async () => {
  const txData = encodeFunctionData({
    abi: [
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
    ] as const,
    functionName: "mint",
    args: [USER_ADDRESS, parseUnits("1", 18)],
  });
  setRuntime({
    txData,
    from: getAddress("0x3333333333333333333333333333333333333333"),
  });

  await assert.rejects(
    () =>
      verifyMintApprovalTx({
        txHash: TX_HASH,
        recipientAddress: USER_ADDRESS,
        amount: "1",
        adminWalletAddress: ADMIN_ADDRESS,
        chainId: 97,
      }),
    /tx sender does not match admin wallet/,
  );
});

test("verifyRedeemApprovalTx succeeds for burnFrom flow", async () => {
  const amount = parseUnits("5", 18);
  const txData = encodeFunctionData({
    abi: [
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
    ] as const,
    functionName: "burnFrom",
    args: [USER_ADDRESS, amount],
  });
  setRuntime({ txData, redeemFunction: "burnFrom" });

  const result = await verifyRedeemApprovalTx({
    txHash: TX_HASH,
    holderAddress: USER_ADDRESS,
    amount: "5",
    adminWalletAddress: ADMIN_ADDRESS,
    chainId: 97,
  });

  assert.equal(result.functionName, "burnFrom");
  assert.equal(result.from, ADMIN_ADDRESS);
});
