"use client";

import { useAccount, useBalance } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CELO_MAINNET_TOKEN_PRESETS, PRIMARY_STABLE_TOKEN } from "@/lib/minisave";

function BalanceDisplay({
  address,
  token,
  symbol,
}: {
  address: `0x${string}`;
  token?: `0x${string}`;
  symbol: string;
}) {
  const { data, isLoading } = useBalance({
    address,
    token,
  });

  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{symbol}</span>
      <span className="font-medium">
        {isLoading ? "Loading..." : `${parseFloat(data?.formatted || "0").toFixed(4)}`}
      </span>
    </div>
  );
}

export function UserBalance() {
  const { address, isConnected } = useAccount();

  if (!isConnected || !address) {
    return null;
  }

  return (
    <Card className="w-full max-w-md mx-auto mb-8">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Connected Wallet</CardTitle>
        <p className="text-sm text-muted-foreground truncate pt-1">{address}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border bg-muted/30 p-3 text-sm text-muted-foreground">
          MiniSave is currently optimized for <strong>{PRIMARY_STABLE_TOKEN.symbol}</strong>. Additional tokens remain as presets, not active defaults.
        </div>
        <div className="space-y-2 pt-2 border-t">
          <BalanceDisplay address={address} symbol="CELO" token={undefined} />
          {CELO_MAINNET_TOKEN_PRESETS.map((token) => (
            <BalanceDisplay key={token.symbol} address={address} token={token.address} symbol={token.symbol} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
