"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAccount, useBalance, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { ArrowRight, CalendarClock, CheckCircle2, ChevronRight, Gift, Loader2, PiggyBank, Sparkles, Target, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NetworkGuard } from "@/components/network-guard";
import { explorerTxUrl } from "@/lib/chains";
import { piggyBankFactoryAbi, resolveFactoryAddress, toTokenUnits, waitForConfirmedReceipt } from "@/lib/contracts";
import { BASE_PENALTY_BPS, PRIMARY_STABLE_TOKEN } from "@/lib/minisave";
import { useChainGuard } from "@/lib/use-chain-guard";

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
  const { isWrongChain, promptSwitchChain, targetChain } = useChainGuard();
  const factoryAddress = resolveFactoryAddress();
  const { writeContractAsync, isPending } = useWriteContract();
  const publicClient = usePublicClient({ chainId: targetChain.id });
  const { data: stableBalance, isLoading: balanceLoading } = useBalance({
    address,
    chainId: targetChain.id,
    token: PRIMARY_STABLE_TOKEN.address,
    query: { enabled: Boolean(address), refetchInterval: 4000 },
  });
  const { data: vaultCountData, refetch: refetchVaultCount } = useReadContract({
    abi: piggyBankFactoryAbi,
    address: factoryAddress || undefined,
    chainId: targetChain.id,
    functionName: "getVaultCount",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && factoryAddress && !isWrongChain), refetchInterval: 4000 },
  });

  const [title, setTitle] = useState("Emergency Fund");
  const [targetAmount, setTargetAmount] = useState("50");
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [optimisticCreated, setOptimisticCreated] = useState<{ title: string; targetAmount: string; deadline: string } | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [confettiBursts, setConfettiBursts] = useState<Array<{ id: number; left: string; delay: string; duration: string }>>([]);

  useEffect(() => {
    if (!celebrate) return;
    const bursts = Array.from({ length: 14 }, (_, index) => ({
      id: index,
      left: `${6 + index * 6.5}%`,
      delay: `${(index % 5) * 70}ms`,
      duration: `${1500 + (index % 4) * 220}ms`,
    }));
    setConfettiBursts(bursts);
    const timer = window.setTimeout(() => setConfettiBursts([]), 2200);
    return () => window.clearTimeout(timer);
  }, [celebrate]);

  async function handleCreateGoal() {
    setError("");
    setStatus("");
    setCelebrate(false);

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

    if (isWrongChain) {
      const message = `Switch to ${targetChain.name} before creating a vault.`;
      setError(message);
      toast.error(message);
      await promptSwitchChain().catch(() => undefined);
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

    const optimisticVault = {
      title: title.trim(),
      targetAmount,
      deadline,
    };

    try {
      setOptimisticCreated(optimisticVault);
      setStatus("Vault drafted locally. Waiting for wallet confirmation...");
      toast.loading("Confirm vault creation in your wallet...", { id: "create-vault" });
      const hash = await writeContractAsync({
        address: factoryAddress,
        abi: piggyBankFactoryAbi,
        functionName: "createVault",
        args: [optimisticVault.title, toTokenUnits(targetAmount), dateToUnixTimestamp(deadline)],
      });

      setStatus("Wallet confirmed. Optimistic vault queued. Waiting for onchain confirmation...");
      await waitForConfirmedReceipt(publicClient, hash);
      await refetchVaultCount();
      setCelebrate(true);

      const success = `Vault created. Opening portfolio with your new vault pre-committed.`;
      setStatus(success);
      toast.success("Vault created successfully.", {
        id: "create-vault",
        description: `View on explorer: ${hash.slice(0, 10)}...`,
        action: {
          label: "Open tx",
          onClick: () => window.open(explorerTxUrl(hash, targetChain.id), "_blank", "noopener,noreferrer"),
        },
      });

      const nextVaultId = Number(vaultCountData ?? 0n);
      const payload = new URLSearchParams({
        optimistic: "1",
        vaultId: `${nextVaultId}`,
        label: optimisticVault.title,
        goalAmount: toTokenUnits(targetAmount).toString(),
        deadline: dateToUnixTimestamp(deadline).toString(),
      });

      setTimeout(() => {
        router.push(`/portfolio?${payload.toString()}`);
      }, 1400);
    } catch (err) {
      setOptimisticCreated(null);
      const message = humanizeError(err);
      setError(message);
      toast.error(message, { id: "create-vault" });
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <div className={`relative overflow-hidden rounded-[28px] border border-amber-500/15 bg-[#0f0c08]/92 p-6 shadow-[0_0_60px_rgba(0,0,0,0.2)] sm:p-8 transition-all duration-500 ${celebrate ? "ring-1 ring-emerald-400/40 shadow-[0_0_80px_rgba(39,194,118,0.18)]" : ""}`}>
        {confettiBursts.map((burst) => (
          <span
            key={burst.id}
            className="pointer-events-none absolute top-0 h-3 w-1.5 rounded-full bg-[linear-gradient(180deg,#f8e08a,#4ade80)] opacity-0 animate-[confetti-fall_var(--dur)_ease-out_forwards]"
            style={{ left: burst.left, animationDelay: burst.delay, ["--dur" as string]: burst.duration }}
          />
        ))}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200">
              <Sparkles className="h-3.5 w-3.5" /> Penalty-backed setup
            </div>
            <h2 className="mt-4 text-3xl font-semibold text-amber-50">Create a vault that feels expensive to break</h2>
            <p className="mt-3 text-sm leading-6 text-amber-100/60">
              Set a goal, define an optional unlock date, and make your future self pay a small penalty if discipline breaks early.
            </p>
          </div>
          <div className={`hidden h-14 w-14 items-center justify-center rounded-3xl border border-amber-500/20 bg-amber-500/10 text-amber-300 sm:flex transition-all duration-500 ${celebrate ? "scale-110 border-emerald-400/30 bg-emerald-500/10 text-emerald-300" : ""}`}>
            {celebrate ? <CheckCircle2 className="h-6 w-6" /> : <PiggyBank className="h-6 w-6" />}
          </div>
        </div>

        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
          <Gift className="h-3.5 w-3.5" />
          Complete this vault to qualify for v2 penalty-share rewards.
        </div>

        <div className="mt-6">
          <NetworkGuard />
        </div>

        <div className="mt-4 grid gap-4 sm:gap-5">
          <label className="grid gap-2 rounded-[26px] border border-amber-500/12 bg-black/15 p-4 text-sm font-medium text-amber-100/75 sm:p-5">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-200/45">Vault title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-12 rounded-2xl border border-amber-500/15 bg-black/30 px-4 text-base text-amber-50 outline-none transition focus:border-amber-400/40 focus:bg-black/40"
              placeholder="Emergency Fund"
            />
          </label>

          <label className="grid gap-2 rounded-[26px] border border-amber-500/12 bg-black/15 p-4 text-sm font-medium text-amber-100/75 sm:p-5">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-200/45">Target amount ({PRIMARY_STABLE_TOKEN.symbol})</span>
            <input
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              className="h-12 rounded-2xl border border-amber-500/15 bg-black/30 px-4 text-base text-amber-50 outline-none transition focus:border-amber-400/40 focus:bg-black/40"
              placeholder="50"
              inputMode="decimal"
            />
          </label>

          <label className="grid gap-2 rounded-[26px] border border-amber-500/12 bg-black/15 p-4 text-sm font-medium text-amber-100/75 sm:p-5">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-200/45">Deadline (optional)</span>
            <div className="flex h-12 items-center gap-3 rounded-2xl border border-amber-500/15 bg-black/30 px-4 text-amber-50 transition focus-within:border-amber-400/40 focus-within:bg-black/40">
              <CalendarClock className="h-4 w-4 shrink-0 text-amber-200/50" />
              <input
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                type="date"
                className="w-full bg-transparent text-base outline-none"
              />
            </div>
          </label>

          <div className="grid gap-3 rounded-[26px] border border-amber-500/12 bg-[#151008]/95 p-5 text-sm text-amber-100/65">
            <div className="flex items-center gap-2 font-medium text-amber-50">
              <Target className="h-4 w-4 text-emerald-400" />
              Live vault terms
            </div>
            <ul className="space-y-2 leading-6">
              <li>• Deposits use <strong>{PRIMARY_STABLE_TOKEN.symbol}</strong> only for this release.</li>
              <li>• Early exit starts at <strong>{BASE_PENALTY_BPS / 100}% and decays linearly to 0%</strong> by the deadline.</li>
              <li>• Hit the goal or outlast the timer to unlock cleanly.</li>
              <li>• Finish the vault and you become eligible for future reward-pool distribution in v2.</li>
            </ul>
          </div>

          {optimisticCreated ? (
            <div className={`rounded-[24px] border px-4 py-4 text-sm transition-all duration-500 ${celebrate ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100" : "border-amber-500/15 bg-amber-500/[0.05] text-amber-100/75"}`}>
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 rounded-2xl p-2 ${celebrate ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/10 text-amber-200"}`}>
                  {celebrate ? <CheckCircle2 className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                </div>
                <div>
                  <div className="font-semibold">{celebrate ? "Vault minted and routing to Portfolio" : "Optimistic vault draft ready"}</div>
                  <div className="mt-1 text-sm opacity-90">
                    {optimisticCreated.title} · {optimisticCreated.targetAmount} {PRIMARY_STABLE_TOKEN.symbol} {optimisticCreated.deadline ? `· unlock ${optimisticCreated.deadline}` : "· no unlock date"}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {status ? <p className={`text-sm transition-colors duration-300 ${celebrate ? "text-emerald-300" : "text-emerald-400"}`}>{status}</p> : null}
          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={handleCreateGoal} disabled={isPending} className="h-12 flex-1 bg-amber-500 text-base text-black hover:bg-amber-400">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
              Create vault on {targetChain.name}
            </Button>
            <Button asChild variant="outline" className="h-12 flex-1 border-amber-500/25 text-amber-100 hover:bg-amber-500/10">
              <Link href="/portfolio">
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
            <p>1. Your vault is drafted locally the moment you confirm intent.</p>
            <p>2. Once the receipt lands, Portfolio opens with the new vault pre-selected.</p>
            <p>3. Animated success state confirms chain sync before you deposit.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
