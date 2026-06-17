"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useAccount, useBalance, usePublicClient, useReadContract, useReadContracts, useWriteContract } from "wagmi";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  LockKeyhole,
  Plus,
  Sparkles,
  TrendingUp,
  Wallet,
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
  fromTokenUnits,
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

function weeksUntil(deadline: bigint) {
  if (deadline === 0n) return null;
  const diffMs = Number(deadline) * 1000 - Date.now();
  if (diffMs <= 0) return 0;
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 7)));
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
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={percent >= 100 ? "#4CAF8A" : "#10b981"}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-zinc-200">{Math.round(percent)}%</div>
    </div>
  );
}


function TxBanner({ tx, chainId }: { tx: TxBannerState; chainId: number }) {
  if (tx.kind === "idle") return null;

  const palette = {
    pending: "border-white/10 bg-[linear-gradient(135deg,rgba(16,185,129,0.16),rgba(16,185,129,0.05))] text-zinc-50",
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
    <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-center text-sm text-zinc-400">
      No active vaults yet.
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

  const balanceExceeded = hasAmount && parsedAmount > toTokenUnits(displayedWalletBalance);

  const handleMaxClick = () => {
    const walletMax = Number(displayedWalletBalance || "0");
    const remainingMax = fromTokenUnits(remaining);
    const maxVal = remainingMax > 0 && remainingMax < walletMax ? remainingMax : walletMax;
    setAmount(maxVal.toString());
  };

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
    <div className="mt-3 pt-3 border-t border-white/5 space-y-4">
      {jumpToDepositMode ? (
        <div className="rounded-xl border border-emerald-500/18 bg-emerald-500/[0.05] p-3 text-xs text-emerald-100">
          <p className="font-semibold text-emerald-50">Vault ready — fund it now</p>
          <p className="mt-1 text-emerald-100/70">
            We already preloaded your starter deposit. Approve once if needed, then make the contribution.
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-zinc-500">
            <span>Deposit amount ({PRIMARY_STABLE_TOKEN.symbol})</span>
            <span>Wallet: {displayedWalletBalance} {PRIMARY_STABLE_TOKEN.symbol}</span>
          </div>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="number"
              step="any"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-xs text-zinc-50 outline-none transition focus:border-emerald-500/30"
              placeholder={hasDeposit ? "Add 25" : "Start with 10"}
              inputMode="decimal"
              pattern="[0-9]*"
              disabled={isClosed}
            />
            <button
              type="button"
              onClick={handleMaxClick}
              className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
              disabled={isClosed}
            >
              MAX
            </button>
            <div className="flex gap-1.5">
              {starterSuggestions.map((value) => (
                <button
                  key={`${selectedVault.vaultId}-${value}`}
                  type="button"
                  onClick={() => setAmount(value)}
                  className={`rounded-lg border px-2.5 text-xs font-semibold transition ${amount === value ? "border-white/20 bg-white/10 text-zinc-100" : "border-white/10 bg-black/20 text-zinc-400 hover:bg-white/5"}`}
                  disabled={isClosed}
                >
                  {hasDeposit ? `+${value}` : value}
                </button>
              ))}
            </div>
          </div>
          {balanceExceeded ? (
            <p className="text-[11px] font-medium text-red-400 animate-pulse">
              Warning: Amount exceeds your available wallet balance.
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          onClick={needsApproval ? handleApprove : handleDeposit}
          disabled={isPending || isFetchingAllowance || !hasAmount || isClosed}
          className="h-10 bg-emerald-500 text-slate-950 hover:bg-emerald-400 text-xs font-semibold"
        >
          {isPending || isFetchingAllowance ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Wallet className="mr-1 h-3.5 w-3.5" />}
          {needsApproval ? `Approve ${PRIMARY_STABLE_TOKEN.symbol}` : hasDeposit ? `Deposit ${PRIMARY_STABLE_TOKEN.symbol}` : `Make first deposit`}
        </Button>
        <Button
          type="button"
          onClick={handleWithdraw}
          disabled={isPending || isClosed || selectedVault.deposited === 0n}
          variant="outline"
          className="h-10 border-white/10 text-zinc-100 hover:bg-white/5 text-xs font-semibold"
        >
          {unlocked ? <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-emerald-400" /> : <AlertTriangle className="mr-1 h-3.5 w-3.5 text-amber-500" />}
          {unlocked ? "Withdraw cleanly" : `Break early (-${formatPenaltyPercent(currentPenaltyBps)})`}
        </Button>
      </div>

      {error ? <p className="text-xs text-red-400">{error}</p> : null}
      {txState.kind === "pending" ? (
        <div className="inline-flex items-center gap-1.5 text-xs text-zinc-400 animate-pulse">
          <Clock3 className="h-3 w-3" />
          Processing onchain…
        </div>
      ) : null}
      {txState.kind === "success" ? (
        <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
          <CheckCircle2 className="h-3 w-3" />
          Synced onchain
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
      <div className="rounded-3xl border border-white/10 bg-black/20 p-8 text-center text-zinc-400">
        Connect with MiniPay to load your live vaults.
      </div>
    );
  }

  if (!factoryAddress) {
    return (
      <div className="rounded-3xl border border-white/10 bg-black/20 p-8 text-center text-zinc-400">
        Factory address missing. Set <code>NEXT_PUBLIC_FACTORY_ADDRESS</code> after deployment to enable live reads.
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <TxBanner tx={txState} chainId={targetChain.id} />
      <NetworkGuard />

      <div className="flex items-center justify-between gap-4 font-mono">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Your Vaults</h2>
        <div className="flex gap-2">
          <Button type="button" onClick={() => refreshAll()} variant="outline" size="sm" className="h-9 border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10">
            <ArrowUpRight className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button asChild size="sm" className="h-9 bg-emerald-500 text-slate-950 hover:bg-emerald-400">
            <Link href="/create"><Plus className="mr-2 h-4 w-4" />New Vault</Link>
          </Button>
        </div>
      </div>



      <div className="space-y-4">
        {isLoading ? (
          <div className="rounded-3xl border border-white/10 bg-black/20 p-6 text-sm text-zinc-400">Loading vaults...</div>
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
                      ? "border-emerald-500/30 bg-white/5 shadow-[0_18px_40px_rgba(0,0,0,0.22)]"
                      : "border-white/10 bg-black/20 hover:border-white/20"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedVaultId(vault.vaultId)}
                    className={`w-full p-5 text-left ${selected ? "pb-4" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="break-words text-lg font-semibold text-zinc-50">{vault.label}</div>
                        <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-zinc-200/40">
                          {PRIMARY_STABLE_TOKEN.symbol} · {remainingDays === null ? "goal unlock" : `${remainingDays}d left`} · vault #{vault.vaultId}
                        </div>
                      </div>
                      <div className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                        unlocked ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-zinc-400"
                      }`}>
                        {unlocked ? "Unlocked" : <span className="inline-flex items-center gap-1"><LockKeyhole className="h-3 w-3" /> Locked</span>}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-[80px_1fr] gap-4 items-center">
                      <div className="shrink-0">
                        <ProgressRing percent={percent} size={80} />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400">
                        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Saved</div>
                          <div className="mt-0.5 font-bold text-zinc-200">{formatTokenAmount(vault.deposited)} {PRIMARY_STABLE_TOKEN.symbol}</div>
                        </div>
                        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Target</div>
                          <div className="mt-0.5 font-bold text-zinc-200">{formatTokenAmount(vault.goalAmount)} {PRIMARY_STABLE_TOKEN.symbol}</div>
                        </div>
                        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Penalty</div>
                          <div className="mt-0.5 font-bold text-zinc-200">{unlocked ? "0%" : formatPenaltyPercent(calculatePenaltyBps(vault))}</div>
                        </div>
                        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Timeline</div>
                          <div className="mt-0.5 font-bold text-zinc-200">{remainingDays === null ? "No deadline" : `${remainingDays}d left`}</div>
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
