"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { WagmiProvider, createConfig, http, injected, useConnect } from "wagmi";
import { supportedChains } from "@/lib/chains";

const [mainnetChain, sepoliaChain] = supportedChains;

const wagmiConfig = createConfig({
  chains: [...supportedChains],
  connectors: [injected()],
  transports: {
    [mainnetChain.id]: http(mainnetChain.rpcUrls.default.http[0]),
    [sepoliaChain.id]: http(sepoliaChain.rpcUrls.default.http[0]),
  },
  ssr: true,
});

const queryClient = new QueryClient();

function WalletProviderInner({ children }: { children: React.ReactNode }) {
  const { connect, connectors } = useConnect();
  const [attemptedMiniPayConnect, setAttemptedMiniPayConnect] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || attemptedMiniPayConnect) return;

    const isMiniPay = Boolean(window.ethereum && (window.ethereum as { isMiniPay?: boolean }).isMiniPay);
    if (!isMiniPay) return;

    const injectedConnector = connectors[0];
    if (injectedConnector) {
      connect({ connector: injectedConnector });
      setAttemptedMiniPayConnect(true);
    }
  }, [attemptedMiniPayConnect, connect, connectors]);

  return <>{children}</>;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const client = useMemo(() => queryClient, []);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={client}>
        <WalletProviderInner>{children}</WalletProviderInner>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
