"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PiggyBank, PlusCircle, Sparkles, WalletCards } from "lucide-react";

import { ConnectButton } from "@/components/connect-button";
import { targetChain } from "@/lib/chains";
import { MINISAVE_APP_NAME } from "@/lib/minisave";

const navLinks = [
  { name: "Home", href: "/", icon: Home },
  { name: "Create Vault", href: "/create", icon: PlusCircle },
  { name: "Portfolio", href: "/portfolio", icon: WalletCards },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-amber-500/10 bg-[#090704]/90 backdrop-blur-xl">
        <div className="container flex min-h-16 max-w-screen-2xl items-center justify-between px-4 py-2">
          <Link href="/" className="group flex min-w-0 items-center gap-3 transition-opacity hover:opacity-90">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-300 shadow-[0_0_30px_rgba(201,168,76,0.15)]">
              <PiggyBank className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold tracking-wide text-amber-50">{MINISAVE_APP_NAME}</div>
              <div className="truncate text-[10px] uppercase tracking-[0.18em] text-amber-200/45">MiniPay Savings Vaults</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                  pathname === link.href ? "text-amber-300" : "text-amber-100/65 hover:text-amber-50"
                }`}
              >
                {link.name}
              </Link>
            ))}

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300 lg:flex">
                <Sparkles className="h-3.5 w-3.5" /> Live on {targetChain.name}
              </div>
              <ConnectButton />
            </div>
          </nav>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-amber-500/10 bg-[#090704]/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-3 gap-2 rounded-3xl border border-amber-500/10 bg-[#120f0b]/95 p-2 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-3 py-3 text-[11px] font-medium transition ${
                  active
                    ? "bg-amber-500/12 text-amber-300"
                    : "text-amber-100/60 hover:bg-white/[0.03] hover:text-amber-50"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="leading-none">{link.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
