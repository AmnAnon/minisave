"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatUnits } from "viem";
import { useAccount, useBalance, useReadContract, useReadContracts } from "wagmi";
import { ArrowUpRight, LockKeyhole, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NetworkGuard } from "@/components/network-guard";
import {
  calculatePenaltyBps,
  daysLeft,
  erc20Abi,
  formatPenaltyPercent,
  formatTokenAmount,
  piggyBankFactoryAbi,
  progressPercent,
  resolveFactoryAddress,
  toTokenUnits,
  vaultUnlocked,
  type VaultView,
} from "@/lib/contracts";
import { formatBalance } from "@/lib/form-utils";
import { BASE_PENALTY_BPS, PRIMARY_STABLE_TOKEN } from "@/lib/minisave";
import { useChainGuard } from "@/lib/use-chain-guard";
import { ProgressRing } from "@/components/progress-ring";
import { TxBanner } from "@/components/tx-banner";
import { VaultActionPanel } from "@/components/vault-action-panel";
import type { OptimisticState, TxBannerState, VaultRecord } from "@/components/vault-types";

const STARTER_DEPOSIT_QUERY_KEY = "starterDeposit";

function formatOptimisticBalance(balanceFormatted: string | undefined, walletDelta: bigint) {
  const base = balanceFormatted ? toTokenUnits(balanceFormatted) : 0n;
  const next = base + walletDelta;
  return formatTokenAmount(next < 0n ? 0n : next);
}

const VaultCard = memo(function VaultCard({
  vault,
  selected,
  onSelect,
}: {
  vault: VaultRecord;
  selected: boolean;
  onSelect: (vaultId: number) => void;
}) {
  const percent = progressPercent(vault);
  const unlocked = vaultUnlocked(vault);
  const remainingDays = daysLeft(vault.deadline);

  return (
    <div
      className={`w-full rounded-[30px] border text-left transition ${
        selected
          ? "border-emerald-500/30 bg-white/5 shadow-[0_18px_40px_rgba(0,0,0,0.22)]"
          : "border-white/10 bg-black/20 hover:border-white/20"
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(vault.vaultId)}
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
    </div>
  );
});

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

  const { data: walletBalanceRaw, refetch: refetchWalletBalance } = useReadContract({
    abi: erc20Abi,
    address: PRIMARY_STABLE_TOKEN.address,
    chainId: targetChain.id,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && !isWrongChain), refetchInterval: 15_000 },
  });

  const walletBalanceFormatted = walletBalanceRaw !== undefined
    ? formatUnits(walletBalanceRaw, PRIMARY_STABLE_TOKEN.decimals)
    : undefined;

  const { data: gasBalance, refetch: refetchGasBalance } = useBalance({
    address,
    chainId: targetChain.id,
    query: { enabled: Boolean(address && !isWrongChain), refetchInterval: 15_000 },
  });

  const { data: countData, isLoading: countLoading, error: countError, refetch } = useReadContract({
    abi: piggyBankFactoryAbi,
    address: factoryAddress || undefined,
    chainId: targetChain.id,
    functionName: "getVaultCount",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(factoryAddress && address && !isWrongChain), refetchInterval: 15_000 },
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

  const { data: vaultResults, isLoading: vaultsLoading, error: vaultsError, refetch: refetchVaults } = useReadContracts({
    contracts: vaultCalls,
    query: { enabled: vaultCalls.length > 0 && !isWrongChain, refetchInterval: 15_000 },
  });

  const refreshAll = useCallback(async () => {
    await Promise.all([refetch(), refetchVaults(), refetchWalletBalance(), refetchGasBalance()]);
    setOptimisticState({ walletDelta: 0n, vaults: {} });
    setStatsAnimateKey((current) => current + 1);
  }, [refetch, refetchVaults, refetchWalletBalance, refetchGasBalance]);

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
      try {
        const vaultId = Number(vaultIdParam);
        const goalAmountBigInt = BigInt(goalAmount);
        const deadlineBigInt = BigInt(deadline || "0");

        setOptimisticState((current) => ({
          ...current,
          vaults: {
            ...current.vaults,
            [vaultId]: {
              vaultId,
              label,
              goalAmount: goalAmountBigInt,
              deadline: deadlineBigInt,
              deposited: 0n,
              createdAt: BigInt(Math.floor(Date.now() / 1000)),
              withdrawn: false,
              penaltyBps: BigInt(BASE_PENALTY_BPS),
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
      } catch {
        // Malformed URL params — ignore optimistic handoff
      }
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
  const displayedWalletBalance = formatOptimisticBalance(walletBalanceFormatted, optimisticState.walletDelta);
  const readError = countError || vaultsError;

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
          <Button type="button" onClick={refreshAll} variant="outline" size="sm" className="h-9 border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10">
            <ArrowUpRight className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button asChild size="sm" className="h-9 bg-emerald-500 text-slate-950 hover:bg-emerald-400">
            <Link href="/create"><Plus className="mr-2 h-4 w-4" />New Vault</Link>
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-[30px] border border-border bg-card/60 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <div className="mt-4 grid grid-cols-[80px_1fr] gap-4 items-center">
                  <Skeleton className="h-[80px] w-[80px] rounded-full" />
                  <div className="grid grid-cols-2 gap-2">
                    {[1, 2, 3, 4].map((j) => (
                      <Skeleton key={j} className="h-14 rounded-xl" />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : readError ? (
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-center">
            <p className="text-sm font-medium text-red-200">Failed to load vaults</p>
            <p className="mt-1 text-xs text-red-300/70">{readError.message?.slice(0, 120) || "Unknown error"}</p>
            <Button onClick={refreshAll} variant="outline" size="sm" className="mt-3 h-8 border-red-500/20 text-red-200 hover:bg-red-500/10">
              Retry
            </Button>
          </div>
        ) : vaults.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-center text-sm text-zinc-400">
            No active vaults yet.
          </div>
        ) : (
          vaults.map((vault) => {
            const selected = selectedVaultId === vault.vaultId;

            return (
              <div
                key={`vault-${vault.vaultId}`}
                className="space-y-0 animate-[vault-rise_420ms_ease-out_forwards] opacity-0"
                style={{ animationDelay: `${Math.min(vault.vaultId * 70, 420)}ms` }}
              >
                <VaultCard vault={vault} selected={selected} onSelect={setSelectedVaultId} />

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
            );
          })
        )}
      </div>
    </section>
  );
}
