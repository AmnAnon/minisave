import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { keccak256, stringToHex } from "viem";

const BASE_PENALTY_BPS = 800n;
const DEPOSIT_AMOUNT = 500_000n;
const ONE_HUNDRED_DAYS = 100n * 24n * 60n * 60n;

describe("PiggyBankFactory", function () {
  async function deployFixture() {
    const [owner, reserveOwner, stranger] = await hre.viem.getWalletClients();
    const token = await hre.viem.deployContract("MockERC20", ["Mock Dollar", "mUSD", 6n]);
    const reserve = await hre.viem.deployContract("PenaltyReserve", [
      token.address,
      reserveOwner.account.address,
    ]);
    const factory = await hre.viem.deployContract("PiggyBankFactory", [
      token.address,
      reserve.address,
    ]);
    const publicClient = await hre.viem.getPublicClient();

    await reserve.write.setFactory([factory.address], { account: reserveOwner.account });
    await token.write.mint([owner.account.address, 10_000_000n]);
    await token.write.approve([factory.address, 10_000_000n]);

    return { factory, reserve, token, publicClient, owner, reserveOwner, stranger };
  }

  async function createTimedVault(factory: Awaited<ReturnType<typeof deployFixture>>["factory"], label = "Emergency Fund") {
    const deadline = BigInt((await time.latest()) + Number(ONE_HUNDRED_DAYS));
    await factory.write.createVault([label, 1_000_000n, deadline]);
    await factory.write.deposit([0n, DEPOSIT_AMOUNT]);
    return { deadline };
  }

  it("creates a vault and stores createdAt for the owner", async function () {
    const { factory, publicClient, owner } = await loadFixture(deployFixture);

    const beforeCreate = BigInt(await time.latest());
    const hash = await factory.write.createVault(["Emergency Fund", 1_000_000n, 0n]);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    const count = await factory.read.getVaultCount([owner.account.address]);
    expect(count).to.equal(1n);

    const vault = await factory.read.getVault([owner.account.address, 0n]);
    expect(vault.label).to.equal("Emergency Fund");
    expect(vault.goalAmount).to.equal(1_000_000n);
    expect(vault.createdAt >= beforeCreate).to.equal(true);

    const event = receipt.logs.find((log) => log.topics[0] === keccak256(stringToHex("VaultCreated(address,uint256,string,uint256,uint256)")));
    expect(event).to.not.equal(undefined);
  });

  it("rejects empty labels and zero-value goals", async function () {
    const { factory } = await loadFixture(deployFixture);

    await expect(factory.write.createVault(["", 1_000_000n, 0n])).to.be.rejected;
    await expect(factory.write.createVault(["Emergency", 0n, 0n])).to.be.rejected;
  });

  it("rejects past deadlines", async function () {
    const { factory } = await loadFixture(deployFixture);
    const pastDeadline = BigInt((await time.latest()) - 1);

    await expect(factory.write.createVault(["Late Goal", 1_000_000n, pastDeadline])).to.be.rejected;
  });

  it("deposits into a vault and updates the running total", async function () {
    const { factory, publicClient, owner } = await loadFixture(deployFixture);

    await factory.write.createVault(["Phone Upgrade", 1_000_000n, 0n]);
    const hash = await factory.write.deposit([0n, DEPOSIT_AMOUNT]);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    const vault = await factory.read.getVault([owner.account.address, 0n]);
    expect(vault.deposited).to.equal(DEPOSIT_AMOUNT);

    const event = receipt.logs.find((log) => log.topics[0] === keccak256(stringToHex("Deposited(address,uint256,uint256,uint256)")));
    expect(event).to.not.equal(undefined);
  });

  it("applies the full 8 percent base penalty for a day-0 exit", async function () {
    const { factory, reserve, token, owner } = await loadFixture(deployFixture);
    await createTimedVault(factory, "Day 0 Exit");

    const ownerBefore = await token.read.balanceOf([owner.account.address]);
    const reserveBefore = await token.read.balanceOf([reserve.address]);

    await factory.write.withdraw([0n]);

    const ownerAfter = await token.read.balanceOf([owner.account.address]);
    const reserveAfter = await token.read.balanceOf([reserve.address]);
    const penaltyAmount = (DEPOSIT_AMOUNT * BASE_PENALTY_BPS) / 10_000n;

    const ownerDelta = ownerAfter - ownerBefore;
    const reserveDelta = reserveAfter - reserveBefore;

    expect(ownerDelta >= DEPOSIT_AMOUNT - penaltyAmount - 100n && ownerDelta <= DEPOSIT_AMOUNT - penaltyAmount + 100n).to.equal(true);
    expect(reserveDelta >= penaltyAmount - 100n && reserveDelta <= penaltyAmount + 100n).to.equal(true);
  });

  it("decays the penalty to roughly 4 percent at mid-period", async function () {
    const { factory, reserve, token, owner } = await loadFixture(deployFixture);
    await createTimedVault(factory, "Mid Exit");
    await time.increase(Number(ONE_HUNDRED_DAYS / 2n));

    const ownerBefore = await token.read.balanceOf([owner.account.address]);
    const reserveBefore = await token.read.balanceOf([reserve.address]);

    await factory.write.withdraw([0n]);

    const ownerAfter = await token.read.balanceOf([owner.account.address]);
    const reserveAfter = await token.read.balanceOf([reserve.address]);
    const penaltyAmount = (DEPOSIT_AMOUNT * 400n) / 10_000n;

    const ownerDelta = ownerAfter - ownerBefore;
    const reserveDelta = reserveAfter - reserveBefore;

    expect(ownerDelta >= DEPOSIT_AMOUNT - penaltyAmount - 100n && ownerDelta <= DEPOSIT_AMOUNT - penaltyAmount + 100n).to.equal(true);
    expect(reserveDelta >= penaltyAmount - 100n && reserveDelta <= penaltyAmount + 100n).to.equal(true);
  });

  it("decays the penalty below 1 percent near the deadline", async function () {
    const { factory, reserve, token, owner } = await loadFixture(deployFixture);
    await createTimedVault(factory, "Near Exit");
    await time.increase(Number((ONE_HUNDRED_DAYS * 9n) / 10n));

    const ownerBefore = await token.read.balanceOf([owner.account.address]);
    const reserveBefore = await token.read.balanceOf([reserve.address]);

    await factory.write.withdraw([0n]);

    const ownerAfter = await token.read.balanceOf([owner.account.address]);
    const reserveAfter = await token.read.balanceOf([reserve.address]);
    const penaltyAmount = reserveAfter - reserveBefore;

    expect(penaltyAmount < (DEPOSIT_AMOUNT * 100n) / 10_000n).to.equal(true);
    expect(penaltyAmount > (DEPOSIT_AMOUNT * 70n) / 10_000n).to.equal(true);
    expect(ownerAfter - ownerBefore).to.equal(DEPOSIT_AMOUNT - penaltyAmount);
  });

  it("charges zero penalty after the deadline passes", async function () {
    const { factory, reserve, token, owner } = await loadFixture(deployFixture);
    await createTimedVault(factory, "Deadline Exit");
    await time.increase(Number(ONE_HUNDRED_DAYS + 1n));

    const ownerBefore = await token.read.balanceOf([owner.account.address]);
    const reserveBefore = await token.read.balanceOf([reserve.address]);

    await factory.write.withdraw([0n]);

    const ownerAfter = await token.read.balanceOf([owner.account.address]);
    const reserveAfter = await token.read.balanceOf([reserve.address]);

    expect(ownerAfter - ownerBefore).to.equal(DEPOSIT_AMOUNT);
    expect(reserveAfter - reserveBefore).to.equal(0n);
  });

  it("keeps the full 8 percent penalty flat when no deadline is set", async function () {
    const { factory, reserve, token, owner } = await loadFixture(deployFixture);
    await factory.write.createVault(["No Deadline", 1_000_000n, 0n]);
    await factory.write.deposit([0n, DEPOSIT_AMOUNT]);
    await time.increase(Number(ONE_HUNDRED_DAYS / 2n));

    const ownerBefore = await token.read.balanceOf([owner.account.address]);
    const reserveBefore = await token.read.balanceOf([reserve.address]);

    await factory.write.withdraw([0n]);

    const ownerAfter = await token.read.balanceOf([owner.account.address]);
    const reserveAfter = await token.read.balanceOf([reserve.address]);
    const penaltyAmount = (DEPOSIT_AMOUNT * BASE_PENALTY_BPS) / 10_000n;

    expect(ownerAfter - ownerBefore).to.equal(DEPOSIT_AMOUNT - penaltyAmount);
    expect(reserveAfter - reserveBefore).to.equal(penaltyAmount);
  });

  it("allows full withdrawal when the goal is met", async function () {
    const { factory, reserve, token, owner } = await loadFixture(deployFixture);

    await factory.write.createVault(["Laptop", 1_000_000n, 0n]);
    await factory.write.deposit([0n, 1_000_000n]);

    const ownerBefore = await token.read.balanceOf([owner.account.address]);
    const reserveBefore = await token.read.balanceOf([reserve.address]);

    await factory.write.withdraw([0n]);

    const ownerAfter = await token.read.balanceOf([owner.account.address]);
    const reserveAfter = await token.read.balanceOf([reserve.address]);

    expect(ownerAfter - ownerBefore).to.equal(1_000_000n);
    expect(reserveAfter - reserveBefore).to.equal(0n);
  });

  it("blocks deposits and withdrawals on missing or closed vaults", async function () {
    const { factory } = await loadFixture(deployFixture);

    await expect(factory.write.deposit([0n, 1n])).to.be.rejected;
    await expect(factory.write.withdraw([0n])).to.be.rejected;
  });

  it("prevents withdrawing twice", async function () {
    const { factory } = await loadFixture(deployFixture);

    await factory.write.createVault(["Travel", 1_000_000n, 0n]);
    await factory.write.deposit([0n, DEPOSIT_AMOUNT]);
    await factory.write.withdraw([0n]);

    await expect(factory.write.withdraw([0n])).to.be.rejected;
  });

  it("applies ~8 percent penalty for a late deposit under weighted average createdAt", async function () {
    const { factory, reserve, token, owner } = await loadFixture(deployFixture);
    
    // Create vault with 100 days lock
    const deadline = BigInt((await time.latest()) + Number(ONE_HUNDRED_DAYS));
    await factory.write.createVault(["Late Big Deposit", 20_000n * 10_000n, deadline]);
    
    // Day 0: Deposit 1 unit
    await factory.write.deposit([0n, 1n]);
    
    // Advance time to 99% elapsed (99 days)
    await time.increase(Number((ONE_HUNDRED_DAYS * 99n) / 100n));
    
    // Deposit 10,000 units
    const depositAmount = 10_000n;
    await factory.write.deposit([0n, depositAmount]);
    
    const totalDeposited = 10_001n;
    
    const ownerBefore = await token.read.balanceOf([owner.account.address]);
    const reserveBefore = await token.read.balanceOf([reserve.address]);
    
    // Withdraw early
    await factory.write.withdraw([0n]);
    
    const ownerAfter = await token.read.balanceOf([owner.account.address]);
    const reserveAfter = await token.read.balanceOf([reserve.address]);
    
    const ownerDelta = ownerAfter - ownerBefore;
    const reserveDelta = reserveAfter - reserveBefore;
    
    // With weighted average:
    // nextCreatedAt = (createdAt * 1 + now * 10000) / 10001
    // At 99% elapsed, the penalty BPS should be extremely close to 8% (the full base penalty).
    const expectedPenalty = (totalDeposited * BASE_PENALTY_BPS) / 10_000n; // ~800n
    
    expect(reserveDelta >= expectedPenalty - 10n && reserveDelta <= expectedPenalty + 10n).to.equal(true);
    expect(ownerDelta >= (totalDeposited - expectedPenalty) - 10n && ownerDelta <= (totalDeposited - expectedPenalty) + 10n).to.equal(true);
  });

  it("allows owner to change base penalty BPS, and blocks stranger", async function () {
    const { factory, owner, stranger } = await loadFixture(deployFixture);

    expect(await factory.read.BASE_PENALTY_BPS()).to.equal(800n);

    await factory.write.setBasePenaltyBps([500n], { account: owner.account });
    expect(await factory.read.BASE_PENALTY_BPS()).to.equal(500n);

    await expect(
      factory.write.setBasePenaltyBps([600n], { account: stranger.account })
    ).to.be.rejected;
  });
});

