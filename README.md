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
- treasury address
- penalty basis points

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
- no shared penalty pool
- no cross-user redistribution logic
- no protocol overengineering
- token address is configurable, not hardcoded in vault logic
- MiniPay starter shell remains the app shell

## Stablecoin defaults
Current frontend default:
- `USDm` / `StableTokenUSD` on Celo mainnet: `0x765de816845861e75a25fca122bb6898b8b1282a`
- Alfajores cUSD / StableTokenUSD test token: `0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1`

These are kept in config/constants and env templates, not inline business logic.

## Immediate next steps
1. remove leftover GoalVault template files
2. wire live vault reads/deposits/withdrawals in frontend
3. deploy to Alfajores
4. test in MiniPay developer mode
5. deploy to Celo mainnet
6. onboard 3-5 real testers for onchain traction

## Submission copy draft
### Problem
Stablecoin users can send and swap money, but they lack lightweight tools for disciplined saving inside a mobile-first wallet.

### Solution
MiniSave lets MiniPay users create onchain savings vaults for a target amount. If they stay committed until the goal is hit or the deadline passes, they withdraw normally. If they exit early, they pay a penalty.

### Why MiniPay users need this
MiniPay users are utility-first, mobile-first, and stablecoin-native. MiniSave gives them a practical commitment tool that feels native to everyday financial behavior.

### Current build status
- MiniPay-compatible frontend scaffold
- Celo contract foundation with early exit penalty mechanic
- stablecoin config for Celo + Alfajores deployment
- MiniPay wallet flow refactored away from RainbowKit
- deploy/test flow in progress
