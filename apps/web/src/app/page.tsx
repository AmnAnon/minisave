import Link from "next/link";
import { PiggyBank, ShieldCheck, Smartphone, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserBalance } from "@/components/user-balance";
import { VaultDashboard } from "@/components/vault-dashboard";
import { DEFAULT_PENALTY_BPS, PRIMARY_STABLE_TOKEN } from "@/lib/minisave";

const features = [
  {
    title: "Penalty-backed discipline",
    description: `Withdraw early and you pay a ${DEFAULT_PENALTY_BPS / 100}% penalty. Hit the goal or wait out the deadline and you withdraw normally.`,
    icon: AlertTriangle,
  },
  {
    title: "MiniPay-native UX",
    description: "Built inside the MiniPay starter shell for the 375px mobile viewport and injected wallet flow.",
    icon: Smartphone,
  },
  {
    title: "Onchain vaults on Celo",
    description: `Each goal is stored onchain with ${PRIMARY_STABLE_TOKEN.symbol} as the initial stablecoin target.`,
    icon: ShieldCheck,
  },
];

export default function Home() {
  return (
    <main className="flex-1 bg-background">
      <section className="relative overflow-hidden border-b border-amber-500/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(201,168,76,0.12),transparent_35%),radial-gradient(circle_at_bottom,rgba(0,214,255,0.08),transparent_30%)]" />
        <div className="container relative mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-sm font-medium text-amber-200">
              <PiggyBank className="h-4 w-4" />
              MiniPay savings vaults with an early-exit cost
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-amber-50 sm:text-6xl">
              Save with discipline on <span className="text-amber-400">MiniPay</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-amber-100/70 sm:text-xl">
              MiniSave turns savings goals into onchain vaults. Create a target, deposit {PRIMARY_STABLE_TOKEN.symbol}, and only unlock cleanly when your goal is hit or your deadline expires.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="min-w-40 bg-amber-500 text-black hover:bg-amber-400">
                <Link href="/create">Create Vault</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="min-w-40 border-amber-500/30 text-amber-100 hover:bg-amber-500/10">
                <Link href="https://docs.celo.org/build-on-celo/build-on-minipay/overview" target="_blank" rel="noopener noreferrer">
                  MiniPay Docs
                </Link>
              </Button>
            </div>
          </div>
          <div className="mt-10">
            <UserBalance />
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-5 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="rounded-2xl border border-amber-500/10 bg-[#0f0c08]/80 p-6 shadow-sm">
                <div className="mb-4 inline-flex rounded-xl bg-amber-500/10 p-3 text-amber-300">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-amber-50">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-amber-100/60">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="container mx-auto max-w-6xl px-4 pb-16">
        <VaultDashboard />
      </section>
    </main>
  );
}
