# MiniSave Smart Contracts

This package contains the MiniSave onchain core:

- `PiggyBankFactory` stores each wallet's vault structs and custody for the vault token.
- `PenaltyReserve` receives early-exit penalties in a standalone reserve contract for transparent accounting and future migration.
- `MockERC20` exists only for local and Celo Sepolia testing.

## Quick Start

```bash
pnpm install
pnpm compile
pnpm test
pnpm deploy:celo-sepolia
pnpm deploy:celo
```

## Available Scripts

- `pnpm compile` compiles contracts.
- `pnpm test` runs the Hardhat test suite.
- `pnpm deploy` deploys the Ignition module to the default network.
- `pnpm deploy:mock-token` deploys `MockERC20` to Celo Sepolia.
- `pnpm deploy:celo-sepolia` deploys `PenaltyReserve` and `PiggyBankFactory` to Celo Sepolia.
- `pnpm deploy:celo` deploys `PenaltyReserve` and `PiggyBankFactory` to Celo mainnet.
- `pnpm verify` runs Hardhat verification tooling.
- `pnpm clean` clears artifacts and cache.

## Contracts

### PiggyBankFactory

- Immutable stable-token address.
- Immutable penalty-reserve address.
- Immutable penalty basis points.
- Creates multiple vaults per owner.
- Accepts deposits and applies an early-withdraw penalty unless the goal has been reached or the deadline has passed.

### PenaltyReserve

- Ownable reserve contract for custody of penalty funds.
- Accepts penalty accounting calls only from the configured factory.
- Supports one-time factory binding and owner-controlled migration to a future rewards contract.

### MockERC20

- Mintable ERC-20 used only for testing and Sepolia demos.

## Environment

Copy `.env.example` to `.env` and configure:

```env
PRIVATE_KEY=your_private_key_without_0x_prefix
ETHERSCAN_API_KEY=your_etherscan_api_key
STABLE_TOKEN_ADDRESS=stable_token_address
PENALTY_RESERVE_OWNER=owner_address
DEPLOYER_ADDRESS=fallback_owner_address
PENALTY_BPS=330
MOCK_TOKEN_NAME=MiniSave Mock USD
MOCK_TOKEN_SYMBOL=mUSD
MOCK_TOKEN_DECIMALS=18
```

## Deployment Notes

- Use Sepolia first for smoke tests.
- Set `STABLE_TOKEN_ADDRESS` before deploying the factory module.
- `PENALTY_RESERVE_OWNER` should be a controlled operator wallet, not an arbitrary deploy-time placeholder.
- The Ignition module deploys `PenaltyReserve`, deploys `PiggyBankFactory`, then binds the reserve to that factory.

## Security Notes

- Never commit a real `.env`.
- Use a dedicated deployer for testnet and mainnet.
- Verify addresses and penalty settings before deployment.
- Re-run the test suite before every deployment.
