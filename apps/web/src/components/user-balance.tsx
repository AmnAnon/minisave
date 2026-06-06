"use client";

import Link from "next/link";
import { ExternalLink, PiggyBank, ShieldCheck, Wallet } from "lucide-react";
import { useAccount, useBalance } from "wagmi";
import { PRIMARY_STABLE_TOKEN } from "@/lib/minisave";
import { addressUrl } from "@/lib/contracts";

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
    query: { enabled: Boolean(address) },
  });

  const { data: stableBalance, isLoading: stableLoading } = useBalance({
    address,
    token: PRIMARY_STABLE_TOKEN.address,
    query: { enabled: Boolean(address) },
  });

  if (!isConnected || !address) {
    return null;
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-[1.3fr_0.7fr_0.7fr]">
      <div className="rounded-3xl border border-amber-500/15 bg-[#0f0c08]/85 p-5 shadow-[0_0_50px_rgba(0,0,0,0.18)]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-300">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-amber-200/45">Connected wallet</div>
            <div className="mt-1 text-sm font-medium text-amber-50">{address.slice(0, 6)}...{address.slice(-4)}</div>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-amber-500/10 bg-black/20 p-4 text-sm text-amber-100/65">
          Your live spending + saving rail for MiniSave. Keep CELO for gas and {PRIMARY_STABLE_TOKEN.symbol} for deposits.
          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-amber-100/55">
            <span>Network: {chain?.name || "Unknown"}</span>
            <Link href={addressUrl(address)} target="_blank" className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-200">
              Wallet history <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-amber-500/15 bg-[#0f0c08]/85 p-5">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-200/45">
          <ShieldCheck className="h-4 w-4 text-emerald-300" /> Gas balance
        </div>
        <div className="mt-4 text-2xl font-semibold text-amber-50">{celoLoading ? "..." : formatBalance(celoBalance?.formatted)}</div>
        <div className="mt-1 text-sm text-amber-100/55">CELO on Celo Sepolia</div>
      </div>

      <div className="rounded-3xl border border-amber-500/15 bg-[#0f0c08]/85 p-5">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-200/45">
          <PiggyBank className="h-4 w-4 text-amber-300" /> Vault token
        </div>
        <div className="mt-4 text-2xl font-semibold text-amber-50">{stableLoading ? "..." : formatBalance(stableBalance?.formatted)}</div>
        <div className="mt-1 text-sm text-amber-100/55">{PRIMARY_STABLE_TOKEN.symbol} ready to deposit</div>
      </div>
    </div>
  );
}
