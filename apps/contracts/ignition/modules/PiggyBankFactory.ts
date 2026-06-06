import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const token = process.env.STABLE_TOKEN_ADDRESS;
const reserveOwner = process.env.PENALTY_RESERVE_OWNER ?? process.env.DEPLOYER_ADDRESS;
const penaltyBps = process.env.PENALTY_BPS ? BigInt(process.env.PENALTY_BPS) : 1000n;

if (!token) {
  throw new Error("STABLE_TOKEN_ADDRESS is required for PiggyBankFactory deployment");
}

if (!reserveOwner) {
  throw new Error("PENALTY_RESERVE_OWNER or DEPLOYER_ADDRESS is required for PenaltyReserve deployment");
}

const PiggyBankFactoryModule = buildModule("PiggyBankFactoryModule", (m) => {
  const penaltyReserve = m.contract("PenaltyReserve", [token, reserveOwner]);
  const piggyBankFactory = m.contract("PiggyBankFactory", [token, penaltyReserve, penaltyBps]);

  m.call(penaltyReserve, "setFactory", [piggyBankFactory], { id: "setPenaltyReserveFactory" });

  return { piggyBankFactory, penaltyReserve };
});

export default PiggyBankFactoryModule;
