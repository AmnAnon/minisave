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
    <div className="rounded-3xl border border-white/10 bg-black/20 p-5 sm:p-6">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">Portfolio balance</div>
                <div className="mt-1 text-sm font-medium text-zinc-300">{address.slice(0, 6)}...{address.slice(-4)}</div>
              </div>
            </div>
            <div className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-300">
              <BadgeCheck className="h-3.5 w-3.5" /> {stableRefreshing ? "Syncing" : "Live"}
            </div>
          </div>

          <div className="mt-5">
            <div className="text-4xl font-semibold tracking-tight text-zinc-50">
              {(celoLoading || stableLoading)
                ? "..."
                : formatBalance((Number(celoBalance?.formatted || "0") + Number(stableBalance?.formatted || "0")).toString(), 2)}
            </div>
            <div className="mt-2 text-sm text-zinc-400">Available wallet balances across gas and deposit assets.</div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                <Waves className="h-3.5 w-3.5 text-emerald-300" /> Gas token
              </div>
              <div className="mt-3 text-xl font-semibold text-zinc-50">{celoLoading ? "..." : formatBalance(celoBalance?.formatted)}</div>
              <div className="mt-1 text-sm text-zinc-400">CELO available in wallet</div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                <PiggyBank className="h-3.5 w-3.5 text-amber-300" /> Deposit token
              </div>
              <div className="mt-3 text-xl font-semibold text-zinc-50">{stableLoading ? "..." : formatBalance(stableBalance?.formatted)}</div>
              <div className="mt-1 text-sm text-zinc-400">{PRIMARY_STABLE_TOKEN.symbol} ready for vault deposits</div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
            <span>Connected: {chain?.name || "Unknown"} · Target: {targetChain.name}</span>
            <Link href={explorerAddressUrl(address, targetChain.id)} target="_blank" className="inline-flex items-center gap-1 text-emerald-300 hover:text-emerald-200">
              Wallet history <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">Wallet status</div>
          <div className="rounded-3xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">Keep some CELO ready for gas.</div>
          <div className="rounded-3xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">{PRIMARY_STABLE_TOKEN.symbol} is the token used for deposits.</div>
          <div className="rounded-3xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">Use Portfolio for approvals, deposits, and withdrawals.</div>
        </div>
      </div>
    </div>
  );
}
