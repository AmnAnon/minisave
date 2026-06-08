# MiniSave

MiniSave is a MiniPay-native savings vault Mini App on Celo. Users create a savings target, deposit a stablecoin into an onchain vault, and pay a small penalty if they bail out early.

## Core hook
**Save toward a goal. Exit early and pay for it.**

That is the whole product narrative judges can understand in seconds.

## Why this project
MiniPay is built for practical everyday finance, not just speculation. MiniSave fits that behavior directly:
- simple savings goals
- stablecoin-first UX
- penalty-backed commitment mechanic
- mobile-native MiniPay flow
- transparent onchain proof

## Current status
In progress for Celo Proof of Ship and hardening for a mainnet-ready v1 before 20 June.

Implemented foundation:
- product spec
- technical architecture
- 48h sprint plan
- MiniPay starter scaffold
- PiggyBankFactory v1 contract with early-withdraw penalty
- deploy-time token configuration
- MiniSave landing page and create-vault flow
- reserve-based penalty architecture
- verified mock token for Sepolia testing
- wallet/network guard for Celo + Celo Sepolia
- frontend helpers for vault progress, unlock state, and penalty estimation
- deploy/test scripts for Sepolia and Celo mainnet

Verified locally on this machine:
- `npx hardhat test` → 15/15 passing
- `npx hardhat compile` → clean
- `npx tsc --noEmit` in `apps/web` → clean
- `npx next build` in `apps/web` → production build passes

## Monorepo structure
- `apps/web` — Next.js MiniPay frontend
- `apps/contracts` — Hardhat contracts and deployment modules
- `projects/minisave/PRODUCT_SPEC.md` — product and submission narrative
- `projects/minisave/ARCHITECTURE.md` — technical plan
- `projects/minisave/SPRINT_48H.md` — build sprint checklist

## Contract direction
### PiggyBankFactory
Stores user vaults directly and is configured at deploy time with:
- stable token address
- penalty reserve address
- penalty basis points

### PenaltyReserve
A minimal standalone reserve contract that receives early-exit penalties and keeps them in a transparent onchain pool.

Early-exit penalties flow into the MiniSave public penalty reserve — a transparent onchain pool. Future versions will redistribute this reserve to disciplined savers who reach their goals.

### Vault model
Each user can create multiple vaults. Each vault tracks:
- label
- goal amount
- deadline
- deposited amount
- withdrawn status

Supports:
- create vault
- deposit
- withdraw
- full withdrawal when goal met or deadline passed
- early withdrawal penalty starts at 8% and decays linearly to 0% by the deadline

## Locked v1 decisions
- no reward distribution logic yet
- no proxy upgrade pattern
- minimal migration-based reserve architecture only
- token address is configurable, not hardcoded in vault logic
- MiniPay starter shell remains the app shell

## Current Sepolia testing stack
Current test build now targets a dedicated **mock USD first** flow on Celo Sepolia so MiniPay testing is not blocked by incomplete faucet infrastructure.

Latest active Sepolia deployment:
- **Celo Sepolia Mock USD (testing token)**: `0x24a4aA28f0bE53f6466BFa681f94aDdb1F26F003`
- **Celo Sepolia PenaltyReserve**: `0x7eC901e27655ADf1Ce7032648b6A753e2F2651C8`
- **Celo Sepolia PiggyBankFactory**: `0x8379B08dc238010D0adE1E7E2B14e51be4DE85df`

What this build is proving now:
- MiniPay-native savings vault UX on Celo
- multiple user-created savings vaults
- stablecoin deposits into an onchain commitment vault
- early-exit penalty that decays linearly to zero by deadline
- transparent reserve architecture for future saver rewards

## Explorer and verification links
- Mock USD verified contract:
  <https://celo-sepolia.blockscout.com/address/0x24a4aA28f0bE53f6466BFa681f94aDdb1F26F003#code>
- PenaltyReserve explorer:
  <https://celo-sepolia.blockscout.com/address/0x7eC901e27655ADf1Ce7032648b6A753e2F2651C8>
