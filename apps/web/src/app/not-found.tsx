import Link from "next/link";
import { AlertTriangle, ArrowLeft, Home, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl rounded-[32px] border border-white/10 bg-black/20 p-8 text-center shadow-[0_0_60px_rgba(0,0,0,0.18)]">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-emerald-300">
          <AlertTriangle className="h-6 w-6" />
        </div>

        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-300">
          <PiggyBank className="h-3.5 w-3.5 text-emerald-300" />
          Route not found
        </div>

        <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">This page isn’t part of MiniSave</h1>
        <p className="mt-4 text-sm leading-6 text-zinc-400 sm:text-base">
          MiniPay may have reopened an old or invalid route. Go back to the MiniSave home screen and continue from there.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild className="bg-emerald-500 text-slate-950 hover:bg-emerald-400">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Open Home
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10">
            <Link href="/portfolio">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Open Portfolio
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
