# MiniSave UI Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove mock homepage/default goal content and ship a cleaner mobile-first MiniPay utility UI for home, shell, and create flow.

**Architecture:** The refresh keeps the current Next.js app/router and Wagmi contract integration intact while restructuring the homepage into connected and disconnected states. Shared UI logic stays in focused components, existing live balance/vault reads are reused where possible, and styling moves from ornate amber-heavy presentation toward a cleaner dark utility system.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Wagmi, Viem, Sonner

---

## File Structure

### Existing files to modify

- `apps/web/src/app/page.tsx`
  Homepage route. Replace hardcoded hero/demo content with real connected/disconnected app entry sections.
- `apps/web/src/app/globals.css`
  Global tokens and shared motion/background styles. Tone down the amber-heavy system and remove homepage-only decorative assumptions.
- `apps/web/src/components/navbar.tsx`
  Simplify shell styling while keeping desktop header and mobile bottom nav.
- `apps/web/src/components/user-balance.tsx`
  Convert from a heavy promo-style block into a reusable utility summary card.
- `apps/web/src/components/create-goal-form.tsx`
  Remove preset values, remove v2 reward language, simplify motion and copy, preserve create-vault behavior.

### New files to create

- `apps/web/src/components/home-connected.tsx`
  Connected-state homepage summary with real wallet/vault data and quick actions.
- `apps/web/src/components/home-disconnected.tsx`
  Disconnected-state homepage explainer with connect-first CTA.
- `apps/web/src/components/home-how-it-works.tsx`
  Short 3-step explanatory section.
- `apps/web/src/components/home-trust-strip.tsx`
  Minimal strip covering onchain confirmation, penalty reserve, and chain targeting.

### Existing files to inspect during execution

- `apps/web/src/components/connect-button.tsx`
- `apps/web/src/components/vault-dashboard.tsx`
- `apps/web/src/lib/contracts.ts`
- `apps/web/src/lib/minisave.ts`
- `apps/web/src/lib/use-chain-guard.ts`

---

### Task 1: Add Focused Homepage Sections

**Files:**
- Create: `apps/web/src/components/home-connected.tsx`
- Create: `apps/web/src/components/home-disconnected.tsx`
- Create: `apps/web/src/components/home-how-it-works.tsx`
- Create: `apps/web/src/components/home-trust-strip.tsx`
- Test: `pnpm --filter web type-check`

- [ ] **Step 1: Create the connected homepage component shell**

```tsx
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
            <Link href="/create"><Plus className="mr-2 h-4 w-4" />Create vault</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/portfolio"><WalletCards className="mr-2 h-4 w-4" />Open portfolio</Link>
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
```

- [ ] **Step 2: Create the disconnected homepage component shell**

```tsx
"use client";

import Link from "next/link";
import { ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConnectButton } from "@/components/connect-button";

export function HomeDisconnected() {
  return (
    <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-3xl border border-white/10 bg-black/20 p-6 sm:p-8">
        <h1 className="text-3xl font-semibold text-zinc-50 sm:text-4xl">
          Create a vault and track your savings onchain.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400">
          MiniSave lets you create a personal savings vault, deposit one stable token, and withdraw penalty-free once the vault unlocks.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <ConnectButton />
          <Button asChild variant="outline">
            <Link href="/create">Review create flow</Link>
          </Button>
        </div>
      </div>

      <div className="space-y-4 rounded-3xl border border-white/10 bg-black/20 p-6">
        <div className="flex items-start gap-3">
          <Wallet className="mt-1 h-5 w-5 text-emerald-300" />
          <div>
            <div className="text-sm font-medium text-zinc-100">Connect and create</div>
            <p className="mt-1 text-sm text-zinc-400">Open a vault for a goal and keep topping it up over time.</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 h-5 w-5 text-amber-300" />
          <div>
            <div className="text-sm font-medium text-zinc-100">Clear unlock rules</div>
            <p className="mt-1 text-sm text-zinc-400">Withdraw cleanly after the goal is met or the deadline has passed.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Add the two supporting homepage sections**

```tsx
// apps/web/src/components/home-how-it-works.tsx
export function HomeHowItWorks() {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      {[
        ["Create vault", "Set a label, goal amount, and optional unlock date."],
        ["Deposit over time", "Fund the vault from portfolio using the configured stable token."],
        ["Unlock or exit early", "Withdraw cleanly after unlock, or exit early with a visible penalty."],
      ].map(([title, body]) => (
        <div key={title} className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <h2 className="text-base font-medium text-zinc-100">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{body}</p>
        </div>
      ))}
    </section>
  );
}

