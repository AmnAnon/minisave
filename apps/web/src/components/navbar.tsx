"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, PiggyBank, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConnectButton } from "@/components/connect-button";
import { MINISAVE_APP_NAME } from "@/lib/minisave";

const navLinks = [
  { name: "Home", href: "/" },
  { name: "Create Vault", href: "/create" },
  { name: "Portfolio", href: "/portfolio" },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-amber-500/10 bg-[#090704]/90 backdrop-blur-xl">
        <div className="container flex min-h-16 max-w-screen-2xl items-center justify-between px-4 py-2">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" size="icon" className="shrink-0 text-amber-100 hover:bg-amber-500/10 md:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>

            <Link href="/" className="group flex min-w-0 items-center gap-3 transition-opacity hover:opacity-90">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-300 shadow-[0_0_30px_rgba(201,168,76,0.15)]">
                <PiggyBank className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold tracking-wide text-amber-50">{MINISAVE_APP_NAME}</div>
                <div className="truncate text-[10px] uppercase tracking-[0.18em] text-amber-200/45">MiniPay Savings Vaults</div>
              </div>
            </Link>
          </div>

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
                <Sparkles className="h-3.5 w-3.5" /> Live on Celo Sepolia
              </div>
              <ConnectButton />
            </div>
          </nav>
        </div>
      </header>

      {mobileOpen ? (
        <>
          <button
            aria-label="Close menu overlay"
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed left-0 top-0 z-50 h-full w-[84%] max-w-sm border-r border-amber-500/15 bg-[#090704] p-6 shadow-2xl md:hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-300">
                  <PiggyBank className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold text-amber-50">{MINISAVE_APP_NAME}</div>
                  <div className="truncate text-[10px] uppercase tracking-[0.18em] text-amber-200/40">MiniPay Savings Vaults</div>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="shrink-0 text-amber-100 hover:bg-amber-500/10" onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <nav className="mt-10 flex flex-col gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between rounded-2xl border px-4 py-4 text-base font-medium transition ${
                    pathname === link.href
                      ? "border-amber-400/30 bg-amber-500/10 text-amber-200"
                      : "border-amber-500/10 bg-white/[0.02] text-amber-100/75 hover:border-amber-500/25 hover:text-amber-50"
                  }`}
                >
                  <span>{link.name}</span>
                </Link>
              ))}
            </nav>

            <div className="mt-6 rounded-2xl border border-emerald-500/15 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              Early exit penalty is on. Stay locked or pay the price.
            </div>

            <div className="mt-6 border-t border-amber-500/10 pt-6">
              <ConnectButton />
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
