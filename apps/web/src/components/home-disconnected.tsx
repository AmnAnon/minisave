"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConnectButton } from "@/components/connect-button";

export function HomeDisconnected() {
  const [isMiniPay, setIsMiniPay] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsMiniPay(Boolean(window.ethereum && (window.ethereum as { isMiniPay?: boolean }).isMiniPay));
  }, []);

  return (
    <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-3xl border border-white/10 bg-black/20 p-6 sm:p-8">
        <h1 className="text-3xl font-semibold text-zinc-50 sm:text-4xl">
          Create a vault and track your savings onchain.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400">
          MiniSave lets you create a personal savings vault, deposit one stable token, and withdraw penalty-free once the vault unlocks.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {isMiniPay ? (
            <Button asChild className="w-full sm:w-auto">
              <Link href="/create">Continue in MiniPay</Link>
            </Button>
          ) : (
            <ConnectButton />
          )}
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/create">Review create flow</Link>
          </Button>
        </div>
        {isMiniPay ? (
          <p className="mt-3 text-sm text-zinc-500">
            MiniPay connects automatically here. If the wallet prompt does not appear, reopen MiniSave inside MiniPay and continue to create your vault.
          </p>
        ) : null}
      </div>

      <div className="space-y-4 rounded-3xl border border-white/10 bg-black/20 p-6">
        <div className="flex items-start gap-3">
          <Wallet className="mt-1 h-5 w-5 text-emerald-300" />
          <div>
            <div className="text-sm font-medium text-zinc-100">Connect and create</div>
            <p className="mt-1 text-sm text-zinc-400">Open a vault for a goal and keep topping it up over time.</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 h-5 w-5 text-emerald-300" />
          <div>
            <div className="text-sm font-medium text-zinc-100">Clear unlock rules</div>
            <p className="mt-1 text-sm text-zinc-400">Withdraw cleanly after the goal is met or the deadline has passed.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