// apps/web/src/components/home-trust-strip.tsx
export function HomeTrustStrip() {
  return (
    <section className="grid gap-4 rounded-3xl border border-white/10 bg-black/20 p-5 md:grid-cols-3">
      <div>
        <div className="text-sm font-medium text-zinc-100">Confirmed onchain</div>
        <p className="mt-2 text-sm text-zinc-400">Success states appear only after confirmed receipts.</p>
      </div>
      <div>
        <div className="text-sm font-medium text-zinc-100">Penalty reserve</div>
        <p className="mt-2 text-sm text-zinc-400">Early exit penalties route into a separate reserve contract.</p>
      </div>
      <div>
        <div className="text-sm font-medium text-zinc-100">Chain aware</div>
        <p className="mt-2 text-sm text-zinc-400">Writes stay guarded against the wrong network.</p>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run type-check to verify new components compile**

Run: `pnpm --filter web type-check`

Expected: PASS with no TypeScript errors from the new homepage section files.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/home-connected.tsx apps/web/src/components/home-disconnected.tsx apps/web/src/components/home-how-it-works.tsx apps/web/src/components/home-trust-strip.tsx
git commit -m "feat: add focused homepage sections"
```

### Task 2: Replace Mock Homepage Content With Live State Routing

**Files:**
- Modify: `apps/web/src/app/page.tsx`
- Test: `pnpm --filter web type-check`

- [ ] **Step 1: Replace hardcoded homepage data with account-state branching**

```tsx
import { useAccount } from "wagmi";
import { HomeConnected } from "@/components/home-connected";
import { HomeDisconnected } from "@/components/home-disconnected";
import { HomeHowItWorks } from "@/components/home-how-it-works";
import { HomeTrustStrip } from "@/components/home-trust-strip";

function HomePageContent() {
  const { isConnected } = useAccount();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-6 sm:py-8">
      {isConnected ? <HomeConnected /> : <HomeDisconnected />}
      <HomeHowItWorks />
      <HomeTrustStrip />
    </main>
  );
}

export default function Home() {
  return <HomePageContent />;
}
```

- [ ] **Step 2: Remove the old homepage mock structures**

Delete these blocks entirely from `apps/web/src/app/page.tsx`:

```tsx
const overviewTiles = [...]
const sampleVaults = [...]
```

Also remove imports that become unused:

```tsx
import Link from "next/link";
import { PiggyBank, ShieldCheck, Smartphone, AlertTriangle, ArrowRight, Sparkles, WalletCards, Gift, LockKeyhole, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserBalance } from "@/components/user-balance";
import { BASE_PENALTY_BPS, PRIMARY_STABLE_TOKEN } from "@/lib/minisave";
```

- [ ] **Step 3: Run type-check to confirm the route compiles cleanly**

Run: `pnpm --filter web type-check`

Expected: PASS with no unused import or JSX errors in `apps/web/src/app/page.tsx`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/page.tsx
git commit -m "feat: replace homepage mock content with live state layout"
```

### Task 3: Restyle The App Shell And Global Tokens

**Files:**
- Modify: `apps/web/src/app/globals.css`
- Modify: `apps/web/src/components/navbar.tsx`
- Test: `pnpm --filter web build`

- [ ] **Step 1: Replace the luxury-dark token set with a cleaner utility palette**

Update `:root` in `apps/web/src/app/globals.css` to a more neutral system:

```css
:root {
  --background: 222 22% 8%;
  --foreground: 210 20% 95%;
  --card: 222 20% 11%;
  --card-foreground: 210 20% 95%;
  --popover: 222 20% 11%;
  --popover-foreground: 210 20% 95%;
  --primary: 155 70% 45%;
  --primary-foreground: 210 20% 98%;
  --secondary: 222 14% 16%;
  --secondary-foreground: 210 20% 92%;
  --muted: 222 14% 14%;
  --muted-foreground: 215 12% 67%;
  --accent: 39 82% 55%;
  --accent-foreground: 222 22% 8%;
  --destructive: 0 72% 52%;
  --destructive-foreground: 210 20% 98%;
  --border: 222 14% 20%;
  --input: 222 14% 20%;
  --ring: 155 70% 45%;
}
```

- [ ] **Step 2: Simplify fonts, body background, and utility motion**

Replace the base typography/background block with:

```css
body {
  @apply bg-background text-foreground;
  font-family: "DM Mono", monospace;
  min-height: 100vh;
  background:
    radial-gradient(circle at top, rgba(16, 185, 129, 0.08), transparent 28%),
    radial-gradient(circle at bottom right, rgba(245, 158, 11, 0.05), transparent 24%),
    hsl(var(--background));
}

h1,
h2,
h3,
h4,
h5,
h6 {
  font-family: "DM Mono", monospace;
}
```

Remove unused celebratory utility rules if the create form no longer uses them:

```css
@keyframes confetti-fall { ... }
```

- [ ] **Step 3: Simplify the shell styling in `navbar.tsx`**

Move toward this structure:

```tsx
<header className="sticky top-0 z-50 border-b border-white/10 bg-[#0d1117]/88 backdrop-blur-xl">
  <div className="container flex min-h-16 items-center justify-between px-4 py-2">
    <Link href="/" className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300">
        <PiggyBank className="h-5 w-5" />
      </div>
      <div>
        <div className="text-sm font-semibold text-zinc-50">{MINISAVE_APP_NAME}</div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">MiniPay savings vaults</div>
      </div>
    </Link>
  </div>
</header>
```

For mobile bottom nav, keep the structure but switch active/inactive colors to zinc/emerald instead of amber-heavy fills.

- [ ] **Step 4: Run a production build**

Run: `pnpm --filter web build`

Expected: PASS with a successful Next.js production build.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/globals.css apps/web/src/components/navbar.tsx
git commit -m "style: refresh minisave shell and utility tokens"
```

### Task 4: Refactor Balance Summary To Match The New Homepage

**Files:**
- Modify: `apps/web/src/components/user-balance.tsx`
- Test: `pnpm --filter web type-check`

- [ ] **Step 1: Simplify the outer balance container**

Change the root container from the large promo card:

```tsx
<div className="mx-auto max-w-5xl rounded-[34px] border border-amber-500/15 bg-[linear-gradient(180deg,rgba(8,6,4,0.98),rgba(12,9,6,0.94))] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.25)] sm:p-5">
```

to a flatter utility block:

```tsx
<div className="rounded-3xl border border-white/10 bg-black/20 p-5 sm:p-6">
```

- [ ] **Step 2: Tighten labels and remove filler copy**

Replace copy like:

```tsx
<div className="mt-2 text-sm text-amber-100/58">
  Total wallet value shown as available token balances across gas + deposit assets
</div>
```

with:

```tsx
<div className="mt-2 text-sm text-zinc-400">
  Available wallet balances across gas and deposit assets.
</div>
```

Replace the right-side “Wallet status” filler cards with a compact operational checklist:

```tsx
<div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-5">
  <div className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Wallet status</div>
  <div className="text-sm text-zinc-300">Keep some CELO ready for gas.</div>
  <div className="text-sm text-zinc-300">{PRIMARY_STABLE_TOKEN.symbol} is the token used for deposits.</div>
  <div className="text-sm text-zinc-300">Use portfolio for approvals, deposits, and withdrawals.</div>
</div>
```

- [ ] **Step 3: Update card accents and labels to the new palette**

Swap amber-heavy class usage to zinc/emerald/amber semantics:

```tsx
<div className="rounded-3xl border border-white/10 bg-white/5 p-4">
  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
    <Waves className="h-3.5 w-3.5 text-emerald-300" /> Gas token
  </div>
```

- [ ] **Step 4: Run type-check**

Run: `pnpm --filter web type-check`

Expected: PASS with no type or JSX regressions in `user-balance.tsx`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/user-balance.tsx
git commit -m "refactor: simplify wallet balance summary"
```

### Task 5: Clean Up The Create Flow And Remove Default Goal Content

**Files:**
- Modify: `apps/web/src/components/create-goal-form.tsx`
- Test: `pnpm --filter web build`

- [ ] **Step 1: Remove seeded form defaults**

Change initial state:

```tsx
const [title, setTitle] = useState("");
const [targetAmount, setTargetAmount] = useState("");
const [starterDeposit, setStarterDeposit] = useState("");
```

Keep `deadline` empty as it already is.

- [ ] **Step 2: Remove celebratory state and future-reward messaging**

Delete these state hooks and effects if they become unused:

```tsx
const [celebrate, setCelebrate] = useState(false);
const [confettiBursts, setConfettiBursts] = useState<Array<{ id: number; left: string; delay: string; duration: string }>>([]);

useEffect(() => {
  ...
}, [celebrate]);
```

Remove copy like:

```tsx
Complete this vault to qualify for v2 penalty-share rewards.
Finish the vault and you become eligible for future reward-pool distribution in v2.
```

- [ ] **Step 3: Rewrite the form shell copy to match the utility style**

Move toward copy like:

```tsx
<h2 className="mt-4 text-3xl font-semibold text-zinc-50">Create a new vault</h2>
<p className="mt-3 text-sm leading-6 text-zinc-400">
  Set a label, choose a target amount, and optionally add a deadline.
  Funding happens from portfolio after the vault is created.
</p>
```

Change placeholders/examples only:

```tsx
placeholder="Emergency fund"
placeholder="800"
placeholder="25"
```

- [ ] **Step 4: Keep optimistic routing but simplify status copy**

Update status strings:

```tsx
setStatus("Waiting for wallet confirmation...");
setStatus("Wallet confirmed. Waiting for onchain confirmation...");
const success = "Vault created. Opening portfolio.";
```

- [ ] **Step 5: Run a production build**

Run: `pnpm --filter web build`

Expected: PASS with a successful build and no missing imports/state references in `create-goal-form.tsx`.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/create-goal-form.tsx
git commit -m "refactor: remove seeded create flow content"
```

### Task 6: Final Verification And Cleanup

**Files:**
- Modify: any touched files above if verification exposes drift
- Test: `pnpm --filter web type-check`
- Test: `pnpm --filter web build`

- [ ] **Step 1: Run final type-check**

Run: `pnpm --filter web type-check`

Expected: PASS with no TypeScript errors.

- [ ] **Step 2: Run final production build**

Run: `pnpm --filter web build`

Expected: PASS with a successful Next.js production build.

- [ ] **Step 3: Review changed files against the spec**

Confirm each requirement is visibly implemented:

```text
- homepage has no hardcoded sample vaults
- homepage has connected/disconnected states
- create form has no preset values
- app shell is simplified
- no v2/reward copy remains on home/create
```

- [ ] **Step 4: Commit final polish if needed**

```bash
git add apps/web/src/app/page.tsx apps/web/src/app/globals.css apps/web/src/components/navbar.tsx apps/web/src/components/user-balance.tsx apps/web/src/components/create-goal-form.tsx apps/web/src/components/home-connected.tsx apps/web/src/components/home-disconnected.tsx apps/web/src/components/home-how-it-works.tsx apps/web/src/components/home-trust-strip.tsx
git commit -m "feat: ship minisave mobile-first ui refresh"
```
