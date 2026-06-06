import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const tokenName = process.env.MOCK_TOKEN_NAME ?? "MiniSave Mock USD";
const tokenSymbol = process.env.MOCK_TOKEN_SYMBOL ?? "mUSD";
const tokenDecimals = process.env.MOCK_TOKEN_DECIMALS ? Number(process.env.MOCK_TOKEN_DECIMALS) : 18;

const MockERC20Module = buildModule("MockERC20Module", (m) => {
  const mockToken = m.contract("MockERC20", [tokenName, tokenSymbol, tokenDecimals]);
  return { mockToken };
});

export default MockERC20Module;
