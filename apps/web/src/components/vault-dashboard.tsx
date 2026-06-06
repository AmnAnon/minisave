"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { AlertTriangle, ArrowUpRight, CheckCircle2, Loader2, LockKeyhole, PiggyBank, Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  daysLeft,
  erc20Abi,
  formatTokenAmount,
  piggyBankFactoryAbi,
  progressPercent,
  resolveFactoryAddress,
  toTokenUnits,
  txUrl,
  vaultUnlocked,
  type VaultView,
} from "@/lib/contracts";
import { DEFAULT_PENALTY_BPS, PRIMARY_STABLE_TOKEN } from "@/lib/minisave";

function shortDate(deadline: bigint) {
  if (deadline === 0n) return "No deadline";
  return new Date(Number(deadline) * 1000).toLocaleDateString();
}

function humanizeError(err: unknown) {
  const message = err instanceof Error ? err.message : "Transaction failed.";
  if (message.toLowerCase().includes("user rejected")) return "Transaction rejected in wallet.";
  if (message.toLowerCase().includes("insufficient funds")) return "Not enough balance or gas for this action.";
  return message;
}

function ProgressRing({ percent }: { percent: number }) {
  const size = 80;
  const stroke = 6;
  const radius = (size - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative h-20 w-20 shrink-0">
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

function StatsBar({ vaults }: { vaults: VaultView[] }) {
  const totalDeposited = vaults.reduce((sum, vault) => sum + vault.deposited, 0n);
  const totalTarget = vaults.reduce((sum, vault) => sum + vault.goalAmount, 0n);
  const completed = vaults.filter((vault) => vault.deposited >= vault.goalAmount).length;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {[
        { label: "Live positions", value: `${vaults.length}` },
        { label: "Total saved", value: `${formatTokenAmount(totalDeposited)} ${PRIMARY_STABLE_TOKEN.symbol}` },
        { label: "Total targets", value: `${formatTokenAmount(totalTarget)} ${PRIMARY_STABLE_TOKEN.symbol}` },
        { label: "Goals hit", value: `${completed}` },
      ].map((item) => (
        <div key={item.label} className="rounded-2xl border border-amber-500/15 bg-[#0f0c08]/80 p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/45">{item.label}</div>
          <div className="mt-2 text-sm font-semibold text-amber-50">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function DepositPanel({
  selectedVault,
  selectedVaultId,
  refetch,
}: {
  selectedVault: VaultView | null;
  selectedVaultId: number | null;
  refetch: () => void;
}) {
  const { address } = useAccount();
  const factoryAddress = resolveFactoryAddress();
  const { writeContractAsync, isPending } = useWriteContract();
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const {
    data: allowance,
    refetch: refetchAllowance,
    isFetching: isFetchingAllowance,
  } = useReadContract({
    abi: erc20Abi,
    address: PRIMARY_STABLE_TOKEN.address,
    functionName: "allowance",
    args: address && factoryAddress ? [address, factoryAddress] : undefined,
    query: { enabled: Boolean(address && factoryAddress) },
  });

  if (!selectedVault || selectedVaultId === null) {
    return (
      <div className="rounded-3xl border border-amber-500/10 bg-[#0f0c08]/80 p-6 text-sm text-amber-100/60">
        Select a vault to approve, deposit, or withdraw.
      </div>
    );
  }

  const parsedAmount = amount ? toTokenUnits(amount) : 0n;
  const hasAmount = Number(amount) > 0;
  const needsApproval = parsedAmount > 0n ? (!allowance || allowance < parsedAmount) : false;
  const remaining = selectedVault.goalAmount > selectedVault.deposited ? selectedVault.goalAmount - selectedVault.deposited : 0n;
  const unlocked = vaultUnlocked(selectedVault);
  const vaultId = BigInt(selectedVaultId);
  const earlyPenaltyPreview = (parsedAmount * BigInt(DEFAULT_PENALTY_BPS)) / 10_000n;

  async function handleApprove() {
    if (!factoryAddress || !parsedAmount) return;
    setStatus("Waiting for token approval...");
    setError("");
    toast.loading("Confirm token approval in your wallet...", { id: "vault-approve" });
    try {
      const hash = await writeContractAsync({
        abi: erc20Abi,
        address: PRIMARY_STABLE_TOKEN.address,
        functionName: "approve",
        args: [factoryAddress, parsedAmount],
      });
      setStatus(`Approval submitted: ${hash.slice(0, 10)}... Waiting for allowance refresh...`);
      toast.success("Approval submitted.", {
        id: "vault-approve",
        action: {
          label: "Open tx",
          onClick: () => window.open(txUrl(hash), "_blank", "noopener,noreferrer"),
        },
      });
      await Promise.all([refetchAllowance(), refetch()]);
      setStatus(`Approval confirmed. You can now deposit ${PRIMARY_STABLE_TOKEN.symbol}.`);
    } catch (err) {
      const message = humanizeError(err);
      setError(message);
      toast.error(message, { id: "vault-approve" });
    }
  }

  async function handleDeposit() {
    if (!factoryAddress || !parsedAmount) return;
    setStatus("Waiting for deposit confirmation...");
    setError("");
    toast.loading("Confirm deposit in your wallet...", { id: "vault-deposit" });
    try {
      const hash = await writeContractAsync({
        abi: piggyBankFactoryAbi,
        address: factoryAddress,
        functionName: "deposit",
        args: [vaultId, parsedAmount],
      });
      setStatus(`Deposit submitted: ${hash.slice(0, 10)}...`);
      setAmount("");
      toast.success("Deposit submitted.", {
        id: "vault-deposit",
        description: "Refreshing your vaults.",
        action: {
          label: "Open tx",
          onClick: () => window.open(txUrl(hash), "_blank", "noopener,noreferrer"),
        },
      });
      await Promise.all([refetchAllowance(), refetch()]);
      setStatus("Deposit confirmed. Portfolio refreshed.");
    } catch (err) {
      const message = humanizeError(err);
      setError(message);
      toast.error(message, { id: "vault-deposit" });
    }
  }

  async function handleWithdraw() {
    if (!factoryAddress) return;
    setStatus("Waiting for withdrawal confirmation...");
    setError("");
    toast.loading(unlocked ? "Confirm withdrawal in your wallet..." : "Confirm early exit in your wallet...", { id: "vault-withdraw" });
    try {
      const hash = await writeContractAsync({
        abi: piggyBankFactoryAbi,
        address: factoryAddress,
        functionName: "withdraw",
        args: [vaultId],
      });
      setStatus(`Withdrawal submitted: ${hash.slice(0, 10)}...`);
      toast.success(unlocked ? "Withdrawal submitted." : "Early withdrawal submitted.", {
        id: "vault-withdraw",
        description: unlocked ? "Full amount should return to your wallet." : `Penalty remains ${DEFAULT_PENALTY_BPS / 100}% while locked.`,
        action: {
          label: "Open tx",
          onClick: () => window.open(txUrl(hash), "_blank", "noopener,noreferrer"),
        },
      });
      await Promise.all([refetchAllowance(), refetch()]);
    } catch (err) {
      const message = humanizeError(err);
      setError(message);
      toast.error(message, { id: "vault-withdraw" });
    }
  }

  return (
    <div className="rounded-3xl border border-amber-500/10 bg-[#0f0c08]/90 p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-amber-200/40">Selected vault</div>
          <h3 className="mt-2 break-words text-2xl font-semibold text-amber-50">{selectedVault.label}</h3>
          <p className="mt-2 text-sm text-amber-100/55">
            {unlocked
              ? "Unlocked. Withdraw the full balance."
              : `Still locked. Early exit routes ${DEFAULT_PENALTY_BPS / 100}% to the public reserve.`}
          </p>
        </div>
        <ProgressRing percent={progressPercent(selectedVault)} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-amber-500/10 bg-amber-500/[0.03] p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/40">Saved</div>
          <div className="mt-2 text-lg font-semibold text-amber-50">{formatTokenAmount(selectedVault.deposited)} {PRIMARY_STABLE_TOKEN.symbol}</div>
        </div>
        <div className="rounded-2xl border border-amber-500/10 bg-amber-500/[0.03] p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/40">Remaining</div>
          <div className="mt-2 text-lg font-semibold text-amber-50">{formatTokenAmount(remaining)} {PRIMARY_STABLE_TOKEN.symbol}</div>
        </div>
        <div className="rounded-2xl border border-amber-500/10 bg-amber-500/[0.03] p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/40">Deadline</div>
          <div className="mt-2 text-lg font-semibold text-amber-50">{shortDate(selectedVault.deadline)}</div>
        </div>
      </div>

      {!unlocked && hasAmount ? (
        <div className="mt-4 rounded-2xl border border-amber-500/15 bg-amber-500/[0.04] p-4 text-sm text-amber-100/65">
          Early-exit preview: depositing {amount} {PRIMARY_STABLE_TOKEN.symbol} under a locked vault means a future break would cost roughly {formatTokenAmount(earlyPenaltyPreview)} {PRIMARY_STABLE_TOKEN.symbol} in penalty at current settings.
        </div>
      ) : null}

      <div className="mt-6 space-y-4">
        <label className="grid gap-2 text-sm font-medium text-amber-100/80">
          Deposit amount ({PRIMARY_STABLE_TOKEN.symbol})
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="h-12 rounded-xl border border-amber-500/15 bg-black/20 px-4 text-amber-50 outline-none"
            placeholder="10"
            inputMode="decimal"
          />
        </label>

        {hasAmount ? (
          <p className="text-xs text-amber-100/55">
            {needsApproval
              ? `Step 1: approve ${amount} ${PRIMARY_STABLE_TOKEN.symbol}.`
              : `Step 2: deposit ${amount} ${PRIMARY_STABLE_TOKEN.symbol} into this vault.`}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={needsApproval ? handleApprove : handleDeposit}
            disabled={isPending || isFetchingAllowance || !hasAmount}
            className="flex-1 bg-amber-500 text-black hover:bg-amber-400"
          >
            {isPending || isFetchingAllowance ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
            {needsApproval ? `Approve ${PRIMARY_STABLE_TOKEN.symbol}` : `Deposit ${PRIMARY_STABLE_TOKEN.symbol}`}
          </Button>
          <Button onClick={handleWithdraw} variant="outline" className="flex-1 border-amber-500/30 text-amber-100 hover:bg-amber-500/10">
            {unlocked ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <AlertTriangle className="mr-2 h-4 w-4" />}
            {unlocked ? "Withdraw" : `Break early (-${DEFAULT_PENALTY_BPS / 100}%)`}
          </Button>
        </div>

        {status ? <p className="text-sm text-emerald-400">{status}</p> : null}
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </div>
    </div>
  );
}

export function VaultDashboard() {
  const { address, isConnected } = useAccount();
  const [selectedVaultId, setSelectedVaultId] = useState<number | null>(null);
  const factoryAddress = resolveFactoryAddress();

  const { data, isLoading, refetch } = useReadContract({
    abi: piggyBankFactoryAbi,
    address: factoryAddress || undefined,
    functionName: "getVaults",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(factoryAddress && address), refetchInterval: 6000 },
  });

  const vaults = useMemo(() => (data as VaultView[] | undefined) ?? [], [data]);

  useEffect(() => {
    if (vaults.length > 0 && (selectedVaultId === null || !vaults[selectedVaultId])) {
      setSelectedVaultId(0);
    }
  }, [selectedVaultId, vaults]);

  const selectedVault = selectedVaultId !== null ? vaults[selectedVaultId] ?? null : vaults[0] ?? null;

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
      <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.03] p-4 text-sm text-amber-100/65">
        If a vault says it was created but does not appear yet, tap <strong>Refresh</strong> and confirm the transaction on Blockscout from the toast or wallet history link above.
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-amber-200/45">Portfolio</div>
          <h2 className="mt-2 text-3xl font-semibold text-amber-50">Your live vaults</h2>
          <p className="mt-2 max-w-2xl text-sm text-amber-100/55">
            Every vault created by this wallet is listed here. Approve, deposit, and withdraw from one panel.
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => refetch()} variant="outline" className="border-amber-500/25 text-amber-100 hover:bg-amber-500/10">
            <ArrowUpRight className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button asChild className="bg-amber-500 text-black hover:bg-amber-400">
            <Link href="/create"><Plus className="mr-2 h-4 w-4" />New vault</Link>
          </Button>
        </div>
      </div>

      <StatsBar vaults={vaults} />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          {isLoading ? (
            <div className="rounded-3xl border border-amber-500/10 bg-[#0f0c08]/80 p-6 text-sm text-amber-100/60">Loading vaults...</div>
          ) : vaults.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-amber-500/20 bg-[#0f0c08]/80 p-8 text-center text-amber-100/60">
              <PiggyBank className="mx-auto mb-3 h-8 w-8 text-amber-300/70" />
              No vaults yet. Create the first vault, then come back here to manage it.
            </div>
          ) : (
            vaults.map((vault, index) => {
              const percent = progressPercent(vault);
              const unlocked = vaultUnlocked(vault);
              const remainingDays = daysLeft(vault.deadline);
              const selected = (selectedVaultId ?? 0) === index;

              return (
                <button
                  key={`${vault.label}-${index}`}
                  onClick={() => setSelectedVaultId(index)}
                  className={`w-full rounded-3xl border p-5 text-left transition ${
                    selected ? "border-amber-400/40 bg-amber-500/[0.06]" : "border-amber-500/10 bg-[#0f0c08]/80 hover:border-amber-500/25"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="break-words text-lg font-semibold text-amber-50">{vault.label}</div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-amber-200/40">
                        {PRIMARY_STABLE_TOKEN.symbol} · {remainingDays === null ? "goal unlock" : `${remainingDays}d left`}
                      </div>
                    </div>
                    <div className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                      unlocked ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-amber-100/60"
                    }`}>
                      {unlocked ? "Unlocked" : <span className="inline-flex items-center gap-1"><LockKeyhole className="h-3 w-3" /> Locked</span>}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
                    <ProgressRing percent={percent} />
                    <div className="min-w-0 flex-1">
                      <div className="text-xl font-semibold text-amber-50">
                        {formatTokenAmount(vault.deposited)} / {formatTokenAmount(vault.goalAmount)} {PRIMARY_STABLE_TOKEN.symbol}
                      </div>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/5">
                        <div className="h-full rounded-full bg-amber-400" style={{ width: `${percent}%` }} />
                      </div>
                      <div className="mt-2 text-sm text-amber-100/55">
                        {Math.round(percent)}% complete · {vault.withdrawn ? "closed" : unlocked ? "withdraw cleanly" : `exit early costs ${DEFAULT_PENALTY_BPS / 100}%`}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <DepositPanel selectedVault={selectedVault} selectedVaultId={selectedVault ? (selectedVaultId ?? 0) : null} refetch={refetch} />
      </div>
    </section>
  );
}
