"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAccount, useBalance, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { ArrowRight, CalendarClock, ChevronRight, Loader2, Target, Wallet } from "lucide-react";
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

  const [title, setTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [starterDeposit, setStarterDeposit] = useState("");
  const [optimisticCreated, setOptimisticCreated] = useState<{
    title: string;
    targetAmount: string;
    deadline: string;
    starterDeposit: string;
  } | null>(null);

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
      starterDeposit,
    };

    try {
      setOptimisticCreated(optimisticVault);
      setStatus("Waiting for wallet confirmation...");
      toast.loading("Confirm vault creation in your wallet...", { id: "create-vault" });
      const hash = await writeContractAsync({
        address: factoryAddress,
        abi: piggyBankFactoryAbi,
        functionName: "createVault",
        args: [optimisticVault.title, toTokenUnits(targetAmount), dateToUnixTimestamp(deadline)],
      });

      setStatus("Wallet confirmed. Waiting for onchain confirmation...");
      await waitForConfirmedReceipt(publicClient, hash);
      await refetchVaultCount();

      const success = "Vault created. Opening portfolio.";
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
        starterDeposit,
      });

      setTimeout(() => {
        router.push(`/portfolio?${payload.toString()}`);
      }, 1200);
    } catch (err) {
      setOptimisticCreated(null);
      const message = humanizeError(err);
      setError(message);
      toast.error(message, { id: "create-vault" });
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
      <div className="rounded-3xl border border-white/10 bg-black/20 p-6 sm:p-8">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Create</div>
          <h2 className="mt-3 text-3xl font-semibold text-zinc-50">Create a new vault</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Set a label, choose a target amount, and optionally add a deadline. Funding happens from Portfolio after the vault is created.
          </p>
        </div>

        <div className="mt-5">
          <NetworkGuard />
        </div>

        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">Vault title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-12 rounded-2xl border border-white/10 bg-black/20 px-4 text-base text-zinc-50 outline-none transition focus:border-emerald-400/40"
              placeholder="Emergency fund"
            />
          </label>

          <label className="grid gap-2 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">Target amount ({PRIMARY_STABLE_TOKEN.symbol})</span>
              <span className="text-[11px] text-emerald-300">Goal first</span>
            </div>
            <input
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              className="h-12 rounded-2xl border border-white/10 bg-black/20 px-4 text-base text-zinc-50 outline-none transition focus:border-emerald-400/40"
              placeholder="800"
              inputMode="decimal"
            />
            <div className="text-xs leading-6 text-zinc-500">Example: 800 {PRIMARY_STABLE_TOKEN.symbol} for a laptop or travel goal.</div>
          </label>

          <div className="grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">Suggested first contribution</div>
                <div className="mt-1 text-sm text-zinc-400">Optional guidance only. You can leave this empty and deposit later from Portfolio.</div>
              </div>
              <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-300">Optional</div>
            </div>
            <input
              value={starterDeposit}
              onChange={(e) => setStarterDeposit(e.target.value)}
              className="h-12 rounded-2xl border border-white/10 bg-black/20 px-4 text-base text-zinc-50 outline-none transition focus:border-emerald-400/40"
              placeholder="25"
              inputMode="decimal"
            />
            <div className="flex flex-wrap gap-2">
              {["10", "25", "50", "100"].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStarterDeposit(value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    starterDeposit === value
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                      : "border-white/10 bg-black/20 text-zinc-400 hover:bg-white/5"
                  }`}
                >
                  {value} {PRIMARY_STABLE_TOKEN.symbol}
                </button>
              ))}
            </div>
          </div>

          <label className="grid gap-2 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">Deadline (optional)</span>
            <div className="flex h-12 items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 text-zinc-50 transition focus-within:border-emerald-400/40">
              <CalendarClock className="h-4 w-4 shrink-0 text-zinc-500" />
              <input
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                type="date"
                className="w-full bg-transparent text-base outline-none"
              />
            </div>
            <div className="text-xs leading-6 text-zinc-500">Add a deadline to create an explicit unlock point. Leave it empty for a more flexible vault.</div>
          </label>

          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 text-sm text-zinc-300">
            <div className="flex items-center gap-2 font-medium text-zinc-50">
              <Target className="h-4 w-4 text-emerald-300" />
              Live vault terms
            </div>
            <ul className="mt-3 space-y-2 leading-6 text-zinc-400">
              <li>• Deposits use <strong>{PRIMARY_STABLE_TOKEN.symbol}</strong> for this release.</li>
              <li>• Early exit starts at <strong>{BASE_PENALTY_BPS / 100}%</strong> and decays linearly to 0% by the deadline.</li>
              <li>• Hit the goal or outlast the timer to withdraw without penalty.</li>
              <li>• Create now, then return to Portfolio for approvals and deposits.</li>
            </ul>
          </div>

          {optimisticCreated ? (
            <div className="rounded-3xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100">
              <div className="font-medium">Optimistic vault draft ready</div>
              <div className="mt-1 opacity-90">
                {optimisticCreated.title} · goal {optimisticCreated.targetAmount} {PRIMARY_STABLE_TOKEN.symbol}
                {optimisticCreated.starterDeposit ? ` · suggested first deposit ${optimisticCreated.starterDeposit} ${PRIMARY_STABLE_TOKEN.symbol}` : ""}
                {optimisticCreated.deadline ? ` · unlock ${optimisticCreated.deadline}` : " · no deadline"}
              </div>
            </div>
          ) : null}

          {status ? <p className="text-sm text-emerald-300">{status}</p> : null}
          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={handleCreateGoal} disabled={isPending} className="h-12 flex-1 bg-emerald-500 text-base text-slate-950 hover:bg-emerald-400">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
              Create vault on {targetChain.name}
            </Button>
            <Button asChild variant="outline" className="h-12 flex-1 border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10">
              <Link href="/portfolio">
                Open portfolio
                <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-3xl border border-white/10 bg-black/20 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Vault funding balance</div>
              <div className="mt-1 text-sm text-zinc-400">Check what is available before you move to Portfolio for approvals and deposits.</div>
            </div>
          </div>
          <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">Available {PRIMARY_STABLE_TOKEN.symbol}</div>
            <div className="mt-3 text-4xl font-semibold text-zinc-50">{balanceLoading ? "..." : formatBalance(stableBalance?.formatted)}</div>
            <div className="mt-2 text-sm text-zinc-500">Token address: {PRIMARY_STABLE_TOKEN.address.slice(0, 6)}...{PRIMARY_STABLE_TOKEN.address.slice(-4)}</div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/20 p-6 text-sm text-zinc-400">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">What happens next</div>
          <div className="mt-4 space-y-3 leading-6">
            <p>1. Confirm the create transaction in your wallet.</p>
            <p>2. Wait for the onchain receipt before the app reports success.</p>
            <p>3. Portfolio opens with the new vault pre-selected for the next action.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
