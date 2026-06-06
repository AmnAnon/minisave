"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAccount, useBalance, useWriteContract } from "wagmi";
import { ArrowRight, CalendarClock, ChevronRight, Loader2, PiggyBank, Sparkles, Target, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { piggyBankFactoryAbi, resolveFactoryAddress, toTokenUnits } from "@/lib/contracts";
import { DEFAULT_PENALTY_BPS, PRIMARY_STABLE_TOKEN } from "@/lib/minisave";

function dateToUnixTimestamp(value: string) {
  if (!value) return 0n;
  const parsed = new Date(`${value}T00:00:00Z`);
  return BigInt(Math.floor(parsed.getTime() / 1000));
}

function formatBalance(value?: string) {
  return Number(value || "0").toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

function humanizeError(err: unknown) {
  const message = err instanceof Error ? err.message : "Transaction failed.";
  if (message.toLowerCase().includes("user rejected")) return "Transaction rejected in wallet.";
  if (message.toLowerCase().includes("insufficient funds")) return "Not enough CELO for gas or token balance for this action.";
  return message;
}

export function CreateGoalForm() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const factoryAddress = resolveFactoryAddress();
  const { writeContractAsync, isPending } = useWriteContract();
  const { data: stableBalance, isLoading: balanceLoading } = useBalance({
    address,
    token: PRIMARY_STABLE_TOKEN.address,
    query: { enabled: Boolean(address) },
  });

  const [title, setTitle] = useState("Emergency Fund");
  const [targetAmount, setTargetAmount] = useState("50");
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");

  async function handleCreateGoal() {
    setError("");
    setStatus("");

    if (!isConnected || !address) {
      const message = "Connect with MiniPay or another wallet first.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!factoryAddress) {
      const message = "Factory address not set yet. Add NEXT_PUBLIC_FACTORY_ADDRESS after deployment.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!title.trim()) {
      const message = "Goal title is required.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!targetAmount || Number(targetAmount) <= 0) {
      const message = "Enter a valid target amount.";
      setError(message);
      toast.error(message);
      return;
    }

    try {
      setStatus("Waiting for wallet confirmation...");
      toast.loading("Confirm vault creation in your wallet...", { id: "create-vault" });
      const hash = await writeContractAsync({
        address: factoryAddress,
        abi: piggyBankFactoryAbi,
        functionName: "createVault",
        args: [title.trim(), toTokenUnits(targetAmount), dateToUnixTimestamp(deadline)],
      });

      const success = `Vault created. Tx: ${hash.slice(0, 10)}... Redirecting to portfolio.`;
      setStatus(success);
      toast.success("Vault created successfully.", { id: "create-vault", description: "Redirecting to your live portfolio." });
      setTimeout(() => {
        router.push("/#portfolio");
      }, 1200);
    } catch (err) {
      const message = humanizeError(err);
      setError(message);
      toast.error(message, { id: "create-vault" });
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="rounded-[28px] border border-amber-500/15 bg-[#0f0c08]/92 p-6 shadow-[0_0_60px_rgba(0,0,0,0.2)] sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200">
              <Sparkles className="h-3.5 w-3.5" /> Premium vault setup
            </div>
            <h2 className="mt-4 text-3xl font-semibold text-amber-50">Create a vault that feels expensive to break</h2>
            <p className="mt-3 text-sm leading-6 text-amber-100/60">
              Set a goal, define an optional unlock date, and make your future self pay a penalty if discipline breaks early.
            </p>
          </div>
          <div className="hidden h-14 w-14 items-center justify-center rounded-3xl border border-amber-500/20 bg-amber-500/10 text-amber-300 sm:flex">
            <PiggyBank className="h-6 w-6" />
          </div>
        </div>

        <div className="mt-6 grid gap-5">
          <label className="grid gap-2 text-sm font-medium text-amber-100/75">
            Vault title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-13 rounded-2xl border border-amber-500/15 bg-black/20 px-4 text-amber-50 outline-none"
              placeholder="Emergency Fund"
            />
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-amber-100/75">
              Target amount ({PRIMARY_STABLE_TOKEN.symbol})
              <input
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="h-13 rounded-2xl border border-amber-500/15 bg-black/20 px-4 text-amber-50 outline-none"
                placeholder="50"
                inputMode="decimal"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-amber-100/75">
              Deadline (optional)
              <div className="flex h-13 items-center gap-2 rounded-2xl border border-amber-500/15 bg-black/20 px-4 text-amber-50">
                <CalendarClock className="h-4 w-4 text-amber-200/50" />
                <input
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  type="date"
                  className="w-full bg-transparent outline-none"
                />
              </div>
            </label>
          </div>

          <div className="grid gap-4 rounded-3xl border border-dashed border-amber-500/20 bg-amber-500/[0.03] p-5 text-sm text-amber-100/65">
            <div className="flex items-center gap-2 font-medium text-amber-50">
              <Target className="h-4 w-4 text-emerald-400" />
              Live vault terms
            </div>
            <ul className="space-y-2">
              <li>• Deposits use <strong>{PRIMARY_STABLE_TOKEN.symbol}</strong> only for this release.</li>
              <li>• Early exit burns discipline with a <strong>{DEFAULT_PENALTY_BPS / 100}% treasury penalty</strong>.</li>
              <li>• Hit the goal or outlast the timer to unlock cleanly.</li>
            </ul>
          </div>

          {status ? <p className="text-sm text-emerald-400">{status}</p> : null}
          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={handleCreateGoal} disabled={isPending} className="h-12 flex-1 bg-amber-500 text-base text-black hover:bg-amber-400">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
              Create vault on Celo
            </Button>
            <Button asChild variant="outline" className="h-12 flex-1 border-amber-500/25 text-amber-100 hover:bg-amber-500/10">
              <Link href="/">
                Open portfolio
                <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-[28px] border border-amber-500/15 bg-[#0f0c08]/92 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-300">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-amber-200/45">Vault funding balance</div>
              <div className="mt-1 text-sm text-amber-100/55">Visible during creation so you know what can actually be deposited.</div>
            </div>
          </div>
          <div className="mt-5 rounded-3xl border border-amber-500/10 bg-black/20 p-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-200/40">Available {PRIMARY_STABLE_TOKEN.symbol}</div>
            <div className="mt-3 text-4xl font-semibold text-amber-50">{balanceLoading ? "..." : formatBalance(stableBalance?.formatted)}</div>
            <div className="mt-2 text-sm text-amber-100/55">Token address: {PRIMARY_STABLE_TOKEN.address.slice(0, 6)}...{PRIMARY_STABLE_TOKEN.address.slice(-4)}</div>
          </div>
        </div>

        <div className="rounded-[28px] border border-amber-500/15 bg-[#0f0c08]/92 p-6 text-sm text-amber-100/65">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-amber-200/45">What happens after create</div>
          <div className="mt-4 space-y-3">
            <p>1. Your vault is written onchain immediately.</p>
            <p>2. It shows up in <strong>Portfolio</strong> as your live position.</p>
            <p>3. You approve and deposit from the dashboard panel.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
