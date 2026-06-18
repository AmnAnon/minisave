import { type VaultView } from "@/lib/contracts";

export type VaultRecord = VaultView & { vaultId: number };

export type TxBannerState = {
  kind: "idle" | "pending" | "success" | "error";
  title: string;
  detail?: string;
  txHash?: string;
};

export type OptimisticState = {
  walletDelta: bigint;
  vaults: Record<number, VaultRecord>;
};
