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
MiniSave is live on **Celo Mainnet** with v2 contracts (Ownable2Step + Pausable):
- create savings vaults with goal amounts and optional deadlines
- deposit cUSD into vaults
- withdraw with time-decaying 8% early-exit penalty
- route penalties into a transparent public PenaltyReserve
- pause mechanism for emergency stops
- 2-step ownership transfer for governance safety

## Current active Sepolia deployment
MiniSave is currently wired to a fresh Celo Sepolia deployment using an existing mock stablecoin for test velocity.

### Celo Sepolia contracts
| Contract | Address |
|---|---|
| Mock USD (test token) | [`0x24a4aA28f0bE53f6466BFa681f94aDdb1F26F003`](https://celo-sepolia.blockscout.com/address/0x24a4aA28f0bE53f6466BFa681f94aDdb1F26F003#code) |
| PenaltyReserve | [`0x7eC901e27655ADf1Ce7032648b6A753e2F2651C8`](https://celo-sepolia.blockscout.com/address/0x7eC901e27655ADf1Ce7032648b6A753e2F2651C8) |
| PiggyBankFactory | [`0x8379B08dc238010D0adE1E7E2B14e51be4DE85df`](https://celo-sepolia.blockscout.com/address/0x8379B08dc238010D0adE1E7E2B14e51be4DE85df) |

## Celo Mainnet deployment (v2 — Ownable2Step + Pausable)

| Contract | Address |
|---|---|
| PenaltyReserve | [`0x1Baf901275d9362Fd125ce8D2809491CB7A8c67c`](https://celoscan.io/address/0x1Baf901275d9362Fd125ce8D2809491CB7A8c67c) |
| PiggyBankFactory | [`0x48a813B10ca70c3fbB91af852335D7603E6Ee7bB`](https://celoscan.io/address/0x48a813B10ca70c3fbB91af852335D7603E6Ee7bB) |
| Stable token (cUSD) | [`0x765DE816845861e75A25fCA122bb6898B8B1282a`](https://celoscan.io/token/0x765DE816845861e75A25fCA122bb6898B8B1282a) |

### Previous v1 mainnet deployment (deprecated)
| Contract | Address |
|---|---|
| PenaltyReserve | [`0xB1bC2dA89f912cCF02Be29502Ce6B5ff57a566C6`](https://celoscan.io/address/0xB1bC2dA89f912cCF02Be29502Ce6B5ff57a566C6) |
| PiggyBankFactory | [`0x995Ca2D73744B0Fa1942Fe5A2e10d6a709f7963f`](https://celoscan.io/address/0x995Ca2D73744B0Fa1942Fe5A2e10d6a709f7963f) |

### v2 upgrades over v1
- **Ownable2Step**: 2-step ownership transfer prevents accidental key compromise
- **Pausable**: Emergency pause on createVault/deposit/withdraw if vulnerability discovered

## v1 scope
MiniSave v1 is intentionally narrow:
- savings commitment vaults
- stablecoin deposits
- time-decay early exit penalty (8% base, minimum 1% floor, configurable by owner)
- public reserve architecture
- MiniPay-native mobile UX

It is deliberately not a yield farm, not a complex multi-strategy vault system, and not an over-engineered protocol. The first job is to make commitment saving feel obvious and useful.

## Roadmap

### v1.1 (current)
- Ownable2Step + Pausable governance upgrades
- Frontend: split vault dashboard, memoization, error states, input validation
- Premium UI: dark/light mode, glass morphism, skeleton loaders
- CI/CD pipeline with GitHub Actions

### v1.2
- Multi-token support (USDm, USDC, USDT selector)
- Vault sharing via deep links and QR codes
- Savings streaks and gamification

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
1. smoke test: create vault → deposit → verify on Celoscan
2. onboard first real testers
3. multi-token support
4. yield-bearing vaults integration
