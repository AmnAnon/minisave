import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserBalance } from "@/components/user-balance";
import { VaultDashboard } from "@/components/vault-dashboard";

export default function PortfolioPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-6 sm:gap-6 sm:py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-zinc-50 font-mono">Portfolio</h1>
        <Button asChild variant="outline" size="sm" className="h-9 border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10 font-mono">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      <UserBalance />

      <VaultDashboard />
    </main>
  );
}
