import assert from "node:assert/strict";
import { test } from "node:test";

import { fetchErc20TotalSupply, formatRawTokenAmount } from "./erc20-supply";

test("formatRawTokenAmount formats decimals and trims trailing zeros", () => {
  assert.equal(formatRawTokenAmount(123450000n, 4), "12345");
  assert.equal(formatRawTokenAmount(123456789n, 6), "123.456789");
  assert.equal(formatRawTokenAmount(1200000n, 6), "1.2");
});

test("fetchErc20TotalSupply calls totalSupply and decimals using eth_call", async () => {
  const calls: Array<{ data: string; to: string }> = [];

  const fetchImpl: typeof fetch = async (_input, init) => {
    const bodyText = typeof init?.body === "string" ? init.body : "";
    const payload = JSON.parse(bodyText) as {
      params?: Array<{ to?: string; data?: string }>;
    };

    const call = payload.params?.[0];
    calls.push({
      data: call?.data ?? "",
      to: call?.to ?? "",
    });

    const result =
      call?.data === "0x18160ddd"
        ? "0x1121d33597384000" // 1.2345e18
        : "0x12"; // 18

    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        result,
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      },
    );
  };

  const result = await fetchErc20TotalSupply({
    rpcUrl: "https://example-rpc.local",
    contractAddress: "0xb11fc1e75b837e1719565271ba4ba5b6b2e794fe",
    fetchImpl,
  });

  assert.deepEqual(
    calls.map((entry) => entry.data),
    ["0x18160ddd", "0x313ce567"],
  );
  assert.equal(result.decimals, 18);
  assert.equal(result.rawTotalSupply, "1234500000000000000");
  assert.equal(result.totalSupply, "1.2345");
});

test("fetchErc20TotalSupply throws on RPC error payload", async () => {
  const fetchImpl: typeof fetch = async () =>
    new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        error: {
          code: -32000,
          message: "execution reverted",
        },
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      },
    );

  await assert.rejects(
    () =>
      fetchErc20TotalSupply({
        rpcUrl: "https://example-rpc.local",
        contractAddress: "0xb11fc1e75b837e1719565271ba4ba5b6b2e794fe",
        fetchImpl,
      }),
    /execution reverted/,
  );
});

