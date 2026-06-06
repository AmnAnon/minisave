import Link from "next/link";
import { AlertTriangle, ArrowLeft, Home, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl rounded-[32px] border border-amber-500/15 bg-[#0f0c08]/90 p-8 text-center shadow-[0_0_60px_rgba(0,0,0,0.18)]">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-300">
          <AlertTriangle className="h-6 w-6" />
        </div>

        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
          <PiggyBank className="h-3.5 w-3.5" />
          Route not found
        </div>

        <h1 className="text-3xl font-semibold tracking-tight text-amber-50">This page isn’t part of MiniSave</h1>
        <p className="mt-4 text-sm leading-6 text-amber-100/65 sm:text-base">
          MiniPay may have reopened an old or invalid route. Go back to the MiniSave home screen and continue from there.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild className="bg-amber-500 text-black hover:bg-amber-400">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Open Home
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-amber-500/30 text-amber-100 hover:bg-amber-500/10">
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