describe("PenaltyReserve", function () {
  async function deployFixture() {
    const [owner, reserveOwner, other] = await hre.viem.getWalletClients();
    const token = await hre.viem.deployContract("MockERC20", ["Mock Dollar", "mUSD", 6n]);
    const reserve = await hre.viem.deployContract("PenaltyReserve", [
      token.address,
      reserveOwner.account.address,
    ]);
    const publicClient = await hre.viem.getPublicClient();

    return { reserve, token, publicClient, reserveOwner, other, owner };
  }

  it("sets the factory once and emits the event", async function () {
    const { reserve, publicClient, reserveOwner, other, owner } = await loadFixture(deployFixture);

    let hash = await reserve.write.setFactory([other.account.address], {
      account: reserveOwner.account,
    });
    let receipt = await publicClient.waitForTransactionReceipt({ hash });

    expect((await reserve.read.factory()).toLowerCase()).to.equal(other.account.address.toLowerCase());

    const event = receipt.logs.find((log) => log.topics[0] === keccak256(stringToHex("FactorySet(address)")));
    expect(event).to.not.equal(undefined);

    // Resetting should be allowed as long as totalPenalties is 0
    hash = await reserve.write.setFactory([owner.account.address], {
      account: reserveOwner.account,
    });
    receipt = await publicClient.waitForTransactionReceipt({ hash });
    expect((await reserve.read.factory()).toLowerCase()).to.equal(owner.account.address.toLowerCase());

    // Mock receiving a penalty from the current factory (owner)
    await reserve.write.receivePenalty([100n], { account: owner.account });

    // Now that totalPenalties > 0, resetting should revert
    await expect(
      reserve.write.setFactory([other.account.address], { account: reserveOwner.account }),
    ).to.be.rejected;
  });

  it("tracks penalties only when called by the configured factory", async function () {
    const { reserve, publicClient, reserveOwner, other } = await loadFixture(deployFixture);

    await reserve.write.setFactory([other.account.address], { account: reserveOwner.account });

    await expect(reserve.write.receivePenalty([100n])).to.be.rejected;

    const hash = await reserve.write.receivePenalty([250n], { account: other.account });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    expect(await reserve.read.totalPenalties()).to.equal(250n);
    const event = receipt.logs.find((log) => log.topics[0] === keccak256(stringToHex("PenaltyReceived(uint256)")));
    expect(event).to.not.equal(undefined);
  });

  it("migrates the full token balance to a new contract", async function () {
    const { reserve, token, publicClient, reserveOwner, other } = await loadFixture(deployFixture);

    await token.write.mint([reserve.address, 5_000n]);

    const hash = await reserve.write.migrate([other.account.address], {
      account: reserveOwner.account,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    expect(await token.read.balanceOf([reserve.address])).to.equal(0n);
    expect(await token.read.balanceOf([other.account.address])).to.equal(5_000n);
    const event = receipt.logs.find((log) => log.topics[0] === keccak256(stringToHex("PoolMigrated(address,uint256)")));
    expect(event).to.not.equal(undefined);
  });
});
