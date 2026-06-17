import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

import { Navbar } from '@/components/navbar';
import { WalletProvider } from "@/components/wallet-provider";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MiniSave',
  description: 'MiniPay-native savings goals on Celo',
  icons: {
    icon: '/logo.jpg',
    apple: '/logo.jpg',
  },
  openGraph: {
    title: 'MiniSave',
    description: 'Commit to a savings goal. Exit early and pay for it.',
    images: [{ url: '/logo.jpg', width: 1024, height: 1024, alt: 'MiniSave' }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta
          name="talentapp:project_verification"
          content="1c401be573d3bf8610233e302462474947e28b1eb760b367cbb47616ea7cecd6553d87b01604869984e272194cc2295d1efdfe5fbb6964cd7e3feb49a09bd793"
        />
      </head>
      <body className={inter.className}>
        <div className="relative flex min-h-screen flex-col">
          <WalletProvider>
            <Navbar />
            <main className="flex-1 pb-32 md:pb-0">
              {children}
            </main>
            <Toaster richColors theme="dark" position="top-center" />
          </WalletProvider>
        </div>
      </body>
    </html>
  );
}
