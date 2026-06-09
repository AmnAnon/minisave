"use client";

import Link from "next/link";
import { Plus, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserBalance } from "@/components/user-balance";
import { VaultDashboard } from "@/components/vault-dashboard";

export function HomeConnected() {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Home</div>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-50 sm:text-4xl">Your savings dashboard</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            Track wallet balances, review vault status, and move directly into your next action.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild className="w-full bg-emerald-500 text-slate-950 hover:bg-emerald-400 sm:w-auto">
            <Link href="/create">
              <Plus className="mr-2 h-4 w-4" />
              Create vault
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10 sm:w-auto">
            <Link href="/portfolio">
              <WalletCards className="mr-2 h-4 w-4" />
              Open portfolio
            </Link>
          </Button>
        </div>
      </div>

      <UserBalance />

      <div className="space-y-3 rounded-3xl border border-white/10 bg-black/20 p-5">
        <div className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Vault activity</div>
        <p className="text-sm text-zinc-400">
          This section is driven by live wallet and vault reads only. If nothing exists yet, the portfolio state stays empty until you create your first vault.
        </p>
      </div>

      <VaultDashboard />
    </section>
  );
}
