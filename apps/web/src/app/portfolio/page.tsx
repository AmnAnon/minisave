import Link from "next/link";
import { ArrowLeft, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserBalance } from "@/components/user-balance";
import { VaultDashboard } from "@/components/vault-dashboard";

export default function PortfolioPage() {
  return (
    <main className="container mx-auto max-w-6xl px-4 pb-10 pt-6 sm:pb-12 sm:pt-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-300">
            <PiggyBank className="h-3.5 w-3.5 text-emerald-300" />
            Portfolio
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">Manage your live vault positions</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            Review your wallet balances, inspect every vault, approve deposits, and withdraw when your goal is unlocked — or exit early with a visible penalty.
          </p>
        </div>
        <Button asChild variant="outline" className="border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </div>

      <div className="mb-8">
        <UserBalance />
      </div>

      <VaultDashboard />
    </main>
  );
}
