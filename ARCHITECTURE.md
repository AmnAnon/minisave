# MiniSave — Technical Architecture

## Stack
- Frontend: Next.js App Router
- Styling: Tailwind CSS
- Web3 client: wagmi + viem
- Smart contracts: Solidity + Hardhat + Ignition
- Chain target: configurable Celo network, currently defaulting to Celo Sepolia
- Wallet context: MiniPay or other injected wallet

## System overview

### Frontend
Responsibilities:
- detect MiniPay-compatible injected wallet context
- connect wallet and guard writes behind the configured chain
- read wallet balances, vault counts, and vault data from the configured Celo network
- submit create, approve, deposit, and withdraw transactions
- wait for confirmed receipts before showing success UI
- generate explorer links from chain configuration instead of hardcoded URLs

### Smart contracts
1. `PiggyBankFactory`
   - immutable token address
   - immutable penalty reserve address
   - immutable penalty basis points
   - stores `Vault[]` by owner address
   - supports `createVault`, `deposit`, `withdraw`, `getVault`, `getVaultCount`, `getVaults`
2. `PenaltyReserve`
   - owned reserve contract for early-exit penalties
   - accepts penalty accounting only from the configured factory
   - supports reserve migration to a future contract
3. `MockERC20`
   - mintable testing token for local and Sepolia flows

## Data model
Vault fields:
- `label`
- `goalAmount`
- `deadline`
- `deposited`
- `withdrawn`

Frontend record shape:
- `vaultId`
- `label`
- `goalAmount`
- `deadline`
- `deposited`
- `withdrawn`

## Contract behavior
- vault creation validates label, goal amount, and deadline semantics
- deposit transfers the configured token from the owner into the factory contract
- withdraw is full-balance only
- withdrawal is penalty-free if the vault is unlocked
- a vault unlocks when `deposited >= goalAmount` or `deadline <= block.timestamp`
- early withdrawal sends `penaltyBps` to `PenaltyReserve` and the remainder back to the owner

## Frontend routes
- `/` home and product narrative
- `/create` vault creation flow
- `/portfolio` vault listing and action surface

## Chain configuration model
- supported chains are defined in one shared frontend module
- one target chain is selected from `NEXT_PUBLIC_TARGET_CHAIN_ID`
- wallet writes are blocked when the connected wallet is on the wrong chain
- reads and explorer URLs use the configured target chain

## Transaction flow
1. user signs via `writeContractAsync`
2. app waits on the target-chain public client for `waitForTransactionReceipt`
3. success toasts, redirects, and refreshes happen only after the receipt is confirmed
4. errors are surfaced through inline state and toast messages

## Security and reliability posture
- OpenZeppelin IERC20 + SafeERC20 patterns in contracts
- ReentrancyGuard on deposit and withdraw entrypoints
- minimal contract surface area
- no backend trust assumptions
- chain mismatch guard in the frontend before write actions

## Testing posture
- Hardhat tests cover create, deposit, unlock, early-withdraw penalty, reserve accounting, and reserve migration
- frontend verification currently relies on production build success and manual wallet smoke tests

## Deployment flow
1. configure token and owner env vars
2. deploy `MockERC20` on Sepolia if needed
3. deploy `PenaltyReserve` and `PiggyBankFactory` through the Ignition module
4. set frontend env vars for target chain, factory, reserve, and token
5. run MiniPay or injected-wallet smoke tests on the configured chain
