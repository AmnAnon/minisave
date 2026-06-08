"use client";

import Link from "next/link";
import { BadgeCheck, ExternalLink, PiggyBank, ShieldCheck, Wallet } from "lucide-react";
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
    <div className="mx-auto grid max-w-5xl gap-3 sm:gap-4 md:grid-cols-[1.35fr_0.8fr_0.8fr]">
      <div className="rounded-[32px] border border-amber-500/15 bg-[linear-gradient(180deg,rgba(15,12,8,0.94),rgba(10,8,6,0.88))] p-4 sm:p-5 shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-300">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-amber-200/45">Connected wallet</div>
            <div className="mt-1 text-sm font-medium text-amber-50">{address.slice(0, 6)}...{address.slice(-4)}</div>
          </div>
        </div>
        <div className="mt-4 rounded-[24px] border border-amber-500/10 bg-black/20 p-4 text-sm text-amber-100/65">
          Your live spending + saving rail for MiniSave. Keep CELO for gas and {PRIMARY_STABLE_TOKEN.symbol} for deposits.
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-100/55">
            <span>Connected: {chain?.name || "Unknown"} · Target: {targetChain.name}</span>
            <Link href={explorerAddressUrl(address, targetChain.id)} target="_blank" className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-200">
              Wallet history <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <div className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">
            <BadgeCheck className="h-3.5 w-3.5" /> Live wallet sync
          </div>
          <div className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-200">
            {stableRefreshing ? "Refreshing balances" : "Balances auto-refresh"}
          </div>
        </div>
      </div>

      <div className="rounded-[32px] border border-amber-500/15 bg-[linear-gradient(180deg,rgba(15,12,8,0.94),rgba(10,8,6,0.88))] p-4 sm:p-5">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-200/45">
          <ShieldCheck className="h-4 w-4 text-emerald-300" /> Gas balance
        </div>
        <div className="mt-4 text-2xl font-semibold text-amber-50">{celoLoading ? "..." : formatBalance(celoBalance?.formatted)}</div>
        <div className="mt-1 text-sm text-amber-100/55">CELO on {targetChain.name}</div>
      </div>

      <div className="rounded-[32px] border border-amber-500/15 bg-[linear-gradient(180deg,rgba(15,12,8,0.94),rgba(10,8,6,0.88))] p-4 sm:p-5">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-200/45">
          <PiggyBank className="h-4 w-4 text-amber-300" /> Vault token
        </div>
        <div className="mt-4 text-2xl font-semibold text-amber-50">{stableLoading ? "..." : formatBalance(stableBalance?.formatted)}</div>
        <div className="mt-1 text-sm text-amber-100/55">{PRIMARY_STABLE_TOKEN.symbol} ready to deposit</div>
      </div>
    </div>
  );
}
