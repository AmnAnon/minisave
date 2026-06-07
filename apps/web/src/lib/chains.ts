import { defineChain, type Chain } from "viem";
import { celo } from "wagmi/chains";

export const celoSepolia = defineChain({
  id: 11142220,
  name: "Celo Sepolia",
  nativeCurrency: {
    decimals: 18,
    name: "CELO",
    symbol: "CELO",
  },
  rpcUrls: {
    default: {
      http: ["https://forno.celo-sepolia.celo-testnet.org"],
    },
    public: {
      http: ["https://forno.celo-sepolia.celo-testnet.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://celo-sepolia.blockscout.com",
    },
  },
  testnet: true,
});

export const supportedChains = [celo, celoSepolia] as const;

export const TARGET_CHAIN_ID = Number(process.env.NEXT_PUBLIC_TARGET_CHAIN_ID || "11142220");

export const targetChain =
  supportedChains.find((chain) => chain.id === TARGET_CHAIN_ID) ?? celoSepolia;

export function resolveChain(chainId?: number): Chain {
  if (chainId) {
    const matched = supportedChains.find((chain) => chain.id === chainId);
    if (matched) return matched;
  }

  return targetChain;
}

export function explorerTxUrl(hash: string, chainId?: number) {
  const chain = resolveChain(chainId);
  return `${chain.blockExplorers?.default.url.replace(/\/$/, "")}/tx/${hash}`;
}

export function explorerAddressUrl(address: string, chainId?: number) {
  const chain = resolveChain(chainId);
  return `${chain.blockExplorers?.default.url.replace(/\/$/, "")}/address/${address}`;
}
