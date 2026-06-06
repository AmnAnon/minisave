export type StableTokenConfig = {
  symbol: string;
  label: string;
  address: `0x${string}`;
  decimals: number;
};

const configuredSymbol = process.env.NEXT_PUBLIC_DEFAULT_TOKEN_SYMBOL || "mUSD";
const configuredAddress =
  (process.env.NEXT_PUBLIC_DEFAULT_TOKEN_ADDRESS as `0x${string}` | undefined) ||
  "0x24a4aA28f0bE53f6466BFa681f94aDdb1F26F003";
const configuredDecimals = Number(process.env.NEXT_PUBLIC_DEFAULT_TOKEN_DECIMALS || "18");

export const MINISAVE_APP_NAME = "MiniSave";
export const DEFAULT_PENALTY_BPS = 1000;
export const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS || "";
export const PENALTY_RESERVE_ADDRESS = process.env.NEXT_PUBLIC_PENALTY_RESERVE_ADDRESS || "";

export const PRIMARY_STABLE_TOKEN: StableTokenConfig = {
  symbol: configuredSymbol,
  label:
    configuredSymbol === "USDm"
      ? "Mento Dollar"
      : configuredSymbol === "cUSD"
        ? "Celo Dollar"
        : configuredSymbol === "mUSD"
          ? "MiniSave Mock USD"
          : configuredSymbol,
  address: configuredAddress,
  decimals: configuredDecimals,
};

export const CELO_MAINNET_TOKEN_PRESETS: StableTokenConfig[] = [
  {
    symbol: "USDm",
    label: "Mento Dollar",
    address: "0x765de816845861e75a25fca122bb6898b8b1282a",
    decimals: 18,
  },
  {
    symbol: "USDC",
    label: "USD Coin",
    address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
    decimals: 6,
  },
  {
    symbol: "USDT",
    label: "Tether USD",
    address: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
    decimals: 6,
  },
];
