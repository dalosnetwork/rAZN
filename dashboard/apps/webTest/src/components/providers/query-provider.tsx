"use client";

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { injected } from "wagmi/connectors";
import { base, bscTestnet, mainnet, polygon } from "wagmi/chains";
import { createConfig, http, WagmiProvider } from "wagmi";

type Props = {
  children: ReactNode;
};

const wagmiConfig = createConfig({
  chains: [mainnet, base, polygon, bscTestnet],
  connectors: [injected({ target: "metaMask" }), injected()],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [polygon.id]: http(),
    [bscTestnet.id]: http(),
  },
});

export function QueryProvider({ children }: Props) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
