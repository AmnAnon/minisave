import { parseUnits } from "viem";
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

export function resolveFactoryAddress() {
  return FACTORY_ADDRESS as `0x${string}` | "";
}
