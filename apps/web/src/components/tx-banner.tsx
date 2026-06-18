"use client";

import React from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { explorerTxUrl } from "@/lib/chains";
import type { TxBannerState } from "@/components/vault-types";

export const TxBanner = React.memo(function TxBanner({ tx, chainId }: { tx: TxBannerState; chainId: number }) {
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
});
