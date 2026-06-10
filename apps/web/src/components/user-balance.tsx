"use client";

import Link from "next/link";
import { BadgeCheck, ExternalLink, PiggyBank, Wallet, Waves } from "lucide-react";
import { useAccount, useBalance } from "wagmi";
import { PRIMARY_STABLE_TOKEN } from "@/lib/minisave";
import { explorerAddressUrl, targetChain } from "@/lib/chains";

function formatBalance(value?: string, decimals = 4) {
  return Number(value || "0").toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

export function UserBalance() {
  const { address, isConnected, chain } = useAccount();

  const { data: celoBalance, isLoading: celoLoading } = useBalance({
    address,
    chainId: targetChain.id,
    query: { enabled: Boolean(address), refetchInterval: 4000 },
  });

  const { data: stableBalance, isLoading: stableLoading, isRefetching: stableRefreshing } = useBalance({
    address,
    chainId: targetChain.id,
    token: PRIMARY_STABLE_TOKEN.address,
    query: { enabled: Boolean(address), refetchInterval: 4000 },
  });

  if (!isConnected || !address) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-2.5 text-xs text-zinc-400">
      <div className="flex items-center gap-2">
        <Wallet className="h-4 w-4 text-emerald-400" />
        <span className="font-semibold text-zinc-300">Wallet</span>
        <span className="text-zinc-500">{address.slice(0, 6)}...{address.slice(-4)}</span>
      </div>
      <div className="flex items-center gap-2 font-medium text-zinc-200">
        <span>
          {celoLoading ? "..." : formatBalance(celoBalance?.formatted, 2)} CELO
        </span>
        <span className="text-zinc-600">·</span>
        <span>
          {stableLoading ? "..." : formatBalance(stableBalance?.formatted, 2)} {PRIMARY_STABLE_TOKEN.symbol}
        </span>
      </div>
    </div>
  );
}
