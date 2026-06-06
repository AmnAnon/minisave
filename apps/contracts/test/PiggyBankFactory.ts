import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { keccak256, stringToHex } from "viem";

describe("PiggyBankFactory", function () {
  async function deployFixture() {
    const [owner, treasury, stranger] = await hre.viem.getWalletClients();
    const token = await hre.viem.deployContract("MockERC20", ["Mock Dollar", "mUSD", 6n]);
    const factory = await hre.viem.deployContract("PiggyBankFactory", [
      token.address,
      treasury.account.address,
      1000n,
    ]);
    const publicClient = await hre.viem.getPublicClient();

    await token.write.mint([owner.account.address, 10_000_000n]);
    await token.write.approve([factory.address, 10_000_000n]);

    return { factory, token, publicClient, owner, treasury, stranger };
  }

  it("creates a vault and stores it for the owner", async function () {
    const { factory, publicClient, owner } = await loadFixture(deployFixture);

    const hash = await factory.write.createVault(["Emergency Fund", 1_000_000n, 0n]);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    const count = await factory.read.getVaultCount([owner.account.address]);
    expect(count).to.equal(1n);

    const vault = await factory.read.getVault([owner.account.address, 0n]);
    expect(vault.label).to.equal("Emergency Fund");
    expect(vault.goalAmount).to.equal(1_000_000n);

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
    const hash = await factory.write.deposit([0n, 500_000n]);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    const vault = await factory.read.getVault([owner.account.address, 0n]);
    expect(vault.deposited).to.equal(500_000n);

    const event = receipt.logs.find((log) => log.topics[0] === keccak256(stringToHex("Deposited(address,uint256,uint256,uint256)")));
    expect(event).to.not.equal(undefined);
  });

  it("applies a penalty on early withdrawal and sends it to treasury", async function () {
    const { factory, token, publicClient, owner, treasury } = await loadFixture(deployFixture);

    await factory.write.createVault(["Phone Upgrade", 1_000_000n, 0n]);
    await factory.write.deposit([0n, 500_000n]);

    const ownerBefore = await token.read.balanceOf([owner.account.address]);
    const treasuryBefore = await token.read.balanceOf([treasury.account.address]);

    const hash = await factory.write.withdraw([0n]);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    const ownerAfter = await token.read.balanceOf([owner.account.address]);
    const treasuryAfter = await token.read.balanceOf([treasury.account.address]);

    expect(ownerAfter - ownerBefore).to.equal(450_000n);
    expect(treasuryAfter - treasuryBefore).to.equal(50_000n);

    const penaltyEvent = receipt.logs.find((log) => log.topics[0] === keccak256(stringToHex("PenaltyApplied(address,uint256,uint256,address)")));
    const withdrawEvent = receipt.logs.find((log) => log.topics[0] === keccak256(stringToHex("Withdrawn(address,uint256,uint256,uint256,bool)")));
    expect(penaltyEvent).to.not.equal(undefined);
    expect(withdrawEvent).to.not.equal(undefined);
  });

  it("allows full withdrawal when the goal is met", async function () {
    const { factory, token, publicClient, owner, treasury } = await loadFixture(deployFixture);

    await factory.write.createVault(["Laptop", 1_000_000n, 0n]);
    await factory.write.deposit([0n, 1_000_000n]);

    const ownerBefore = await token.read.balanceOf([owner.account.address]);
    const treasuryBefore = await token.read.balanceOf([treasury.account.address]);

    const hash = await factory.write.withdraw([0n]);
    await publicClient.waitForTransactionReceipt({ hash });

    const ownerAfter = await token.read.balanceOf([owner.account.address]);
    const treasuryAfter = await token.read.balanceOf([treasury.account.address]);

    expect(ownerAfter - ownerBefore).to.equal(1_000_000n);
    expect(treasuryAfter - treasuryBefore).to.equal(0n);
  });

  it("allows full withdrawal after the deadline passes", async function () {
    const { factory, token, publicClient, owner, treasury } = await loadFixture(deployFixture);
    const deadline = BigInt((await time.latest()) + 3600);

    await factory.write.createVault(["Rent Buffer", 1_000_000n, deadline]);
    await factory.write.deposit([0n, 500_000n]);
    await time.increase(3601);

    const ownerBefore = await token.read.balanceOf([owner.account.address]);
    const treasuryBefore = await token.read.balanceOf([treasury.account.address]);

    const hash = await factory.write.withdraw([0n]);
    await publicClient.waitForTransactionReceipt({ hash });

    const ownerAfter = await token.read.balanceOf([owner.account.address]);
    const treasuryAfter = await token.read.balanceOf([treasury.account.address]);

    expect(ownerAfter - ownerBefore).to.equal(500_000n);
    expect(treasuryAfter - treasuryBefore).to.equal(0n);
  });

  it("blocks deposits and withdrawals on missing or closed vaults", async function () {
    const { factory } = await loadFixture(deployFixture);

    await expect(factory.write.deposit([0n, 1n])).to.be.rejected;
    await expect(factory.write.withdraw([0n])).to.be.rejected;
  });

  it("prevents withdrawing twice", async function () {
    const { factory } = await loadFixture(deployFixture);

    await factory.write.createVault(["Travel", 1_000_000n, 0n]);
    await factory.write.deposit([0n, 500_000n]);
    await factory.write.withdraw([0n]);

    await expect(factory.write.withdraw([0n])).to.be.rejected;
  });
});
