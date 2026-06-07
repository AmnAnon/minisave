# MiniSave — Product Spec

## One-line pitch
MiniSave is a MiniPay-native savings vault Mini App on Celo where users create personal vaults, deposit one configured stable token, and pay a penalty if they exit before the vault unlocks.

## Current implementation summary
The shipped product is a simple commitment-savings app:

- one wallet can create multiple vaults
- each vault has a label, target amount, optional deadline, deposited balance, and withdrawn state
- deposits and withdrawals are executed through one factory contract
- early exits route a 3.3% penalty to a public penalty reserve
- the frontend is mobile-first and optimized for MiniPay/Celo wallet flows

## Core value proposition
- create a vault quickly from a mobile wallet
- save toward a visible target using one configured stable token
- withdraw cleanly after hitting the target or outlasting the deadline
- make breaking the plan feel costly through an onchain early-exit penalty

## Live MVP scope
1. Home page with product narrative and clear calls to action
2. Create Vault flow
   - title
   - target amount
   - optional deadline
   - wallet submission with confirmed-receipt success state
3. Portfolio flow
   - list all live vaults for the connected wallet
   - show saved amount, target, deadline, and progress
   - approve token allowance
   - deposit into a selected vault
   - withdraw cleanly when unlocked
   - withdraw early with visible penalty messaging
4. MiniPay-aware wallet connection
5. Celo chain targeting with configured explorer links

## Explicitly not in the current implementation
- per-vault standalone contracts
- multi-token selector in the UI
- vault detail route such as `/goal/[address]`
- deposit history or event timeline in the interface
- streaks, reminders, or reward distribution logic
- backend services

## User journey
1. Open MiniSave inside MiniPay or another injected wallet
2. Connect and switch to the configured Celo network if needed
3. Create a vault with a title, target, and optional deadline
4. Wait for onchain confirmation before the app reports success
5. Open Portfolio and approve token spending if needed
6. Deposit into the vault
7. Withdraw normally after unlock, or exit early and pay the penalty

## Main screens
### Home
- concise product explanation
- create and portfolio CTAs
- wallet balance snapshot

### Create
- vault creation form
- target-token balance
- penalty explanation
- network guard and transaction confirmation states

### Portfolio
- wallet balances on the configured chain
- live vault list
- selected-vault action panel
- approval, deposit, and withdrawal controls
- transaction status rail

## Onchain model
- `PiggyBankFactory` stores vault structs keyed by owner address
- `PenaltyReserve` accumulates early-exit penalties
- `MockERC20` supports Sepolia and local testing only

## Current deployment posture
- Celo Sepolia is the default configured network for testing
- the frontend reads target-chain addresses from environment variables
- explorer links are derived from chain configuration

## Success criteria
- create, approve, deposit, and withdraw flows work end-to-end on the configured chain
- success UI is shown only after confirmed receipts
- public repo and docs match the actual implementation
- contracts and frontend build cleanly from the repo
