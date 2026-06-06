"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function ConnectButton() {
  const [isMiniPay, setIsMiniPay] = useState(false);
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum?.isMiniPay) {
      setIsMiniPay(true);
    }
  }, []);

  if (isMiniPay) {
    return null;
  }

  if (isConnected && address) {
    return (
      <Button variant="outline" onClick={() => disconnect()}>
        {truncateAddress(address)}
      </Button>
    );
  }

  return (
    <Button onClick={() => connectors[0] && connect({ connector: connectors[0] })} disabled={isPending}>
      {isPending ? "Connecting..." : "Connect Wallet"}
    </Button>
  );
}
