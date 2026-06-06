"use client";

import { useMemo, useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { AlertTriangle, CheckCircle2, Loader2, LockKeyhole, PiggyBank, Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  daysLeft,
  erc20Abi,
  formatTokenAmount,
  piggyBankFactoryAbi,
  progressPercent,
  resolveFactoryAddress,
  toTokenUnits,
  vaultUnlocked,
  type VaultView,
} from "@/lib/contracts";
import { DEFAULT_PENALTY_BPS, PRIMARY_STABLE_TOKEN } from "@/lib/minisave";

function shortDate(deadline: bigint) {
  if (deadline === 0n) return "No deadline";
  return new Date(Number(deadline) * 1000).toLocaleDateString();
}

function ProgressRing({ percent }: { percent: number }) {
  const size = 80;
  const stroke = 6;
  const radius = (size - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative h-20 w-20">
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
  const completed = vaults.filter((vault) => vault.deposited >= vault.goalAmount).length;
  const unlocked = vaults.filter((vault) => vaultUnlocked(vault)).length;

  return (
    <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-amber-500/15 bg-[#0f0c08]/80">
      {[
        { label: "Total Saved", value: `${formatTokenAmount(totalDeposited)} ${PRIMARY_STABLE_TOKEN.symbol}` },
        { label: "Goals Met", value: `${completed} / ${vaults.length || 0}` },
        { label: "Unlocked", value: `${unlocked}` },
      ].map((item, index) => (
        <div key={item.label} className={`p-4 ${index < 2 ? "border-r border-amber-500/10" : ""}`}>
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

  const { data: allowance } = useReadContract({
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
  const needsApproval = !allowance || allowance < parsedAmount;
  const remaining = selectedVault.goalAmount > selectedVault.deposited ? selectedVault.goalAmount - selectedVault.deposited : 0n;
  const unlocked = vaultUnlocked(selectedVault);
  const vaultId = BigInt(selectedVaultId);

  async function handleApprove() {
    if (!factoryAddress || !parsedAmount) return;
    setStatus("Waiting for token approval...");
    setError("");
    try {
      const hash = await writeContractAsync({
        abi: erc20Abi,
        address: PRIMARY_STABLE_TOKEN.address,
        functionName: "approve",
        args: [factoryAddress, parsedAmount],
      });
      setStatus(`Approval submitted: ${hash.slice(0, 10)}...`);
      refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed.");
    }
  }

  async function handleDeposit() {
    if (!factoryAddress || !parsedAmount) return;
    setStatus("Waiting for deposit confirmation...");
    setError("");
    try {
      const hash = await writeContractAsync({
        abi: piggyBankFactoryAbi,
        address: factoryAddress,
        functionName: "deposit",
        args: [vaultId, parsedAmount],
      });
      setStatus(`Deposit submitted: ${hash.slice(0, 10)}...`);
      setAmount("");
      refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deposit failed.");
    }
  }

  async function handleWithdraw() {
    if (!factoryAddress) return;
    setStatus("Waiting for withdrawal confirmation...");
    setError("");
    try {
      const hash = await writeContractAsync({
        abi: piggyBankFactoryAbi,
        address: factoryAddress,
        functionName: "withdraw",
        args: [vaultId],
      });
      setStatus(`Withdrawal submitted: ${hash.slice(0, 10)}...`);
      refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Withdrawal failed.");
    }
  }

  return (
    <div className="rounded-3xl border border-amber-500/10 bg-[#0f0c08]/90 p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-amber-200/40">Vault actions</div>
          <h3 className="mt-2 text-2xl font-semibold text-amber-50">{selectedVault.label}</h3>
          <p className="mt-2 text-sm text-amber-100/55">
            {unlocked
              ? "This vault is unlocked. Withdraw without penalty."
              : `Exit early and ${DEFAULT_PENALTY_BPS / 100}% goes to treasury.`}
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

        <div className="flex gap-3">
          <Button
            onClick={needsApproval ? handleApprove : handleDeposit}
            disabled={isPending || !amount || Number(amount) <= 0}
            className="flex-1 bg-amber-500 text-black hover:bg-amber-400"
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
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
    query: { enabled: Boolean(factoryAddress && address) },
  });

  const vaults = useMemo(() => (data as VaultView[] | undefined) ?? [], [data]);
  const selectedVault = selectedVaultId !== null ? vaults[selectedVaultId] ?? null : vaults[0] ?? null;

  if (!isConnected) {
    return (
      <div className="rounded-3xl border border-amber-500/15 bg-[#0f0c08]/90 p-8 text-center text-amber-100/65">
        Connect with MiniPay to load your vaults.
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
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-amber-200/45">Live vaults</div>
          <h2 className="mt-2 text-3xl font-semibold text-amber-50">PiggyBank dashboard</h2>
          <p className="mt-2 text-sm text-amber-100/55">
            Real wallet-connected vaults on Celo. One stablecoin, one clean penalty mechanic.
          </p>
        </div>
        <Button asChild className="bg-amber-500 text-black hover:bg-amber-400">
          <a href="/create"><Plus className="mr-2 h-4 w-4" />New vault</a>
        </Button>
      </div>

      <StatsBar vaults={vaults} />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          {isLoading ? (
            <div className="rounded-3xl border border-amber-500/10 bg-[#0f0c08]/80 p-6 text-sm text-amber-100/60">Loading vaults...</div>
          ) : vaults.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-amber-500/20 bg-[#0f0c08]/80 p-8 text-center text-amber-100/60">
              <PiggyBank className="mx-auto mb-3 h-8 w-8 text-amber-300/70" />
              No vaults yet. Create the first one and start the onchain history.
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
                    <div>
                      <div className="text-lg font-semibold text-amber-50">{vault.label}</div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-amber-200/40">
                        {PRIMARY_STABLE_TOKEN.symbol} · {remainingDays === null ? "goal unlock" : `${remainingDays}d left`}
                      </div>
                    </div>
                    <div className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                      unlocked ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-amber-100/60"
                    }`}>
                      {unlocked ? "Unlocked" : <span className="inline-flex items-center gap-1"><LockKeyhole className="h-3 w-3" /> Locked</span>}
                    </div>
                  </div>

                  <div className="mt-5 flex items-center gap-4">
                    <ProgressRing percent={percent} />
                    <div>
                      <div className="text-xl font-semibold text-amber-50">
                        {formatTokenAmount(vault.deposited)} / {formatTokenAmount(vault.goalAmount)} {PRIMARY_STABLE_TOKEN.symbol}
                      </div>
                      <div className="mt-2 h-2 w-full min-w-40 overflow-hidden rounded-full bg-white/5">
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
