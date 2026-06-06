# MiniSave

MiniSave is a MiniPay-native savings vault Mini App on Celo. Users create a savings target, deposit a stablecoin into an onchain vault, and pay a penalty if they bail out early.

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
In progress for Celo Proof of Ship.

Implemented foundation:
- product spec
- technical architecture
- 48h sprint plan
- MiniPay starter scaffold
- PiggyBankFactory v1 contract with early-withdraw penalty
- deploy-time token configuration
- MiniSave landing page and create-vault flow
- verified Celo stablecoin constants for default config

## Monorepo structure
- `apps/web` — Next.js MiniPay frontend
- `apps/contracts` — Hardhat contracts and deployment modules
- `PRODUCT_SPEC.md` — product and submission narrative
- `ARCHITECTURE.md` — technical plan
- `SPRINT_48H.md` — build sprint checklist

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
- penalty on early withdrawal

## Locked v1 decisions
- no reward distribution logic yet
- no proxy upgrade pattern
- minimal migration-based reserve architecture only
- token address is configurable, not hardcoded in vault logic
- MiniPay starter shell remains the app shell

## Stablecoin defaults
Current build targets **cUSD first** for clarity and MiniPay fit.

- **Celo mainnet cUSD / StableTokenUSD**: `0x765DE816845861e75A25fCA122bb6898B8B1282a`
- **Celo Sepolia test token (current test deployment)**: `0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b`

These are kept in config/constants and env templates, not inline business logic.

## Immediate next steps
1. complete clean MiniPay smoke test on the latest Celo Sepolia deployment
2. verify visible portfolio positions, token balances, and transaction history links inside MiniPay
3. deploy the hardened contract to Celo mainnet
4. update Vercel env with the final mainnet factory/token config
5. run one tiny mainnet smoke test
6. onboard 3-5 real testers for onchain traction

## Roadmap
- v2: RewardDistributor contract — users who reach their savings goal or survive their deadline become eligible for a proportional share of the penalty pool, weighted by deposited amount.
- future yield mode: route locked stablecoin deposits into conservative Celo-native yield strategies while preserving simple penalty mechanics.

## Submission copy draft
### Problem
Stablecoin users can send and swap money, but they lack lightweight tools for disciplined saving inside a mobile-first wallet.

### Solution
MiniSave lets MiniPay users create onchain savings vaults for a target amount. If they stay committed until the goal is hit or the deadline passes, they withdraw normally. If they exit early, they pay a penalty.

Early-exit penalties flow into the MiniSave public penalty reserve — a transparent onchain pool. Future versions will redistribute this reserve to disciplined savers who reach their goals.

### Why MiniPay users need this
MiniPay users are utility-first, mobile-first, and stablecoin-native. MiniSave gives them a practical commitment tool that feels native to everyday financial behavior.

### Current build status
- MiniPay-compatible frontend scaffold
- Celo contract foundation with early exit penalty mechanic
- stablecoin config for Celo mainnet + Celo Sepolia deployment
- MiniPay wallet flow refactored away from RainbowKit
- live MiniPay testing in progress
