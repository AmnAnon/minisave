import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const token = process.env.STABLE_TOKEN_ADDRESS;
const treasury = process.env.TREASURY_ADDRESS;
const penaltyBps = process.env.PENALTY_BPS ? BigInt(process.env.PENALTY_BPS) : 1000n;

if (!token) {
  throw new Error("STABLE_TOKEN_ADDRESS is required for PiggyBankFactory deployment");
}

if (!treasury) {
  throw new Error("TREASURY_ADDRESS is required for PiggyBankFactory deployment");
}

const PiggyBankFactoryModule = buildModule("PiggyBankFactoryModule", (m) => {
  const piggyBankFactory = m.contract("PiggyBankFactory", [token, treasury, penaltyBps]);

  return { piggyBankFactory };
});

export default PiggyBankFactoryModule;
