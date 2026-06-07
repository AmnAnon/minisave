"use client";

import { useMemo } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { targetChain } from "./chains";

export function useChainGuard() {
  const { chain } = useAccount();
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();

  const isWrongChain = Boolean(chain && chain.id !== targetChain.id);

  const message = useMemo(() => {
    if (!chain) return `Connect your wallet on ${targetChain.name} to continue.`;
    if (!isWrongChain) return "";
    return `Wrong network detected. Switch to ${targetChain.name} to continue.`;
  }, [chain, isWrongChain]);

  async function promptSwitchChain() {
    if (!isWrongChain) return;
    await switchChainAsync({ chainId: targetChain.id });
  }

  return {
    currentChain: chain,
    isWrongChain,
    isSwitchingChain,
    message,
    promptSwitchChain,
    targetChain,
  };
}
