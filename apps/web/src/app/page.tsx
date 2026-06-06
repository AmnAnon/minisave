import Link from "next/link";
import { PiggyBank, ShieldCheck, Smartphone, AlertTriangle, ArrowRight, Sparkles, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserBalance } from "@/components/user-balance";
import { DEFAULT_PENALTY_BPS, PRIMARY_STABLE_TOKEN } from "@/lib/minisave";

const features = [
  {
    title: "Penalty-backed discipline",
    description: `Withdraw early and you pay a ${DEFAULT_PENALTY_BPS / 100}% penalty. Hit the goal or wait out the deadline and you withdraw normally.`,
    icon: AlertTriangle,
  },
  {
    title: "MiniPay-native flow",
    description: "Built for the MiniPay shell with wallet injection, fast mobile actions, and a cleaner mobile-first UX.",
    icon: Smartphone,
  },
  {
    title: "Onchain vault positions",
    description: `Every vault becomes a visible live position on Celo, funded with ${PRIMARY_STABLE_TOKEN.symbol} in this release.`,
    icon: ShieldCheck,
  },
];

const steps = [
  "Create a savings vault with a goal and optional deadline",
  `Fund it using ${PRIMARY_STABLE_TOKEN.symbol} from your MiniPay wallet`,
  `Withdraw cleanly when unlocked, or exit early with a ${DEFAULT_PENALTY_BPS / 100}% penalty`,
];

export default function Home() {
  return (
    <main className="flex-1 bg-background">
      <section className="relative overflow-hidden border-b border-amber-500/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(201,168,76,0.16),transparent_35%),radial-gradient(circle_at_bottom,rgba(0,214,255,0.08),transparent_30%)]" />
        <div className="container relative mx-auto max-w-6xl px-4 py-10 sm:py-16">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-amber-200">
                <Sparkles className="h-3.5 w-3.5" />
                Home
              </div>
              <h1 className="text-4xl font-semibold tracking-tight text-amber-50 sm:text-5xl">
                Save for a goal. Break early and <span className="text-amber-400">pay for it</span>.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-amber-100/70 sm:text-lg">
                MiniSave is a MiniPay savings vault app on Celo. It helps you lock money toward a target, stay disciplined, and track your savings journey onchain.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="min-w-44 bg-amber-500 text-black hover:bg-amber-400">
                  <Link href="/create">
                    Create Vault
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="min-w-44 border-amber-500/30 text-amber-100 hover:bg-amber-500/10">
                  <Link href="/portfolio">Open Portfolio</Link>
                </Button>
              </div>
            </div>

            <div className="rounded-[30px] border border-amber-500/15 bg-[#0f0c08]/90 p-6 shadow-[0_0_60px_rgba(0,0,0,0.18)]">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-300">
                  <WalletCards className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-amber-200/45">What this app does</div>
                  <div className="mt-1 text-lg font-semibold text-amber-50">A MiniPay vault for disciplined saving</div>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {steps.map((step, index) => (
                  <div key={step} className="flex gap-3 rounded-2xl border border-amber-500/10 bg-black/20 p-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-sm font-semibold text-amber-300">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-6 text-amber-100/68">{step}</p>
                  </div>
                ))}
              </div>
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
              <div key={feature.title} className="rounded-[28px] border border-amber-500/10 bg-[#0f0c08]/80 p-6 shadow-sm">
                <div className="mb-4 inline-flex rounded-2xl bg-amber-500/10 p-3 text-amber-300">
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
        <div className="rounded-[28px] border border-amber-500/10 bg-[#0f0c08]/80 p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-amber-200/45">Next step</div>
              <h2 className="mt-2 text-2xl font-semibold text-amber-50">Ready to start or manage your vaults?</h2>
              <p className="mt-2 text-sm text-amber-100/60">Use Create to open a new vault, then switch to Portfolio to approve, deposit, and track progress.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="bg-amber-500 text-black hover:bg-amber-400">
                <Link href="/create">Create Vault</Link>
              </Button>
              <Button asChild variant="outline" className="border-amber-500/30 text-amber-100 hover:bg-amber-500/10">
                <Link href="/portfolio">Open Portfolio</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
