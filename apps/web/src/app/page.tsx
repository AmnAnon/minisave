"use client";

import { useAccount } from "wagmi";
import { HomeConnected } from "@/components/home-connected";
import { HomeDisconnected } from "@/components/home-disconnected";
import { HomeHowItWorks } from "@/components/home-how-it-works";
import { HomeTrustStrip } from "@/components/home-trust-strip";

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-6 sm:gap-10 sm:py-8">
      {isConnected ? (
        <HomeConnected />
      ) : (
        <>
          <HomeDisconnected />
          <HomeHowItWorks />
          <HomeTrustStrip />
        </>
      )}
    </main>
  );
}
