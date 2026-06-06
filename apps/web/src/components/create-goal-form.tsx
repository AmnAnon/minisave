"use client";

import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { ArrowRight, CalendarClock, Loader2, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { piggyBankFactoryAbi, resolveFactoryAddress, toTokenUnits } from "@/lib/contracts";
import { DEFAULT_PENALTY_BPS, PRIMARY_STABLE_TOKEN } from "@/lib/minisave";

function dateToUnixTimestamp(value: string) {
  if (!value) return 0n;
  const parsed = new Date(`${value}T00:00:00Z`);
  return BigInt(Math.floor(parsed.getTime() / 1000));
}

export function CreateGoalForm() {
  const { address, isConnected } = useAccount();
  const factoryAddress = resolveFactoryAddress();
  const { writeContractAsync, isPending } = useWriteContract();

  const [title, setTitle] = useState("Emergency Fund");
  const [targetAmount, setTargetAmount] = useState("50");
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");

  async function handleCreateGoal() {
    setError("");
    setStatus("");

    if (!isConnected || !address) {
      setError("Connect with MiniPay or another wallet first.");
      return;
    }

    if (!factoryAddress) {
      setError("Factory address not set yet. Add NEXT_PUBLIC_FACTORY_ADDRESS after deployment.");
      return;
    }

    if (!title.trim()) {
      setError("Goal title is required.");
      return;
    }

    if (!targetAmount || Number(targetAmount) <= 0) {
      setError("Enter a valid target amount.");
      return;
    }

    try {
      setStatus("Waiting for wallet confirmation...");
      const hash = await writeContractAsync({
        address: factoryAddress,
        abi: piggyBankFactoryAbi,
        functionName: "createVault",
        args: [title.trim(), toTokenUnits(targetAmount), dateToUnixTimestamp(deadline)],
      });

      setStatus(`Vault creation submitted: ${hash.slice(0, 10)}...`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transaction failed.";
      setError(message);
    }
  }

  return (
    <div className="rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
      <div className="grid gap-5">
        <label className="grid gap-2 text-sm font-medium">
          Goal title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-12 rounded-xl border bg-background px-4 outline-none ring-0"
            placeholder="Emergency Fund"
          />
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium">
            Target amount ({PRIMARY_STABLE_TOKEN.symbol})
            <input
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              className="h-12 rounded-xl border bg-background px-4 outline-none"
              placeholder="50"
              inputMode="decimal"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Deadline (optional)
            <div className="flex h-12 items-center gap-2 rounded-xl border bg-background px-4">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              <input
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                type="date"
                className="w-full bg-transparent outline-none"
              />
            </div>
          </label>
        </div>

        <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <Target className="h-4 w-4 text-emerald-600" />
            Live wiring status
          </div>
          <p className="mt-2">
            Vaults are configured for <strong>{PRIMARY_STABLE_TOKEN.symbol}</strong> and a <strong>{DEFAULT_PENALTY_BPS / 100}% early exit penalty</strong>. The token is deploy-time configurable in the factory; no token address is hardcoded in the vault logic.
          </p>
        </div>

        {status ? <p className="text-sm text-emerald-700">{status}</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <Button onClick={handleCreateGoal} disabled={isPending} className="h-12 bg-emerald-600 text-base hover:bg-emerald-700">
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
          Create vault on Celo
        </Button>
      </div>
    </div>
  );
}
