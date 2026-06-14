# MiniSave

MiniSave is a MiniPay-native savings vault Mini App on Celo. It helps users commit to a savings goal with stablecoins, lock funds into an onchain vault, and face a time-decaying penalty if they exit early.

## Core hook
**Save toward a goal. Break the commitment early and pay for it.**

That is the product in one line: simple, emotional, verifiable onchain.

## What MiniSave is actually building
MiniSave is not a generic DeFi dashboard and not a yield farm disguised as savings.

It is a **commitment savings product** for MiniPay users:
- create a savings vault for a goal
- deposit stablecoins into that vault
- withdraw freely once the goal is reached or the deadline has passed
- withdraw early if needed, but pay a penalty
- route that penalty into a public onchain reserve

This makes saving feel real. There is a visible cost to breaking the plan.

## Why this matters for MiniPay
MiniPay is already close to everyday money behavior: payments, transfers, stablecoin usage, mobile-first flows. But saving discipline is still weak.

MiniSave fits MiniPay users because it is:
- **stablecoin-first**
- **mobile-native**
- **goal-based instead of speculative**
- **simple enough to understand instantly**
- **transparent because every vault and penalty is onchain**

## Product model
Each user can create multiple savings vaults.

Each vault tracks:
- label
- goal amount
- deadline
- created timestamp
- deposited amount
- withdrawn status

Supported v1 actions:
- create vault
- deposit into vault
- withdraw from vault
- unlock with full withdrawal when goal is met or deadline has passed
- early withdrawal with time-decaying penalty

## Time-decay penalty model
This is one of the main product decisions.

MiniSave does **not** use a flat penalty.

Instead:
- the base early-exit penalty starts at **8%**
- the penalty **decays linearly to 0%** as the vault approaches its deadline
- if the user exits very early, the penalty is near maximum
- if the user exits close to deadline, the penalty is much smaller
- if the goal is met or deadline has passed, there is no penalty

Why this matters:
- it feels fairer than a hard fixed fee
- it preserves the commitment mechanic
- it rewards patience without making funds permanently inaccessible

## PenaltyReserve architecture
MiniSave has a dedicated **PenaltyReserve** contract.

This is not a side detail — it is part of the product story.

When a user exits early:
- the penalty is separated from the user’s withdrawn amount
- the penalty is sent into the public onchain **PenaltyReserve**
- the reserve becomes a transparent pool of commitment-break costs

Why this architecture matters:
- penalties are publicly auditable
- vault logic stays simple
- future upgrades can build on the reserve cleanly
- v2 can redistribute reserve value to disciplined savers

This reserve-first design is one of the strongest parts of the project because it turns penalties into a visible communal onchain pool rather than hidden protocol fees.

## Current status
MiniSave already has its core product loop in place on Celo Sepolia:
- users can create savings vaults
- deposit a stablecoin into those vaults
- exit early with a time-decaying penalty
- route penalties into a separate public reserve

The app and contract system are already live enough to demonstrate the mechanic, not just describe it.

## Current active Sepolia deployment
MiniSave is currently wired to a fresh Celo Sepolia deployment using an existing mock stablecoin for test velocity.

### Celo Sepolia contracts
| Contract | Address |
|---|---|
| Mock USD (test token) | [`0x24a4aA28f0bE53f6466BFa681f94aDdb1F26F003`](https://celo-sepolia.blockscout.com/address/0x24a4aA28f0bE53f6466BFa681f94aDdb1F26F003#code) |
| PenaltyReserve | [`0x7eC901e27655ADf1Ce7032648b6A753e2F2651C8`](https://celo-sepolia.blockscout.com/address/0x7eC901e27655ADf1Ce7032648b6A753e2F2651C8) |
| PiggyBankFactory | [`0x8379B08dc238010D0adE1E7E2B14e51be4DE85df`](https://celo-sepolia.blockscout.com/address/0x8379B08dc238010D0adE1E7E2B14e51be4DE85df) |

## Celo Mainnet deployment
> Contracts will be deployed to Celo Mainnet as part of the submission flow.
> Addresses and Celoscan links will be added here immediately after deployment.

| Contract | Address |
|---|---|
| PenaltyReserve | _to be added_ |
| PiggyBankFactory | _to be added_ |
| Stable token (cUSD) | [`0x765DE816845861e75A25fCA122bb6898B8B1282a`](https://celoscan.io/address/0x765DE816845861e75A25fCA122bb6898B8B1282a) |

> **Note on stablecoin addresses**: `0x765DE816845861e75A25fCA122bb6898B8B1282a` is **cUSD** on Celo mainnet.
> The USDm / Mento dollar address is `0x765de816845861e75a25fca122bb6898b8b1282a` (same contract — cUSD *is* the Mento dollar).
> The app token is configurable via `NEXT_PUBLIC_DEFAULT_TOKEN_ADDRESS` at deploy time.

## v1 scope
MiniSave v1 is intentionally narrow:
- savings commitment vaults
- stablecoin deposits
- time-decay early exit penalty (8% base, minimum 1% floor, configurable by owner)
- public reserve architecture
- MiniPay-native mobile UX

It is deliberately not a yield farm, not a complex multi-strategy vault system, and not an over-engineered protocol. The first job is to make commitment saving feel obvious and useful.

## Roadmap
### v1 remaining work
- complete live Sepolia smoke test in MiniPay
- verify approve / create / deposit / withdraw flows on device
- deploy contracts on Celo mainnet and add addresses above
- onboard first real testers

### v1.1
- cleaner portfolio and vault-history UX
- better mobile confirmation/error states
- richer explorer linking and reserve transparency

### v2
MiniSave v2 can expand in two directions:

1. **Reward distribution**
   - users who keep their commitment and reach target conditions could earn a share of the reserve
   - this turns the reserve into a saver reward layer, not just a sink

2. **Yield-bearing vaults**
   - locked stablecoins can be routed into conservative Celo-native yield strategies
   - savings stay productive while preserving the core penalty mechanic

This yield direction is explicitly future roadmap only, not current v1 scope.

## Positioning vs other savings protocols
MiniSave is closer to a **behavioral savings tool** than a pure yield-maximizer.

A useful comparison point is GoodGhosting-style commitment savings, but MiniSave is intentionally lighter:
- simpler vault UX
- direct MiniPay-native stablecoin flow
- transparent penalty reserve architecture
- designed for fast mobile usage, not ceremony-heavy coordination

## Submission-ready narrative
### Problem
MiniPay users can send and store stablecoins, but they still lack a native tool for disciplined goal-based saving.

### Solution
MiniSave lets users create an onchain savings vault for a target amount and optional deadline. If they stay committed until unlock conditions are met, they withdraw normally. If they exit early, they pay a time-decaying penalty that flows into a transparent public reserve.

### Why it is interesting
- practical, not speculative
- emotionally intuitive commitment mechanic
- transparent onchain reserve design
- strong fit for MiniPay’s mobile stablecoin audience
- clear upgrade path from simple v1 to richer saver incentives later

## Next steps
1. complete live Sepolia smoke testing end-to-end
2. finalize mainnet token choice with correct labeling
3. deploy mainnet contracts
4. onboard real testers
