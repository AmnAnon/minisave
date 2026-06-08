"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useAccount, useBalance, usePublicClient, useReadContract, useReadContracts, useWriteContract } from "wagmi";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  LockKeyhole,
  PiggyBank,
  Plus,
  Sparkles,
  TrendingUp,
  Wallet,
  Waves,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NetworkGuard } from "@/components/network-guard";
import { explorerTxUrl } from "@/lib/chains";
import {
  calculatePenaltyBps,
  daysLeft,
  erc20Abi,
  estimatePenaltyAmount,
  formatPenaltyPercent,
  formatTokenAmount,
  penaltyFreeInDays,
  piggyBankFactoryAbi,
  progressPercent,
  resolveFactoryAddress,
  toTokenUnits,
  vaultUnlocked,
  waitForConfirmedReceipt,
  type VaultView,
} from "@/lib/contracts";
import { BASE_PENALTY_BPS, PRIMARY_STABLE_TOKEN } from "@/lib/minisave";
import { useChainGuard } from "@/lib/use-chain-guard";

type VaultRecord = VaultView & { vaultId: number };

type TxBannerState = {
  kind: "idle" | "pending" | "success" | "error";
  title: string;
  detail?: string;
  txHash?: string;
};

type OptimisticState = {
  walletDelta: bigint;
  vaults: Record<number, VaultRecord>;
};

const STARTER_DEPOSIT_QUERY_KEY = "starterDeposit";

function shortDate(deadline: bigint) {
  if (deadline === 0n) return "No deadline";
  return new Date(Number(deadline) * 1000).toLocaleDateString();
}

function weeksUntil(deadline: bigint) {
  if (deadline === 0n) return null;
  const diffMs = Number(deadline) * 1000 - Date.now();
  if (diffMs <= 0) return 0;
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 7)));
}

function formatPlannerAmount(value: number) {
  if (!Number.isFinite(value) || value <= 0) return `0 ${PRIMARY_STABLE_TOKEN.symbol}`;
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: value < 10 ? 1 : 0,
    maximumFractionDigits: value < 10 ? 1 : 2,
  })} ${PRIMARY_STABLE_TOKEN.symbol}`;
}

function formatOptimisticBalance(balanceFormatted: string | undefined, walletDelta: bigint) {
  const base = balanceFormatted ? toTokenUnits(balanceFormatted) : 0n;
  const next = base + walletDelta;
  return formatTokenAmount(next < 0n ? 0n : next);
}

function humanizeError(err: unknown) {
  const message = err instanceof Error ? err.message : "Transaction failed.";
  const lowered = message.toLowerCase();
  if (lowered.includes("user rejected")) return "Transaction rejected in wallet.";
  if (lowered.includes("insufficient funds")) return "Not enough balance or gas for this action.";
  if (lowered.includes("0x2c5211c6") || lowered.includes("execution reverted")) {
    return "This vault cannot be withdrawn in its current state. It may already be closed, empty, or the selected vault id was stale before refresh.";
  }
  return message;
}

function ProgressRing({ percent, size = 80 }: { percent: number; size?: number }) {
  const stroke = size <= 56 ? 5 : 6;
  const radius = (size - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative shrink-0" style={{ height: size, width: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(201,168,76,0.12)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={percent >= 100 ? "#4CAF8A" : "#C9A84C"}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-amber-200">{Math.round(percent)}%</div>
    </div>
  );
}

function PortfolioSummary({
  stableWalletBalance,
  gasWalletBalance,
  vaults,
  animateKey,
}: {
  stableWalletBalance?: string;
  gasWalletBalance?: string;
  vaults: VaultRecord[];
  animateKey: number;
}) {
  const totalDeposited = vaults.reduce((sum, vault) => sum + vault.deposited, 0n);
  const activeVaults = vaults.filter((vault) => vault.deposited > 0n).length;
  const totalWalletDisplay = ((Number(stableWalletBalance || "0") || 0) + (Number(gasWalletBalance || "0") || 0)).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <div
        key={`portfolio-summary-${animateKey}`}
        className="rounded-[30px] border border-amber-500/12 bg-[linear-gradient(180deg,rgba(15,12,8,0.94),rgba(9,7,4,0.9))] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)] animate-[stat-pop_420ms_ease-out]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-200/40">Portfolio balance</div>
            <div className="mt-3 text-4xl font-semibold tracking-tight text-amber-50">{totalWalletDisplay}</div>
            <div className="mt-2 text-sm text-amber-100/55">Overall wallet balance across gas + available deposit assets</div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/15 bg-amber-500/[0.05] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/65">
            <TrendingUp className="h-3.5 w-3.5" /> live
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[22px] border border-amber-500/10 bg-black/20 p-4">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/38">
              <Waves className="h-3.5 w-3.5 text-emerald-300" /> Gas token
            </div>
            <div className="mt-3 text-xl font-semibold text-amber-50">{gasWalletBalance ?? "0"}</div>
            <div className="mt-1 text-sm text-amber-100/55">CELO available</div>
          </div>
          <div className="rounded-[22px] border border-amber-500/10 bg-black/20 p-4">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/38">
              <PiggyBank className="h-3.5 w-3.5 text-amber-300" /> Deposit token
            </div>
            <div className="mt-3 text-xl font-semibold text-amber-50">{stableWalletBalance ?? "0"}</div>
            <div className="mt-1 text-sm text-amber-100/55">{PRIMARY_STABLE_TOKEN.symbol} available in wallet</div>
          </div>
        </div>
      </div>

      <div className="rounded-[30px] border border-amber-500/12 bg-[linear-gradient(180deg,rgba(15,12,8,0.94),rgba(9,7,4,0.9))] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-200/40">Vault investments</div>
            <div className="mt-1 text-sm text-amber-100/55">Compact live cards for capital already parked in vaults</div>
          </div>
          <div className="rounded-full border border-amber-500/15 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-100/60">
            {activeVaults} active
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {vaults.slice(0, 3).map((vault) => {
            const percent = progressPercent(vault);
            const unlocked = vaultUnlocked(vault);
            return (
              <div key={`mini-vault-${vault.vaultId}-${animateKey}`} className="rounded-[24px] border border-amber-500/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold text-amber-50">{vault.label}</div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-amber-200/38">{PRIMARY_STABLE_TOKEN.symbol} · vault #{vault.vaultId}</div>
                  </div>
                  <div className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${unlocked ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-amber-100/60"}`}>
                    {unlocked ? "Unlocked" : `${Math.round(percent)}%`}
                  </div>
                </div>
                <div className="mt-3 text-xl font-semibold text-amber-50">{formatTokenAmount(vault.deposited)} {PRIMARY_STABLE_TOKEN.symbol}</div>
                <div className="mt-1 text-sm text-amber-100/55">of {formatTokenAmount(vault.goalAmount)} {PRIMARY_STABLE_TOKEN.symbol} goal</div>
              </div>
            );
          })}
          {vaults.length === 0 ? (
            <div className="rounded-[24px] border border-amber-500/10 bg-black/20 p-4 text-sm text-amber-100/60">
              No vault investments yet. Create one and start with a smaller first deposit — this flow is meant for gradual saving, not one-shot funding.
            </div>
          ) : null}
        </div>

        <div className="mt-4 text-sm text-amber-100/58">
          Capital parked: <strong>{formatTokenAmount(totalDeposited)} {PRIMARY_STABLE_TOKEN.symbol}</strong>
        </div>
      </div>
    </div>
  );
}

