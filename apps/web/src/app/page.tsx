import Link from "next/link";
import { PiggyBank, ShieldCheck, Smartphone, AlertTriangle } from "lucide-react";
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

const sampleVaults = [
  { title: "Emergency Fund", saved: "18", target: "50", pct: 36, locked: true },
  { title: "Phone Upgrade", saved: "42", target: "120", pct: 35, locked: true },
];

export default function Home() {
  return (
    <main className="flex-1 bg-background">
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(112,255,184,0.16),transparent_35%),radial-gradient(circle_at_bottom,rgba(0,214,255,0.14),transparent_30%)]" />
        <div className="container relative mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-700">
              <PiggyBank className="h-4 w-4" />
              MiniPay savings vaults with an early-exit cost
            </div>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
              Save with discipline on <span className="text-emerald-600">MiniPay</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              MiniSave turns savings goals into onchain vaults. Create a target, deposit {PRIMARY_STABLE_TOKEN.symbol}, and only unlock cleanly when your goal is hit or your deadline expires.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="min-w-40 bg-emerald-600 hover:bg-emerald-700">
                <Link href="/create">Create Vault</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="min-w-40">
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
              <div key={feature.title} className="rounded-2xl border bg-card p-6 shadow-sm">
                <div className="mb-4 inline-flex rounded-xl bg-emerald-500/10 p-3 text-emerald-600">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="container mx-auto max-w-6xl px-4 pb-16">
        <div className="rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Vault preview</h2>
              <p className="mt-1 text-sm text-muted-foreground">The judging hook is simple: save toward a goal, or pay to exit early.</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/create">Open vault creator</Link>
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {sampleVaults.map((vault) => (
              <div key={vault.title} className="rounded-2xl border p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{vault.title}</h3>
                  <span className="text-sm text-muted-foreground">{vault.saved} / {vault.target} {PRIMARY_STABLE_TOKEN.symbol}</span>
                </div>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-emerald-600" style={{ width: `${vault.pct}%` }} />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {vault.pct}% complete · {vault.locked ? `early exit costs ${DEFAULT_PENALTY_BPS / 100}%` : "unlocked"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