- PiggyBankFactory explorer:
  <https://celo-sepolia.blockscout.com/address/0x8379B08dc238010D0adE1E7E2B14e51be4DE85df>

## Verification notes
- `MockERC20` is verified on Celo Sepolia.
- `PenaltyReserve` keeps penalty accounting isolated and migration-based for a cleaner v2 handoff.
- `PiggyBankFactory` routes early-exit penalties directly into the reserve.
- Current testing token is a mock asset for shipping velocity, not the final mainnet token choice.

## Immediate next steps
1. complete one more clean MiniPay smoke test on the latest Celo Sepolia deployment
2. verify visible portfolio positions, token balances, and transaction history links inside MiniPay
3. capture clean submission screenshots with the latest bottom-tab UX
4. choose the final mainnet stable token (`USDm` recommended for v1 unless product constraints change)
5. redeploy `PenaltyReserve` + `PiggyBankFactory` on Celo mainnet with final token config
6. verify both contracts on the mainnet explorer
7. update Vercel env with final mainnet chain/factory/token config
8. run one tiny mainnet smoke test with real funds
9. onboard 3-5 real testers for onchain traction

## Do we need to redeploy?
Yes — for **mainnet**, definitely.

Reason:
- current public addresses in the frontend/docs are **Celo Sepolia** addresses wired to a **mock test token**
- `PiggyBankFactory` stores the token and penalty reserve as **immutable constructor values**
- that means moving from Sepolia/mock USD to mainnet/final stable token requires a fresh deployment, not an in-place update

For Sepolia, a redeploy is only needed if you want a fresh clean test deployment or have changed the contract bytecode since the currently referenced addresses.

## Mainnet readiness checklist for v1
### Contracts
- [x] Factory + reserve architecture implemented
- [x] Penalty math tested locally
- [x] Goal/deadline/closed-vault guards tested locally
- [ ] Run Sepolia smoke test against current deployed addresses
- [ ] Verify deployer / reserve-owner operational setup
- [ ] Decide final mainnet stable token and decimals
- [ ] Mainnet deploy
- [ ] Mainnet explorer verification

### Frontend
- [x] Production Next build passes
- [x] Contract helpers aligned with current factory ABI
- [x] Network guard exists
- [ ] Confirm mobile MiniPay create form polish
- [ ] Confirm success/error states for approve, deposit, withdraw on device
- [ ] Replace testnet env defaults with mainnet values at deploy time

### Product / ops
- [ ] Freeze README + docs to final v1 scope
- [ ] Prepare launch checklist and rollback plan
- [ ] Run one live tiny-value test after mainnet deploy
- [ ] Capture screenshots/demo flow before 20 June

## Roadmap
- v1.1: cleaner MiniPay portfolio and vault history UX, including better mobile form layout and confirmation states.
- v1.2: explorer deep links, richer reserve analytics, and clearer penalty transparency on withdraw.
- v2: RewardDistributor contract — users who reach their savings goal or survive their deadline become eligible for a proportional share of the penalty pool, weighted by deposited amount.
- future yield mode: route locked stablecoin deposits into conservative Celo-native yield strategies while preserving simple penalty mechanics.

## Submission copy draft
### Problem
Stablecoin users can send and swap money, but they lack lightweight tools for disciplined saving inside a mobile-first wallet.

### Solution
MiniSave lets MiniPay users create onchain savings vaults for a target amount. If they stay committed until the goal is hit or the deadline passes, they withdraw normally. If they exit early, they pay a small penalty.

Early-exit penalties flow into the MiniSave public penalty reserve — a transparent onchain pool. Future versions will redistribute this reserve to disciplined savers who reach their goals.

### Why MiniPay users need this
MiniPay users are utility-first, mobile-first, and stablecoin-native. MiniSave gives them a practical commitment tool that feels native to everyday financial behavior.

### Current build status
- MiniPay-compatible frontend scaffold
- Celo contract foundation with early exit penalty mechanic
- reserve-based penalty architecture for clean future reward migration
- bottom-tab mobile navigation for MiniPay-native UX
- fresh Celo Sepolia deployment live and wired into the app
- live MiniPay testing in progress
