# MiniSave UI Refresh Design

Date: 2026-06-08
Project: MiniSave
Scope: Remove mock/default UI content, redesign the homepage, and tighten the app shell and create flow for a mobile-first MiniPay utility experience.

## Goal

Shift MiniSave from a marketing-heavy, mock-data-led presentation into a cleaner working Web3 app shell. The homepage should behave like the product entry point, not a demo landing page. The redesign should remove fake vault examples and preset goal content while keeping real wallet, vault, and transaction behavior intact.

## Product Direction

The approved direction is:

- mobile MiniPay utility, not premium Web3 theater
- portfolio-first homepage for connected users
- explain-and-connect homepage for disconnected users
- create form opens without preset values and uses placeholders/examples only

This direction prioritizes clarity, trust, and repeated use inside a wallet context.

## Problems In The Current UI

- The homepage is driven by hardcoded `overviewTiles` and `sampleVaults`, which makes the app look partially fake.
- The connected experience does not immediately feel like a working savings dashboard.
- The visual treatment is too dense and ornamental for a MiniPay utility surface.
- The create form ships with preset values, which looks like seeded demo data instead of a real user flow.
- Parts of the copy promote future or unshipped ideas rather than the live product loop.

## Design Principles

- Real data or honest empty state only
- Mobile-first utility over marketing-first composition
- Short operational copy over aspirational copy
- Green for healthy/confirmed/unlocked states, amber for caution/penalty semantics
- Fewer oversized wrappers and fewer decorative panels
- Fast path to create or manage vaults from the first viewport

## Homepage Information Architecture

### Connected State

The homepage becomes a compact dashboard:

- app shell and navigation remain visible at the top
- primary summary area shows wallet and vault state
- quick actions allow the user to create a vault or open the portfolio
- active vault list appears below using only onchain data
- if there are no vaults, replace the list with a purposeful empty state and one clear CTA

The first viewport should answer:

- what balance do I have available
- how many vaults exist
- how much is currently saved
- what do I do next

### Disconnected State

The homepage keeps the same shell but swaps the dashboard summary for a connect-first explainer:

- short explanation of the core savings mechanic
- one strong connect CTA
- secondary path to create or review the product flow
- no fake portfolio cards or invented progress visuals

### Below-The-Fold Content

Keep supporting content minimal:

- a three-step "how it works" strip
- a short trust/clarity strip covering onchain confirmation, penalty reserve behavior, and chain targeting

The homepage should move users into action quickly rather than stacking marketing sections.

## Visual System

### Tone

The UI should feel like a compact wallet-native finance tool:

- dark base, but lighter and cleaner than the current amber-heavy treatment
- neutral charcoal surfaces
- controlled color accents
- more breathing room and flatter information panels

### Color Roles

- base shell: deep charcoal / near-black
- surfaces: slightly lifted dark panels with subtle borders
- positive/live/unlocked: green
- penalty/caution: amber
- destructive/failure: red only when needed

Amber should stop acting as the dominant wash across the whole interface. It should signal penalty or caution, not define every panel.

### Typography

- remove oversized, campaign-style homepage hierarchy
- use tighter app-like headings
- keep metrics prominent but controlled
- favor shorter, more literal product copy

The interface should read like software, not a promo page.

### Motion

Use motion only for:

- panel reveal
- status transitions
- transaction confirmation feedback

Do not use decorative celebration or mock-animation patterns on the homepage.

## Interaction Model

### Homepage

- connected users land in a live utility dashboard
- disconnected users land in an explain-and-connect state
- no fake vault cards
- no mock percentages
- no non-existent rewards rails

### Create Flow

- no prefilled form content
- placeholders and helper text stay for guidance
- chain guard and transaction confirmation behavior remain
- tone becomes more product-like and less theatrical

### Portfolio

- keep live vault and wallet reads
- keep transaction state handling
- preserve explorer links and chain awareness
- reuse some summary logic for homepage connected state where practical

## Reference Integration: `PiggyBankUI.jsx`

`/home/ubuntu/PiggyBankUI.jsx` is a reference only, not a direct template.

Keep:

- compact app-shell thinking
- mobile bottom navigation
- balance-first summary framing
- visible live/chain state

Do not keep:

- heavy repeated amber styling
- too many nested rounded panels
- filler explanatory copy

The final UI should borrow the utility posture without copying the visual density.

## Planned File Changes

### Homepage

Update:

- `apps/web/src/app/page.tsx`

Changes:

- remove hardcoded homepage mock structures such as `overviewTiles` and `sampleVaults`
- render separate connected and disconnected homepage states
- replace the hero-led layout with a utility-first dashboard or connect explainer

Potential new components:

- `home-dashboard-summary`
- `home-connect-panel`
- `home-empty-state`
- `home-how-it-works`
- `home-trust-strip`

These names are conceptual and can be adjusted during implementation if a clearer grouping emerges.

### Balance And Summary

Update:

- `apps/web/src/components/user-balance.tsx`

Changes:

- simplify visual density
- reduce promo-style copy
- make it reusable as a cleaner summary module

Review and possibly reuse logic from:

- `apps/web/src/components/vault-dashboard.tsx`

Changes:

- ensure homepage summary and portfolio summary do not diverge unnecessarily
- keep only real vault-backed UI and intentional empty states

### Create Flow

Update:

- `apps/web/src/components/create-goal-form.tsx`

Changes:

- remove default field values
- use placeholders/examples only
- tighten helper copy
- preserve existing chain/write/confirmation behavior

### App Shell

Update:

- `apps/web/src/components/navbar.tsx`
- `apps/web/src/app/layout.tsx` if spacing adjustments are needed

Changes:

- preserve bottom mobile nav
- simplify the header styling
- keep chain/live status readable and compact

### Styling

Update:

- `apps/web/src/app/globals.css`

Changes:

- revise shared palette and surface feel
- reduce the current luxury-dark amber bias
- establish cleaner utility tokens and rhythm

## What Must Be Removed

- homepage hardcoded `overviewTiles`
- homepage hardcoded `sampleVaults`
- create-form preset values
- any homepage or create-flow UI that implies shipped features which do not exist
- any fake data-backed visual element

## What Must Stay

- real wallet balance reads
- real vault reads
- live transaction states
- chain guard logic
- explorer links
- mobile navigation model

## Error Handling And State Rules

- Wrong network remains explicit and actionable.
- Pending/confirmed/failed transactions remain clearly surfaced.
- Empty states must be useful, not apologetic.
- Disconnected state must never impersonate live portfolio data.

## Testing Expectations

Implementation should verify:

- homepage renders correctly in connected and disconnected states
- create form opens with empty inputs and useful placeholders
- mobile nav remains intact and readable
- no mock homepage cards remain
- responsive behavior works on mobile and desktop
- existing wallet and vault flows are not regressed by the UI refresh

## Scope Boundary

Included:

- homepage redesign
- app-shell polish where needed
- create-form cleanup
- removal of mock/default UI content

Not included:

- contract changes
- new backend systems
- new vault features
- rewards or v2 functionality

## Success Criteria

- the homepage feels like a real MiniPay utility surface
- no fake goals or fake vault data remain
- the create flow no longer looks seeded
- the UI is cleaner, more credible, and easier to use on mobile
- live Web3 states remain clear and trustworthy
