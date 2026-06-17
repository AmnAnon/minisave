"use client";

import Link from "next/link";
import { Plus, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserBalance } from "@/components/user-balance";
import { VaultDashboard } from "@/components/vault-dashboard";

export function HomeConnected() {
  return (
    <section className="space-y-5">
      <UserBalance />

      <div className="flex gap-3">
        <Button asChild className="h-11 flex-1 bg-emerald-500 text-sm font-semibold text-slate-950 hover:bg-emerald-400">
          <Link href="/create">
            <Plus className="mr-2 h-4 w-4" />
            Create Vault
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-11 flex-1 border-white/10 bg-white/5 text-sm font-semibold text-zinc-100 hover:bg-white/10">
          <Link href="/portfolio">
            <WalletCards className="mr-2 h-4 w-4" />
            Portfolio
          </Link>
        </Button>
      </div>

      <VaultDashboard />
    </section>
  );
}
