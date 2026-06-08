import Link from "next/link";
import { PiggyBank, ShieldCheck, Smartphone, AlertTriangle, ArrowRight, Sparkles, WalletCards, Gift, LockKeyhole, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserBalance } from "@/components/user-balance";
import { BASE_PENALTY_BPS, PRIMARY_STABLE_TOKEN } from "@/lib/minisave";

const overviewTiles = [
  { label: "Total wallet", value: "Live", sub: "gas + deposit assets" },
  { label: "Vault status", value: "Tracked", sub: "progress + unlock state" },
  { label: "Penalty logic", value: `${BASE_PENALTY_BPS / 100}%`, sub: "decays toward zero" },
];

const sampleVaults = [
  {
    title: "Emergency Fund",
    meta: `${PRIMARY_STABLE_TOKEN.symbol} · 180D LEFT`,
    amount: `820 ${PRIMARY_STABLE_TOKEN.symbol}`,
    goal: `of 5,000 ${PRIMARY_STABLE_TOKEN.symbol} goal`,
    accent: "amber",
    badge: "Locked",
    icon: LockKeyhole,
  },
  {
    title: "MacBook Fund",
    meta: `${PRIMARY_STABLE_TOKEN.symbol} · Goal met`,
    amount: `2,000 ${PRIMARY_STABLE_TOKEN.symbol}`,
    goal: "ready for clean withdraw",
    accent: "emerald",
    badge: "Goal met",
    icon: CheckCircle2,
  },
];

export default function Home() {
  return (
    <main className="flex-1 bg-background">
      <section className="relative overflow-hidden border-b border-amber-500/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(201,168,76,0.16),transparent_35%),radial-gradient(circle_at_bottom,rgba(0,214,255,0.05),transparent_30%)]" />
        <div className="container relative mx-auto max-w-6xl px-4 py-8 sm:py-14">
          <div className="mx-auto max-w-5xl rounded-[34px] border border-amber-500/15 bg-[linear-gradient(180deg,rgba(8,6,4,0.98),rgba(12,9,6,0.94))] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.25)] sm:p-6">
            <div className="flex items-center justify-between gap-3 rounded-[28px] border border-amber-500/10 bg-black/20 px-4 py-4 sm:px-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-500/15 bg-amber-500/10 text-amber-300">
                  <PiggyBank className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-3xl font-semibold text-amber-50 sm:text-4xl">PiggyBank</div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.22em] text-amber-200/42">MiniPay savings protocol</div>
                </div>
              </div>
              <Button asChild className="border border-amber-500/25 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20">
                <Link href="/portfolio">Open portfolio</Link>
              </Button>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[30px] border border-amber-500/12 bg-[linear-gradient(180deg,rgba(18,14,10,0.88),rgba(8,6,4,0.78))] p-5 sm:p-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-amber-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  MiniSave
                </div>
                <h1 className="mt-5 text-3xl font-semibold tracking-tight text-amber-50 sm:text-5xl">
                  Save for a goal. Break early and <span className="text-amber-400">pay for it</span>.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-amber-100/68 sm:text-lg">
                  MiniPay-native vaults with a darker premium rail: total wallet visibility, token availability, and compact live investments.
                </p>

                <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                  <Gift className="h-3.5 w-3.5" />
                  Finish your vault and become eligible for v2 penalty-share rewards.
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Button asChild size="lg" className="min-w-44 bg-amber-500 text-black hover:bg-amber-400">
                    <Link href="/create">
                      Create vault
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="min-w-44 border-amber-500/30 text-amber-100 hover:bg-amber-500/10">
                    <Link href="/portfolio">Open portfolio</Link>
                  </Button>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="grid gap-0 overflow-hidden rounded-[28px] border border-amber-500/12 bg-[linear-gradient(180deg,rgba(14,10,7,0.96),rgba(8,6,4,0.84))] sm:grid-cols-3">
                  {overviewTiles.map((tile, index) => (
                    <div key={tile.label} className={`p-4 sm:p-5 ${index !== overviewTiles.length - 1 ? "border-b border-amber-500/10 sm:border-b-0 sm:border-r" : ""}`}>
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/38">{tile.label}</div>
                      <div className="mt-3 text-2xl font-semibold text-amber-50">{tile.value}</div>
                      <div className="mt-1 text-sm text-amber-100/55">{tile.sub}</div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-3">
                  {sampleVaults.map((vault) => {
                    const Icon = vault.icon;
                    const badgeClass = vault.accent === "emerald"
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                      : "border-amber-500/20 bg-white/5 text-amber-100/65";
                    const ringClass = vault.accent === "emerald"
                      ? "border-emerald-400/35 text-emerald-300"
                      : "border-amber-400/35 text-amber-300";
                    return (
                      <div key={vault.title} className="rounded-[28px] border border-amber-500/12 bg-[linear-gradient(180deg,rgba(18,14,10,0.88),rgba(8,6,4,0.78))] p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-2xl font-semibold text-amber-50">{vault.title}</div>
                            <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-amber-200/38">{vault.meta}</div>
                          </div>
                          <div className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${badgeClass}`}>
                            <Icon className="h-3.5 w-3.5" /> {vault.badge}
                          </div>
                        </div>

                        <div className="mt-5 flex items-center gap-4">
                          <div className={`flex h-20 w-20 items-center justify-center rounded-full border ${ringClass}`}>
                            <span className="text-sm font-semibold">{vault.accent === "emerald" ? "100%" : "16%"}</span>
                          </div>
                          <div>
                            <div className="text-3xl font-semibold text-amber-50">{vault.amount}</div>
                            <div className="mt-1 text-sm text-amber-100/55">{vault.goal}</div>
                            <div className="mt-2 text-sm text-amber-100/65">{vault.accent === "emerald" ? "Small live investment card" : "+ penalty bonus rail coming in next pass"}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <UserBalance />
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-6xl px-4 pb-24 sm:pb-16">
        <div className="rounded-[28px] border border-amber-500/10 bg-[#0f0c08]/80 p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-amber-200/45">Next step</div>
              <h2 className="mt-2 text-2xl font-semibold text-amber-50">Ready to start or manage your vaults?</h2>
              <p className="mt-2 text-sm text-amber-100/60">Use Create to open a new vault, then switch to Portfolio to approve, deposit, and track progress.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="bg-amber-500 text-black hover:bg-amber-400">
                <Link href="/create">Create vault</Link>
              </Button>
              <Button asChild variant="outline" className="border-amber-500/30 text-amber-100 hover:bg-amber-500/10">
                <Link href="/portfolio">Open portfolio</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
