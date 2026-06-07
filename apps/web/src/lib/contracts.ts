import { formatUnits, parseUnits, type PublicClient } from "viem";
import { FACTORY_ADDRESS, PRIMARY_STABLE_TOKEN } from "./minisave";

export const piggyBankFactoryAbi = [
  {
    type: "function",
    name: "createVault",
    stateMutability: "nonpayable",
    inputs: [
      { name: "label", type: "string" },
      { name: "goalAmount", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "vaultId", type: "uint256" }],
  },
  {
    type: "function",
    name: "deposit",
    stateMutability: "nonpayable",
    inputs: [
      { name: "vaultId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [{ name: "vaultId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getVault",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "vaultId", type: "uint256" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "label", type: "string" },
          { name: "goalAmount", type: "uint256" },
          { name: "deadline", type: "uint256" },
          { name: "deposited", type: "uint256" },
          { name: "withdrawn", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getVaults",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "label", type: "string" },
          { name: "goalAmount", type: "uint256" },
          { name: "deadline", type: "uint256" },
          { name: "deposited", type: "uint256" },
          { name: "withdrawn", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getVaultCount",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "penaltyBps",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const erc20Abi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export type VaultView = {
  label: string;
  goalAmount: bigint;
  deadline: bigint;
  deposited: bigint;
  withdrawn: boolean;
};

export function toTokenUnits(value: string, decimals = PRIMARY_STABLE_TOKEN.decimals) {
  return parseUnits(value || "0", decimals);
}

export function fromTokenUnits(value: bigint, decimals = PRIMARY_STABLE_TOKEN.decimals) {
  return Number(formatUnits(value, decimals));
}

export function formatTokenAmount(value: bigint, decimals = PRIMARY_STABLE_TOKEN.decimals, precision = 2) {
  return fromTokenUnits(value, decimals).toLocaleString(undefined, {
    maximumFractionDigits: precision,
  });
}

export function resolveFactoryAddress() {
  return FACTORY_ADDRESS as `0x${string}` | "";
}

export async function waitForConfirmedReceipt(
  publicClient: PublicClient | undefined,
  hash: `0x${string}`,
) {
  if (!publicClient) {
    throw new Error("Target network client is unavailable.");
  }

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error("Transaction failed onchain.");
  }

  return receipt;
}

export function progressPercent(vault: VaultView) {
  const goal = fromTokenUnits(vault.goalAmount);
  const deposited = fromTokenUnits(vault.deposited);
  if (!goal) return 0;
  return Math.min(100, (deposited / goal) * 100);
}

export function vaultUnlocked(vault: VaultView) {
  return vault.deposited >= vault.goalAmount || (vault.deadline !== 0n && BigInt(Math.floor(Date.now() / 1000)) >= vault.deadline);
}

export function daysLeft(deadline: bigint) {
  if (deadline === 0n) return null;
  const diffMs = Number(deadline) * 1000 - Date.now();
  return Math.max(0, Math.ceil(diffMs / 86_400_000));
}
