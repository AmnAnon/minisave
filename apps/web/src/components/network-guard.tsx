"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChainGuard } from "@/lib/use-chain-guard";

export function NetworkGuard() {
  const { isWrongChain, isSwitchingChain, promptSwitchChain, targetChain } = useChainGuard();

  if (!isWrongChain) return null;

  return (
    <div className="flex w-full items-center justify-between gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm">
      <div className="flex items-center gap-2 text-red-100 font-mono">
        <AlertTriangle className="h-4 w-4 shrink-0 text-red-300" />
        <span>Wrong network</span>
      </div>
      <Button
        onClick={() => promptSwitchChain()}
        disabled={isSwitchingChain}
        size="sm"
        className="h-8 bg-red-500/20 px-3 text-xs font-semibold text-red-50 hover:bg-red-500/30 font-mono"
      >
        {isSwitchingChain ? "Switching…" : `Switch to ${targetChain.name}`}
      </Button>
    </div>
  );
}
