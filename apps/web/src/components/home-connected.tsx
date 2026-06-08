"use client";

import Link from "next/link";
import { PiggyBank, Plus, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserBalance } from "@/components/user-balance";

export function HomeConnected() {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-50">Your savings dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            Track wallet balances, review vault status, and move directly into your next action.
          </p>
        </div>
        <div className="hidden gap-3 sm:flex">
          <Button asChild>
            <Link href="/create">
              <Plus className="mr-2 h-4 w-4" />
              Create vault
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/portfolio">
              <WalletCards className="mr-2 h-4 w-4" />
              Open portfolio
            </Link>
          </Button>
        </div>
      </div>

      <UserBalance />

      <div className="rounded-3xl border border-white/10 bg-black/20 p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-300">
            <PiggyBank className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-medium text-zinc-100">Live vault summary</div>
            <div className="text-sm text-zinc-400">Real vault data only. Empty state if nothing has been created yet.</div>
          </div>
        </div>
      </div>
    </section>
  );
}
