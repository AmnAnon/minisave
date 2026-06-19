"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAccount, useBalance, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { AlertTriangle, CheckCircle2, Clock3, Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { explorerTxUrl } from "@/lib/chains";
import {
  calculatePenaltyBps,
  erc20Abi,
  estimatePenaltyAmount,
  formatPenaltyPercent,
  formatTokenAmount,
  fromTokenUnits,
  penaltyFreeInDays,
  piggyBankFactoryAbi,
  resolveFactoryAddress,
  toTokenUnits,
  vaultUnlocked,
  waitForConfirmedReceipt,
} from "@/lib/contracts";
import { humanizeError } from "@/lib/form-utils";
import { PRIMARY_STABLE_TOKEN } from "@/lib/minisave";
import { useChainGuard } from "@/lib/use-chain-guard";
import type { TxBannerState, VaultRecord } from "@/components/vault-types";

function weeksUntil(deadline: bigint) {
  if (deadline === 0n) return null;
  const diffMs = Number(deadline) * 1000 - Date.now();
  if (diffMs <= 0) return 0;
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 7)));
}

export const VaultActionPanel = memo(function VaultActionPanel({
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

  const { refetch: refetchWalletBalance } = useReadContract({
    abi: erc20Abi,
    address: PRIMARY_STABLE_TOKEN.address,
    chainId: targetChain.id,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && !isWrongChain), refetchInterval: 15_000 },
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
    query: { enabled: Boolean(address && factoryAddress && !isWrongChain), refetchInterval: 15_000 },
  });

  const parsedAmount = amount ? toTokenUnits(amount) : 0n;
  const hasAmount = Number(amount) > 0;
  const hasDeposit = selectedVault.deposited > 0n;
  const needsApproval = parsedAmount > 0n ? (!allowance || allowance < parsedAmount) : false;
  const remaining = selectedVault.goalAmount > selectedVault.deposited ? selectedVault.goalAmount - selectedVault.deposited : 0n;
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
  const unlocked = vaultUnlocked(selectedVault);
  const vaultId = BigInt(selectedVault.vaultId);
  const currentPenaltyBps = calculatePenaltyBps(selectedVault);
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

  function handleAmountChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  }

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
              min="0"
              value={amount}
              onChange={handleAmountChange}
              className="h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-xs text-zinc-50 outline-none transition focus:border-emerald-500/30"
              placeholder={hasDeposit ? "Add 25" : "Start with 10"}
              inputMode="decimal"
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
});
