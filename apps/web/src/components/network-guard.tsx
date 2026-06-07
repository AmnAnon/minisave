"use client";

import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChainGuard } from "@/lib/use-chain-guard";

type NetworkGuardProps = {
  className?: string;
};

export function NetworkGuard({ className }: NetworkGuardProps) {
  const { isWrongChain, isSwitchingChain, message, promptSwitchChain, targetChain } = useChainGuard();

  if (!isWrongChain) return null;

  return (
    <div className={className ?? "rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100"}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
          <div>
            <div className="font-semibold text-red-50">Network switch required</div>
            <div className="mt-1 text-red-100/80">{message}</div>
          </div>
        </div>
        <Button
          onClick={() => promptSwitchChain()}
          disabled={isSwitchingChain}
          variant="outline"
          className="border-red-300/30 text-red-50 hover:bg-red-500/10"
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          {isSwitchingChain ? `Switching to ${targetChain.name}...` : `Switch to ${targetChain.name}`}
        </Button>
      </div>
    </div>
  );
}