function TxBanner({ tx, chainId }: { tx: TxBannerState; chainId: number }) {
  if (tx.kind === "idle") return null;

  const palette = {
    pending: "border-amber-400/30 bg-[linear-gradient(135deg,rgba(201,168,76,0.16),rgba(201,168,76,0.05))] text-amber-50",
    success: "border-emerald-400/30 bg-[linear-gradient(135deg,rgba(27,151,94,0.22),rgba(27,151,94,0.08))] text-emerald-50",
    error: "border-red-400/30 bg-[linear-gradient(135deg,rgba(180,38,38,0.22),rgba(180,38,38,0.08))] text-red-50",
  } as const;

  const icon = tx.kind === "pending"
    ? <Loader2 className="h-5 w-5 animate-spin" />
    : tx.kind === "success"
      ? <CheckCircle2 className="h-5 w-5" />
      : <AlertTriangle className="h-5 w-5" />;

  return (
    <div className={`sticky top-20 z-20 overflow-hidden rounded-[26px] border p-4 shadow-[0_18px_55px_rgba(0,0,0,0.28)] backdrop-blur-xl ${palette[tx.kind]}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_30%)]" />
      <div className="relative flex items-start gap-3">
        <div className="mt-0.5 rounded-2xl border border-white/10 bg-black/15 p-2">{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">
            <Sparkles className="h-3.5 w-3.5" />
            Transaction status
          </div>
          <div className="mt-1 text-base font-semibold">{tx.title}</div>
          {tx.detail ? <div className="mt-1 text-sm text-white/72">{tx.detail}</div> : null}
        </div>
        {tx.txHash ? (
          <a
            href={explorerTxUrl(tx.txHash, chainId)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white/90 transition hover:bg-white/15"
          >
            Open tx
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </div>
    </div>
  );
}

function EmptyPortfolioState() {
  return (
    <div className="relative overflow-hidden rounded-[32px] border border-amber-500/15 bg-[linear-gradient(180deg,rgba(15,12,8,0.96),rgba(10,8,6,0.92))] p-8 text-center shadow-[0_20px_70px_rgba(0,0,0,0.22)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(201,168,76,0.12),transparent_38%)]" />
      <div className="pointer-events-none absolute left-1/2 top-10 h-32 w-32 -translate-x-1/2 rounded-full bg-amber-500/10 blur-3xl" />

      <div className="relative mx-auto flex h-28 w-28 items-center justify-center rounded-[30px] border border-amber-500/20 bg-[linear-gradient(180deg,rgba(201,168,76,0.16),rgba(201,168,76,0.04))] shadow-[0_20px_50px_rgba(201,168,76,0.12)]">
        <div className="absolute inset-4 rounded-[24px] border border-dashed border-amber-300/20" />
        <PiggyBank className="h-10 w-10 text-amber-300" />
      </div>

      <div className="relative mt-6">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-amber-200/45">No live vaults yet</div>
        <h3 className="mt-3 text-3xl font-semibold text-amber-50">Start your first disciplined pocket</h3>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-amber-100/60">
          Create one vault, fund it once, and Portfolio becomes your live command rail for deposits, penalties, and clean unlocks.
        </p>
      </div>

      <div className="relative mt-7 grid gap-3 text-left sm:grid-cols-3">
        {[
          { step: "01", title: "Create vault", detail: "Name the goal, set target, optionally choose unlock date." },
          { step: "02", title: "Approve + deposit", detail: `Approve ${PRIMARY_STABLE_TOKEN.symbol}, then seed the vault with the first amount.` },
          { step: "03", title: "Track the climb", detail: "Watch progress, avoid penalties, withdraw clean when unlocked." },
        ].map((item) => (
          <div key={item.step} className="rounded-[24px] border border-amber-500/12 bg-black/20 p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-200/40">{item.step}</div>
            <div className="mt-2 text-sm font-semibold text-amber-50">{item.title}</div>
            <div className="mt-2 text-sm leading-6 text-amber-100/55">{item.detail}</div>
          </div>
        ))}
      </div>

      <div className="relative mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild className="bg-amber-500 text-black hover:bg-amber-400">
          <Link href="/create"><Plus className="mr-2 h-4 w-4" />Create first vault</Link>
        </Button>
        <Button asChild variant="outline" className="border-amber-500/25 text-amber-100 hover:bg-amber-500/10">
          <Link href="/create">
            View create flow
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function FirstDepositGuide({
  selectedVault,
  displayedWalletBalance,
  hasDeposit,
}: {
  selectedVault: VaultRecord;
  displayedWalletBalance: string;
  hasDeposit: boolean;
}) {
  if (hasDeposit) return null;

  return (
    <div className="mt-4 rounded-[24px] border border-emerald-500/18 bg-[linear-gradient(180deg,rgba(33,98,69,0.16),rgba(10,20,15,0.08))] p-4 text-sm text-emerald-50 shadow-[0_10px_30px_rgba(15,60,40,0.12)] animate-[vault-rise_360ms_ease-out_forwards]">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-2xl bg-emerald-500/15 p-2 text-emerald-300">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300/80">First deposit onboarding</div>
          <div className="mt-1 text-base font-semibold text-emerald-50">Seed this vault to activate the full portfolio loop</div>
          <div className="mt-2 space-y-1 text-sm leading-6 text-emerald-50/80">
            <p>• Wallet ready: <strong>{displayedWalletBalance} {PRIMARY_STABLE_TOKEN.symbol}</strong></p>
            <p>• Step 1: enter an amount you’re comfortable locking.</p>
            <p>• Step 2: approve once if prompted, then deposit into <strong>{selectedVault.label}</strong>.</p>
            <p>• Step 3: after the first deposit, this card disappears and live progress takes over.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function VaultActionPanel({
  selectedVault,
  displayedWalletBalance,
  suggestedDeposit,
  jumpToDepositMode,
  clearJumpToDepositMode,
  refetch,
  txState,
  setTxState,
  applyOptimisticDeposit,
  revertOptimisticDeposit,
  applyOptimisticWithdraw,
  revertOptimisticWithdraw,
}: {
  selectedVault: VaultRecord;
  displayedWalletBalance: string;
  suggestedDeposit: string;
  jumpToDepositMode: boolean;
  clearJumpToDepositMode: () => void;
  refetch: () => Promise<unknown>;
  txState: TxBannerState;
  setTxState: (state: TxBannerState) => void;
  applyOptimisticDeposit: (vaultId: number, amount: bigint) => void;
  revertOptimisticDeposit: (vaultId: number, amount: bigint) => void;
  applyOptimisticWithdraw: (vault: VaultRecord, walletCredit: bigint) => void;
  revertOptimisticWithdraw: (vault: VaultRecord, walletCredit: bigint) => void;
}) {
  const { address } = useAccount();
  const { isWrongChain, promptSwitchChain, targetChain } = useChainGuard();
  const factoryAddress = resolveFactoryAddress();
  const { writeContractAsync, isPending } = useWriteContract();
  const publicClient = usePublicClient({ chainId: targetChain.id });
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const starterSuggestions = selectedVault.goalAmount <= toTokenUnits("50") ? ["5", "10", "15", "20"] : ["10", "25", "50", "100"];

  useEffect(() => {
    if (!suggestedDeposit) return;
    setAmount((current) => (current ? current : suggestedDeposit));
  }, [suggestedDeposit]);

  useEffect(() => {
    if (!jumpToDepositMode) return;
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [jumpToDepositMode, selectedVault.vaultId]);

  const { refetch: refetchWalletBalance } = useBalance({
    address,
    chainId: targetChain.id,
    token: PRIMARY_STABLE_TOKEN.address,
    query: { enabled: Boolean(address && !isWrongChain), refetchInterval: 4000 },
  });

  const {
    data: allowance,
    refetch: refetchAllowance,
    isFetching: isFetchingAllowance,
  } = useReadContract({
    abi: erc20Abi,
    address: PRIMARY_STABLE_TOKEN.address,
    chainId: targetChain.id,
    functionName: "allowance",
    args: address && factoryAddress ? [address, factoryAddress] : undefined,
    query: { enabled: Boolean(address && factoryAddress && !isWrongChain), refetchInterval: 4000 },
  });

  const parsedAmount = amount ? toTokenUnits(amount) : 0n;
  const hasAmount = Number(amount) > 0;
  const hasDeposit = selectedVault.deposited > 0n;
  const needsApproval = parsedAmount > 0n ? (!allowance || allowance < parsedAmount) : false;
  const remaining = selectedVault.goalAmount > selectedVault.deposited ? selectedVault.goalAmount - selectedVault.deposited : 0n;
  const suggestedDepositValue = suggestedDeposit ? Number(suggestedDeposit) : 0;
  const paceDepositsLeft = suggestedDepositValue > 0 ? Math.ceil(Number(formatTokenAmount(remaining)) / suggestedDepositValue) : null;
  const weeksLeft = weeksUntil(selectedVault.deadline);
  const remainingFormatted = Number(formatTokenAmount(remaining));
  const plannerPresets = useMemo(() => {
    if (remaining <= 0n) return [] as { label: string; amount: string; caption: string }[];

    const fallbackBase = Math.max(remainingFormatted / 4, 10);
    const weeklyTarget = weeksLeft && weeksLeft > 0 ? remainingFormatted / weeksLeft : fallbackBase;

    return [
      { label: "Casual", amount: Math.max(weeklyTarget * 0.7, 5).toFixed(weeksLeft && weeksLeft <= 4 ? 1 : 0), caption: "lighter weekly pace" },
      { label: "Steady", amount: Math.max(weeklyTarget, 5).toFixed(weeksLeft && weeksLeft <= 4 ? 1 : 0), caption: weeksLeft ? `on track for ~${weeksLeft} week${weeksLeft === 1 ? "" : "s"}` : "balanced pace" },
      { label: "Aggressive", amount: Math.max(weeklyTarget * 1.4, 10).toFixed(weeksLeft && weeksLeft <= 4 ? 1 : 0), caption: "faster target lock-in" },
    ].map((preset) => ({
      ...preset,
      amount: `${Number(preset.amount)}`,
    }));
  }, [remaining, remainingFormatted, weeksLeft]);
  const deadlinePlannerText = weeksLeft === null
    ? "No deadline set, so use any pace you like."
    : weeksLeft === 0
      ? "Deadline is here or passed — any new deposit now just closes the remaining gap."
      : `You’ve got about ${weeksLeft} week${weeksLeft === 1 ? "" : "s"} to finish this target.`;
  const unlocked = vaultUnlocked(selectedVault);
  const vaultId = BigInt(selectedVault.vaultId);
  const currentPenaltyBps = calculatePenaltyBps(selectedVault);
  const earlyPenaltyPreview = estimatePenaltyAmount(selectedVault, parsedAmount);
  const penaltyFreeDays = penaltyFreeInDays(selectedVault);
  const isClosed = selectedVault.withdrawn;
  const withdrawPenalty = estimatePenaltyAmount(selectedVault, selectedVault.deposited);
  const netWithdraw = unlocked ? selectedVault.deposited : selectedVault.deposited - withdrawPenalty;

  async function syncAfterTx() {
    await Promise.all([refetchAllowance(), refetchWalletBalance(), refetch()]);
  }

  async function handleApprove() {
    if (!factoryAddress || !parsedAmount) return;
    if (isWrongChain) {
      const message = `Switch to ${targetChain.name} before approving deposits.`;
      setError(message);
      setTxState({ kind: "error", title: "Wrong network", detail: message });
      toast.error(message);
      await promptSwitchChain().catch(() => undefined);
      return;
    }
    setError("");
    setTxState({
      kind: "pending",
      title: `Approving ${amount} ${PRIMARY_STABLE_TOKEN.symbol}`,
      detail: "Waiting for wallet confirmation.",
    });
    toast.loading("Confirm token approval in your wallet...", { id: "vault-approve" });
    try {
      const hash = await writeContractAsync({
        abi: erc20Abi,
        address: PRIMARY_STABLE_TOKEN.address,
        functionName: "approve",
        args: [factoryAddress, parsedAmount],
      });
      setTxState({
        kind: "pending",
        title: `Approval submitted on ${targetChain.name}`,
        detail: "Waiting for confirmed receipt before enabling deposit actions.",
        txHash: hash,
      });
      await waitForConfirmedReceipt(publicClient, hash);
      setTxState({
        kind: "success",
        title: "Approval confirmed",
        detail: `Allowance refreshed for ${amount} ${PRIMARY_STABLE_TOKEN.symbol}. You can deposit now.`,
        txHash: hash,
      });
      toast.success("Approval confirmed.", {
        id: "vault-approve",
        action: {
          label: "Open tx",
          onClick: () => window.open(explorerTxUrl(hash, targetChain.id), "_blank", "noopener,noreferrer"),
        },
      });
      await syncAfterTx();
    } catch (err) {
      const message = humanizeError(err);
      setError(message);
      setTxState({ kind: "error", title: "Approval failed", detail: message });
      toast.error(message, { id: "vault-approve" });
    }
  }

  async function handleDeposit() {
    if (!factoryAddress || !parsedAmount) return;
    if (isWrongChain) {
      const message = `Switch to ${targetChain.name} before depositing.`;
      setError(message);
      setTxState({ kind: "error", title: "Wrong network", detail: message });
      toast.error(message);
      await promptSwitchChain().catch(() => undefined);
      return;
    }
    setError("");
    setTxState({
      kind: "pending",
      title: `Depositing into ${selectedVault.label}`,
      detail: `Submitting ${amount} ${PRIMARY_STABLE_TOKEN.symbol} to vault #${selectedVault.vaultId}.`,
    });
    toast.loading("Confirm deposit in your wallet...", { id: "vault-deposit" });
    applyOptimisticDeposit(selectedVault.vaultId, parsedAmount);
    try {
      const hash = await writeContractAsync({
        abi: piggyBankFactoryAbi,
        address: factoryAddress,
        functionName: "deposit",
        args: [vaultId, parsedAmount],
      });
      setTxState({
        kind: "pending",
        title: `Deposit submitted to ${targetChain.name}`,
        detail: hasDeposit ? "Optimistic balance applied. Waiting for confirmed receipt." : "First deposit inserted instantly. Waiting for chain confirmation.",
        txHash: hash,
      });
      await waitForConfirmedReceipt(publicClient, hash);
      setAmount("");
      toast.success("Deposit confirmed.", {
        id: "vault-deposit",
        description: "Vault and wallet already updated locally; syncing chain truth now.",
        action: {
          label: "Open tx",
          onClick: () => window.open(explorerTxUrl(hash, targetChain.id), "_blank", "noopener,noreferrer"),
        },
      });
      await syncAfterTx();
      clearJumpToDepositMode();
      setTxState({
        kind: "success",
        title: hasDeposit ? "Deposit confirmed" : "First deposit confirmed",
        detail: `Vault #${selectedVault.vaultId} kept its optimistic state and is now chain-synced.`,
        txHash: hash,
      });
    } catch (err) {
      revertOptimisticDeposit(selectedVault.vaultId, parsedAmount);
      const message = humanizeError(err);
      setError(message);
      setTxState({ kind: "error", title: "Deposit failed", detail: message });
      toast.error(message, { id: "vault-deposit" });
    }
  }

  async function handleWithdraw() {
    if (!factoryAddress || isClosed) return;
    if (isWrongChain) {
      const message = `Switch to ${targetChain.name} before withdrawing.`;
      setError(message);
      setTxState({ kind: "error", title: "Wrong network", detail: message });
      toast.error(message);
      await promptSwitchChain().catch(() => undefined);
      return;
    }
    setError("");
    setTxState({
      kind: "pending",
      title: unlocked ? "Processing clean withdrawal" : "Processing early exit",
      detail: unlocked
        ? `Submitting full withdrawal from vault #${selectedVault.vaultId}.`
        : `Submitting early withdrawal from vault #${selectedVault.vaultId} at ${formatPenaltyPercent(currentPenaltyBps)} penalty.`,
    });
    toast.loading(unlocked ? "Confirm withdrawal in your wallet..." : "Confirm early exit in your wallet...", { id: "vault-withdraw" });
    applyOptimisticWithdraw(selectedVault, netWithdraw);
    try {
      const hash = await writeContractAsync({
        abi: piggyBankFactoryAbi,
        address: factoryAddress,
        functionName: "withdraw",
        args: [vaultId],
      });
      setTxState({
        kind: "pending",
        title: unlocked ? "Withdrawal submitted" : "Early exit submitted",
        detail: "Optimistic removal applied. Waiting for confirmed receipt.",
        txHash: hash,
      });
      await waitForConfirmedReceipt(publicClient, hash);
      toast.success(unlocked ? "Withdrawal confirmed." : "Early withdrawal confirmed.", {
        id: "vault-withdraw",
        description: unlocked ? "Full amount should return to your wallet." : `Penalty is currently ${formatPenaltyPercent(currentPenaltyBps)} while locked.`,
        action: {
          label: "Open tx",
          onClick: () => window.open(explorerTxUrl(hash, targetChain.id), "_blank", "noopener,noreferrer"),
        },
      });
      await syncAfterTx();
      setTxState({
        kind: "success",
        title: unlocked ? "Withdrawal confirmed" : "Early exit confirmed",
        detail: unlocked ? "Vault balance returned cleanly and stayed synced." : "Penalty routed to reserve; optimistic exit reconciled with chain.",
        txHash: hash,
      });
    } catch (err) {
      revertOptimisticWithdraw(selectedVault, netWithdraw);
      const message = humanizeError(err);
      setError(message);
      setTxState({ kind: "error", title: "Withdrawal failed", detail: message });
      toast.error(message, { id: "vault-withdraw" });
    }
  }

  return (
    <div className="mt-0 overflow-hidden rounded-[26px] border border-amber-400/16 bg-[linear-gradient(180deg,rgba(201,168,76,0.06),rgba(15,12,8,0.94))] p-4 shadow-[0_10px_28px_rgba(0,0,0,0.16)] sm:p-4.5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/38">Vault actions</div>
          <h3 className="mt-1.5 break-words text-[24px] font-semibold leading-tight text-amber-50">{selectedVault.label}</h3>
          <p className="mt-2 max-w-xl text-sm text-amber-100/58">
            {isClosed
              ? "This vault is already closed. Select another live vault to continue."
              : unlocked
                ? "Unlocked. You can withdraw the full balance cleanly."
                : `Locked. Early exit is currently ${formatPenaltyPercent(currentPenaltyBps)} and decays to 0% by unlock.`}
          </p>
        </div>
        <div className="hidden sm:block">
          <ProgressRing percent={progressPercent(selectedVault)} size={64} />
        </div>
      </div>

      {jumpToDepositMode ? (
        <div className="mt-4 rounded-[24px] border border-emerald-500/18 bg-emerald-500/[0.07] p-4 text-sm text-emerald-100 shadow-[0_10px_24px_rgba(24,120,74,0.16)]">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 p-2 text-emerald-300">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-300/80">Step 2 of 2</div>
              <div className="mt-1 text-base font-semibold text-emerald-50">Your vault is ready — fund it now</div>
              <p className="mt-1 leading-6 text-emerald-100/75">
                We already selected <strong>{selectedVault.label}</strong> and preloaded your starter deposit. Approve once if needed, then make the first contribution.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <FirstDepositGuide selectedVault={selectedVault} displayedWalletBalance={displayedWalletBalance} hasDeposit={hasDeposit} />

      <div className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-amber-500/10 bg-black/20 p-4 transition-all duration-300">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/40">Saved</div>
          <div className="mt-2 text-lg font-semibold text-amber-50">{formatTokenAmount(selectedVault.deposited)} {PRIMARY_STABLE_TOKEN.symbol}</div>
        </div>
        <div className="rounded-2xl border border-amber-500/10 bg-black/20 p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/40">Remaining</div>
          <div className="mt-2 text-lg font-semibold text-amber-50">{formatTokenAmount(remaining)} {PRIMARY_STABLE_TOKEN.symbol}</div>
        </div>
        <div className="rounded-2xl border border-amber-500/10 bg-black/20 p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/40">Penalty now</div>
          <div className="mt-2 text-lg font-semibold text-amber-50">{formatPenaltyPercent(currentPenaltyBps)}</div>
        </div>
        <div className="rounded-2xl border border-amber-500/10 bg-black/20 p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/40">Deadline</div>
          <div className="mt-2 text-lg font-semibold text-amber-50">{shortDate(selectedVault.deadline)}</div>
        </div>
      </div>

      {!unlocked ? (
        <div className="mt-4 rounded-2xl border border-amber-500/15 bg-amber-500/[0.04] p-4 text-sm text-amber-100/65">
          <div>Current penalty: <strong>{formatPenaltyPercent(currentPenaltyBps)}</strong> of any early withdrawal.</div>
          <div className="mt-1">Estimated amount right now: <strong>{formatTokenAmount(withdrawPenalty)} {PRIMARY_STABLE_TOKEN.symbol}</strong>.</div>
          <div className="mt-1">{penaltyFreeDays === null ? `No deadline set, so the ${BASE_PENALTY_BPS / 100}% base penalty stays flat.` : `Penalty-free in ${penaltyFreeDays} day${penaltyFreeDays === 1 ? "" : "s"}.`}</div>
        </div>
      ) : null}

      <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
        <div className="rounded-2xl border border-amber-500/10 bg-black/20 p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/40">Wallet balance</div>
          <div className="mt-2 text-lg font-semibold text-amber-50">{displayedWalletBalance} {PRIMARY_STABLE_TOKEN.symbol}</div>
        </div>
        <div className="rounded-2xl border border-amber-500/10 bg-black/20 p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/40">Withdraw now</div>
          <div className="mt-2 text-lg font-semibold text-amber-50">{formatTokenAmount(netWithdraw)} {PRIMARY_STABLE_TOKEN.symbol}</div>
        </div>
        <div className="rounded-2xl border border-amber-500/10 bg-black/20 p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/40">Reserve cut</div>
          <div className="mt-2 text-lg font-semibold text-amber-50">{unlocked ? `0 ${PRIMARY_STABLE_TOKEN.symbol}` : `${formatTokenAmount(withdrawPenalty)} ${PRIMARY_STABLE_TOKEN.symbol}`}</div>
        </div>
      </div>

      {!unlocked && hasAmount ? (
        <div className="mt-4 rounded-2xl border border-amber-500/15 bg-amber-500/[0.04] p-4 text-sm text-amber-100/65">
          Early-exit preview: depositing {amount} {PRIMARY_STABLE_TOKEN.symbol} under a locked vault means a future break would cost roughly {formatTokenAmount(earlyPenaltyPreview)} {PRIMARY_STABLE_TOKEN.symbol} at the current {formatPenaltyPercent(currentPenaltyBps)} penalty.
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-3">
          <label className="grid gap-2 text-sm font-medium text-amber-100/80">
            Deposit amount ({PRIMARY_STABLE_TOKEN.symbol})
            <input
              ref={inputRef}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="h-12 rounded-xl border border-amber-500/15 bg-black/20 px-4 text-amber-50 outline-none transition focus:border-amber-400/40"
              placeholder={hasDeposit ? "Add 25" : "Start with 10"}
              inputMode="decimal"
              disabled={isClosed}
            />
            {hasAmount ? (
              <p className="text-xs text-amber-100/55">
                {needsApproval
                  ? `Step 1: approve ${amount} ${PRIMARY_STABLE_TOKEN.symbol}.`
                  : `${hasDeposit ? "Top up" : "First deposit"}: add ${amount} ${PRIMARY_STABLE_TOKEN.symbol} into vault #${selectedVault.vaultId}.`}
              </p>
            ) : !hasDeposit ? (
              <p className="text-xs text-emerald-300/80">Tip: start small, then keep returning to top up the goal over time.</p>
            ) : (
              <p className="text-xs text-amber-100/55">Add another contribution whenever you want to push the vault closer to target.</p>
            )}
          </label>

          <div className="flex flex-wrap gap-2">
            {starterSuggestions.map((value) => (
              <button
                key={`${selectedVault.vaultId}-${value}`}
                type="button"
                onClick={() => setAmount(value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${amount === value ? "border-amber-400/30 bg-amber-500/10 text-amber-100" : "border-amber-500/15 bg-black/20 text-amber-100/60 hover:bg-amber-500/5"}`}
                disabled={isClosed}
              >
                {hasDeposit ? `+${value}` : value} {PRIMARY_STABLE_TOKEN.symbol}
              </button>
            ))}
          </div>

          {paceDepositsLeft && remaining > 0n ? (
            <div className="rounded-2xl border border-amber-500/10 bg-black/20 p-3 text-xs leading-6 text-amber-100/58">
              At roughly <strong>{suggestedDeposit || amount} {PRIMARY_STABLE_TOKEN.symbol}</strong> per deposit, you’re about <strong>{paceDepositsLeft} deposit{paceDepositsLeft === 1 ? "" : "s"}</strong> away from the target.
            </div>
          ) : null}

          {remaining > 0n ? (
            <div className="grid gap-3 rounded-[24px] border border-emerald-500/12 bg-emerald-500/[0.05] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-300/80">Pace planner</div>
                  <div className="mt-1 text-sm font-medium text-emerald-50">Choose the saving rhythm you want this vault to follow</div>
                </div>
                <div className="rounded-full border border-emerald-500/18 bg-black/20 px-3 py-1 text-[11px] font-semibold text-emerald-200">
                  {deadlinePlannerText}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                {plannerPresets.map((preset) => (
                  <button
                    key={`${selectedVault.vaultId}-${preset.label}`}
                    type="button"
                    onClick={() => setAmount(preset.amount)}
                    className={`rounded-2xl border px-3 py-3 text-left transition ${amount === preset.amount ? "border-emerald-400/30 bg-emerald-500/12 text-emerald-50" : "border-emerald-500/12 bg-black/20 text-emerald-100/75 hover:bg-emerald-500/[0.06]"}`}
                  >
                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-300/80">{preset.label}</div>
                    <div className="mt-1 text-base font-semibold">{formatPlannerAmount(Number(preset.amount))}</div>
                    <div className="mt-1 text-xs text-emerald-100/55">{preset.caption}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 self-end sm:grid-cols-2">
          <Button
            type="button"
            onClick={needsApproval ? handleApprove : handleDeposit}
            disabled={isPending || isFetchingAllowance || !hasAmount || isClosed}
            className="h-12 w-full bg-amber-500 text-black hover:bg-amber-400"
          >
            {isPending || isFetchingAllowance ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
            {needsApproval ? `Approve ${PRIMARY_STABLE_TOKEN.symbol}` : hasDeposit ? `Deposit ${PRIMARY_STABLE_TOKEN.symbol}` : `Make first deposit`}
          </Button>
          <Button
            type="button"
            onClick={handleWithdraw}
            disabled={isPending || isClosed || selectedVault.deposited === 0n}
            variant="outline"
            className="h-12 w-full border-amber-500/30 text-amber-100 hover:bg-amber-500/10"
          >
            {unlocked ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <AlertTriangle className="mr-2 h-4 w-4" />}
            {unlocked ? "Withdraw cleanly" : `Break early (-${formatPenaltyPercent(currentPenaltyBps)})`}
          </Button>
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
      {txState.kind === "pending" ? (
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-200 animate-pulse">
          <Clock3 className="h-3.5 w-3.5" />
          Processing onchain…
        </div>
      ) : null}
      {txState.kind === "success" ? (
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-200">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Synced with latest onchain balance
        </div>
      ) : null}
    </div>
  );
}

export function VaultDashboard() {
  const searchParams = useSearchParams();
  const { address, isConnected } = useAccount();
  const { isWrongChain, targetChain } = useChainGuard();
  const [selectedVaultId, setSelectedVaultId] = useState<number | null>(null);
  const [txState, setTxState] = useState<TxBannerState>({ kind: "idle", title: "" });
  const [optimisticState, setOptimisticState] = useState<OptimisticState>({ walletDelta: 0n, vaults: {} });
  const [statsAnimateKey, setStatsAnimateKey] = useState(0);
  const [starterDepositSuggestion, setStarterDepositSuggestion] = useState("");
  const [jumpToDepositMode, setJumpToDepositMode] = useState(false);
  const factoryAddress = resolveFactoryAddress();

  const { data: walletBalance, refetch: refetchWalletBalance } = useBalance({
    address,
    chainId: targetChain.id,
    token: PRIMARY_STABLE_TOKEN.address,
    query: { enabled: Boolean(address && !isWrongChain), refetchInterval: 4000 },
  });

  const { data: gasBalance, refetch: refetchGasBalance } = useBalance({
    address,
    chainId: targetChain.id,
    query: { enabled: Boolean(address && !isWrongChain), refetchInterval: 4000 },
  });

  const { data: countData, isLoading: countLoading, refetch } = useReadContract({
    abi: piggyBankFactoryAbi,
    address: factoryAddress || undefined,
    chainId: targetChain.id,
    functionName: "getVaultCount",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(factoryAddress && address && !isWrongChain), refetchInterval: 4000 },
  });

  const vaultCount = Number(countData ?? 0n);
  const vaultCalls = useMemo(
    () =>
      address && factoryAddress
        ? Array.from({ length: vaultCount }, (_, index) => ({
            abi: piggyBankFactoryAbi,
            address: factoryAddress,
            chainId: targetChain.id,
            functionName: "getVault",
            args: [address, BigInt(index)],
          }))
        : [],
    [address, factoryAddress, targetChain.id, vaultCount],
  );

  const { data: vaultResults, isLoading: vaultsLoading, refetch: refetchVaults } = useReadContracts({
    contracts: vaultCalls,
    query: { enabled: vaultCalls.length > 0 && !isWrongChain, refetchInterval: 4000 },
  });

  async function refreshAll() {
    await Promise.all([refetch(), refetchVaults(), refetchWalletBalance(), refetchGasBalance()]);
    setOptimisticState({ walletDelta: 0n, vaults: {} });
    setStatsAnimateKey((current) => current + 1);
  }

  const vaults = useMemo(() => {
    const baseVaults = !vaultResults
      ? ([] as VaultRecord[])
      : vaultResults
          .map((result, index) => {
            if (result.status !== "success") return null;
            const value = result.result;
            if (!value || typeof value !== "object" || !("label" in value)) return null;
            const vault = value as VaultView;
            return { ...vault, vaultId: index } satisfies VaultRecord;
          })
          .filter((vault): vault is VaultRecord => vault !== null && !vault.withdrawn);

    const mergedMap = new Map<number, VaultRecord>();
    for (const vault of baseVaults) mergedMap.set(vault.vaultId, optimisticState.vaults[vault.vaultId] ?? vault);
    for (const optimisticVault of Object.values(optimisticState.vaults)) {
      if (!mergedMap.has(optimisticVault.vaultId)) mergedMap.set(optimisticVault.vaultId, optimisticVault);
    }
    return Array.from(mergedMap.values())
      .filter((vault) => !vault.withdrawn)
      .sort((a, b) => a.vaultId - b.vaultId);
  }, [vaultResults, optimisticState.vaults]);

  function applyOptimisticDeposit(vaultId: number, amount: bigint) {
    setOptimisticState((current) => {
      const existing = current.vaults[vaultId] ?? vaults.find((vault) => vault.vaultId === vaultId);
      if (!existing) return current;
      return {
        walletDelta: current.walletDelta - amount,
        vaults: {
          ...current.vaults,
          [vaultId]: {
            ...existing,
            deposited: existing.deposited + amount,
          },
        },
      };
    });
  }

  function revertOptimisticDeposit(vaultId: number, amount: bigint) {
    setOptimisticState((current) => {
      const existing = current.vaults[vaultId] ?? vaults.find((vault) => vault.vaultId === vaultId);
      if (!existing) return current;
      const nextDeposited = existing.deposited - amount;
      return {
        walletDelta: current.walletDelta + amount,
        vaults: {
          ...current.vaults,
          [vaultId]: {
            ...existing,
            deposited: nextDeposited < 0n ? 0n : nextDeposited,
          },
        },
      };
    });
  }

  function applyOptimisticWithdraw(vault: VaultRecord, walletCredit: bigint) {
    setOptimisticState((current) => ({
      walletDelta: current.walletDelta + walletCredit,
      vaults: {
        ...current.vaults,
        [vault.vaultId]: {
          ...vault,
          withdrawn: true,
          deposited: 0n,
        },
      },
    }));
  }

  function revertOptimisticWithdraw(vault: VaultRecord, walletCredit: bigint) {
    setOptimisticState((current) => ({
      walletDelta: current.walletDelta - walletCredit,
      vaults: {
        ...current.vaults,
        [vault.vaultId]: vault,
      },
    }));
  }

  useEffect(() => {
    const optimistic = searchParams.get("optimistic");
    const vaultIdParam = searchParams.get("vaultId");
    const label = searchParams.get("label");
    const goalAmount = searchParams.get("goalAmount");
    const deadline = searchParams.get("deadline");
    const starterDeposit = searchParams.get(STARTER_DEPOSIT_QUERY_KEY) || "";

    if (optimistic === "1" && vaultIdParam && label && goalAmount) {
      const vaultId = Number(vaultIdParam);
      setOptimisticState((current) => ({
        ...current,
        vaults: {
          ...current.vaults,
          [vaultId]: {
            vaultId,
            label,
            goalAmount: BigInt(goalAmount),
            deadline: BigInt(deadline || "0"),
            deposited: 0n,
            createdAt: BigInt(Math.floor(Date.now() / 1000)),
            withdrawn: false,
          },
        },
      }));
      setSelectedVaultId(vaultId);
      setStarterDepositSuggestion(starterDeposit);
      setJumpToDepositMode(true);
      setTxState({
        kind: "success",
        title: "Vault created",
        detail: `${label} was inserted instantly and will reconcile with onchain reads momentarily.`,
      });
    }
  }, [searchParams]);

  useEffect(() => {
    if (vaults.length > 0 && (selectedVaultId === null || !vaults.some((vault) => vault.vaultId === selectedVaultId))) {
      setSelectedVaultId(vaults[0].vaultId);
    }
  }, [selectedVaultId, vaults]);

  useEffect(() => {
    if (!selectedVaultId) return;
    const starterFromQuery = searchParams.get(STARTER_DEPOSIT_QUERY_KEY) || "";
    if (starterFromQuery) setStarterDepositSuggestion(starterFromQuery);
  }, [selectedVaultId, searchParams]);

  useEffect(() => {
    if (!jumpToDepositMode) return;
    const selectedStillExists = vaults.some((vault) => vault.vaultId === selectedVaultId);
    if (!selectedStillExists) setJumpToDepositMode(false);
  }, [jumpToDepositMode, selectedVaultId, vaults]);

  const selectedVault = selectedVaultId !== null ? vaults.find((vault) => vault.vaultId === selectedVaultId) ?? null : vaults[0] ?? null;
  const isLoading = countLoading || vaultsLoading;
  const displayedWalletBalance = formatOptimisticBalance(walletBalance?.formatted, optimisticState.walletDelta);

  if (!isConnected) {
    return (
      <div className="rounded-3xl border border-amber-500/15 bg-[#0f0c08]/90 p-8 text-center text-amber-100/65">
        Connect with MiniPay to load your live vaults.
      </div>
    );
  }

  if (!factoryAddress) {
    return (
      <div className="rounded-3xl border border-amber-500/15 bg-[#0f0c08]/90 p-8 text-center text-amber-100/65">
        Factory address missing. Set <code>NEXT_PUBLIC_FACTORY_ADDRESS</code> after deployment to enable live reads.
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <TxBanner tx={txState} chainId={targetChain.id} />
      <NetworkGuard />

      <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.03] p-4 text-sm text-amber-100/65">
        If a vault says it was created but does not appear yet, tap <strong>Refresh</strong> and confirm the transaction on the configured explorer from the tx status rail or wallet history.
      </div>

      <div className="rounded-[30px] border border-amber-500/10 bg-[linear-gradient(180deg,rgba(15,12,8,0.92),rgba(9,7,4,0.88))] p-5 shadow-[0_16px_50px_rgba(0,0,0,0.18)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-amber-200/45">Portfolio</div>
            <h2 className="mt-2 text-3xl font-semibold text-amber-50">Your live vaults</h2>
            <p className="mt-2 max-w-2xl text-sm text-amber-100/55">
              Every live vault from this wallet is listed here. Select one card and act directly below it.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-500/15 bg-amber-500/[0.06] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-200/70">
              <TrendingUp className="h-3.5 w-3.5" /> Premium live portfolio rail
            </div>
          </div>
          <div className="flex gap-3">
            <Button type="button" onClick={() => refreshAll()} variant="outline" className="border-amber-500/25 text-amber-100 hover:bg-amber-500/10">
              <ArrowUpRight className="mr-2 h-4 w-4" /> Refresh
            </Button>
            <Button asChild className="bg-amber-500 text-black hover:bg-amber-400">
              <Link href="/create"><Plus className="mr-2 h-4 w-4" />New vault</Link>
            </Button>
          </div>
        </div>
      </div>

      <PortfolioSummary
        stableWalletBalance={displayedWalletBalance}
        gasWalletBalance={gasBalance?.formatted ? Number(gasBalance.formatted).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 }) : "0"}
        vaults={vaults}
        animateKey={statsAnimateKey}
      />

      <div className="space-y-4">
        {isLoading ? (
          <div className="rounded-3xl border border-amber-500/10 bg-[#0f0c08]/80 p-6 text-sm text-amber-100/60">Loading vaults...</div>
        ) : vaults.length === 0 ? (
          <EmptyPortfolioState />
        ) : (
          vaults.map((vault) => {
            const percent = progressPercent(vault);
            const unlocked = vaultUnlocked(vault);
            const remainingDays = daysLeft(vault.deadline);
            const selected = selectedVaultId === vault.vaultId;
            const remainingAmount = vault.goalAmount > vault.deposited ? vault.goalAmount - vault.deposited : 0n;

            return (
              <div
                key={`vault-${vault.vaultId}`}
                className="space-y-0 animate-[vault-rise_420ms_ease-out_forwards] opacity-0"
                style={{ animationDelay: `${Math.min(vault.vaultId * 70, 420)}ms` }}
              >
                <div
                  className={`w-full rounded-[30px] border text-left transition ${
                    selected
                      ? "border-amber-400/40 bg-[linear-gradient(180deg,rgba(201,168,76,0.09),rgba(18,14,10,0.98))] shadow-[0_18px_40px_rgba(0,0,0,0.22)]"
                      : "border-amber-500/10 bg-[linear-gradient(180deg,rgba(15,12,8,0.95),rgba(10,8,6,0.88))] hover:border-amber-500/25"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedVaultId(vault.vaultId)}
                    className={`w-full p-5 text-left ${selected ? "pb-4" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="break-words text-lg font-semibold text-amber-50">{vault.label}</div>
                        <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-amber-200/40">
                          {PRIMARY_STABLE_TOKEN.symbol} · {remainingDays === null ? "goal unlock" : `${remainingDays}d left`} · vault #{vault.vaultId}
                        </div>
                      </div>
                      <div className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                        unlocked ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-amber-100/60"
                      }`}>
                        {unlocked ? "Unlocked" : <span className="inline-flex items-center gap-1"><LockKeyhole className="h-3 w-3" /> Locked</span>}
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-[88px_1fr] sm:items-center">
                      <div className="flex items-center justify-center sm:justify-start">
                        <ProgressRing percent={percent} size={72} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-end justify-between gap-3">
                          <div className="text-xl font-semibold text-amber-50">
                            {formatTokenAmount(vault.deposited)} / {formatTokenAmount(vault.goalAmount)} {PRIMARY_STABLE_TOKEN.symbol}
                          </div>
                          <div className="text-xs font-medium text-amber-100/45">{Math.round(percent)}%</div>
                        </div>
                        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/5">
                          <div className="h-full rounded-full bg-[linear-gradient(90deg,#C9A84C,#E9CF7A)] transition-all duration-300" style={{ width: `${percent}%` }} />
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-amber-100/58 sm:grid-cols-3">
                          <div className="rounded-xl border border-amber-500/10 bg-black/15 px-3 py-2">Target {formatTokenAmount(vault.goalAmount)} {PRIMARY_STABLE_TOKEN.symbol}</div>
                          <div className="rounded-xl border border-amber-500/10 bg-black/15 px-3 py-2">Saved {formatTokenAmount(vault.deposited)} {PRIMARY_STABLE_TOKEN.symbol}</div>
                          <div className="col-span-2 rounded-xl border border-amber-500/10 bg-black/15 px-3 py-2 sm:col-span-1">{unlocked ? "Ready for clean withdraw" : `Penalty ${formatPenaltyPercent(calculatePenaltyBps(vault))}`}</div>
                        </div>
                        <div className="mt-3 rounded-2xl border border-emerald-500/12 bg-emerald-500/[0.05] px-3 py-2 text-xs text-emerald-100/80">
                          {remainingAmount === 0n
                            ? `Goal reached. You can keep it parked or withdraw cleanly when unlocked.`
                            : `${formatTokenAmount(remainingAmount)} ${PRIMARY_STABLE_TOKEN.symbol} left to hit the target. Keep topping up with smaller deposits.`}
                        </div>
                      </div>
                    </div>
                  </button>

                  {selected && selectedVault ? (
                    <div className="px-3 pb-3 sm:px-4 sm:pb-4">
                      <VaultActionPanel
                        selectedVault={vault}
                        displayedWalletBalance={displayedWalletBalance}
                        suggestedDeposit={starterDepositSuggestion}
                        jumpToDepositMode={jumpToDepositMode}
                        clearJumpToDepositMode={() => setJumpToDepositMode(false)}
                        refetch={refreshAll}
                        txState={txState}
                        setTxState={setTxState}
                        applyOptimisticDeposit={applyOptimisticDeposit}
                        revertOptimisticDeposit={revertOptimisticDeposit}
                        applyOptimisticWithdraw={applyOptimisticWithdraw}
                        revertOptimisticWithdraw={revertOptimisticWithdraw}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
