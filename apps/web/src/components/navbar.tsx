"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Home, Moon, PlusCircle, Sun, WalletCards } from "lucide-react";
import { ConnectButton } from "@/components/connect-button";
import { useTheme } from "@/components/theme-provider";
import { targetChain } from "@/lib/chains";
import { MINISAVE_APP_NAME } from "@/lib/minisave";

const navLinks = [
  { name: "Home", href: "/", icon: Home },
  { name: "Create Vault", href: "/create", icon: PlusCircle },
  { name: "Portfolio", href: "/portfolio", icon: WalletCards },
];

export function Navbar() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/60 glass-strong">
        <div className="container flex min-h-16 max-w-screen-2xl items-center justify-between px-4 py-2">
          <Link href="/" className="group flex min-w-0 items-center gap-3 transition-opacity hover:opacity-90">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-primary/20 transition-shadow group-hover:glow-green-subtle">
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
              <div className="truncate text-sm font-semibold tracking-wide text-foreground">{MINISAVE_APP_NAME}</div>
              <div className="truncate text-[10px] uppercase tracking-[0.18em] text-muted-foreground">MiniPay savings vaults</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${pathname === link.href ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                {link.name}
              </Link>
            ))}

            <div className="flex items-center gap-3">
              <div className="hidden rounded-full border border-border bg-muted/50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground lg:flex">
                Live on {targetChain.name}
              </div>
              <button
                type="button"
                onClick={toggle}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <ConnectButton />
            </div>
          </nav>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 glass-strong px-3 pb-[calc(env(safe-area-inset-bottom)+0.9rem)] pt-3 md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-3 gap-2 rounded-[24px] border border-border bg-card/60 p-2 shadow-[0_14px_50px_rgba(0,0,0,0.15)] backdrop-blur-xl">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center justify-center gap-1 rounded-[18px] px-3 py-3 text-[11px] font-medium transition ${
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
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
