"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Home, PlusCircle, WalletCards } from "lucide-react";
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
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0d1117]/88 backdrop-blur-xl">
        <div className="container flex min-h-16 max-w-screen-2xl items-center justify-between px-4 py-2">
          <Link href="/" className="group flex min-w-0 items-center gap-3 transition-opacity hover:opacity-90">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-emerald-500/20">
              <Image
                src="/logo.jpg"
                alt="MiniSave logo"
                width={40}
                height={40}
                className="object-cover"
                priority
              />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold tracking-wide text-zinc-50">{MINISAVE_APP_NAME}</div>
              <div className="truncate text-[10px] uppercase tracking-[0.18em] text-zinc-500">MiniPay savings vaults</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${pathname === link.href ? "text-emerald-300" : "text-zinc-400 hover:text-zinc-100"}`}
              >
                {link.name}
              </Link>
            ))}

            <div className="flex items-center gap-3">
              <div className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400 lg:flex">
                Live on {targetChain.name}
              </div>
              <ConnectButton />
            </div>
          </nav>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#0d1117]/92 px-3 pb-[calc(env(safe-area-inset-bottom)+0.9rem)] pt-3 backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-3 gap-2 rounded-[24px] border border-white/10 bg-black/30 p-2 shadow-[0_14px_50px_rgba(0,0,0,0.38)]">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center justify-center gap-1 rounded-[18px] px-3 py-3 text-[11px] font-medium transition ${
                  active ? "bg-emerald-500/12 text-emerald-300" : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-100"
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
