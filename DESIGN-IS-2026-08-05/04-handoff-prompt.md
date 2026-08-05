/make-plan Redesign apps/mobile/src/screens/WalletScreen.tsx. Current design failed audit at 13/30 with critical gaps in principles #6 (honest) and #8 (thorough).

Verdict paragraph (quoted from 03-verdict.md):
> The shadcn restyle is not the problem in isolation — its neutral palette is internally consistent and its environmental footprint is clean (3/3). The failure is that the restyle was applied as a skin over a screen whose underlying interaction design was already incomplete, and the new flat/bordered treatment makes the incompleteness more visible, not less: two of four primary action buttons (Request, Scan) are fully-styled, fully-announced-to-screen-readers dead controls, and five of six required states (empty, error, success, focus, disabled) simply don't exist — the "empty" case is worse than missing, it silently lies with fake mock transactions instead of showing the user their real (empty) wallet.

Why redesign and not refine: Total score is 13/30, well below the 20-point REFINE floor, and two principles independently scored 0 (Honest #6, Thorough #8) — either alone rules out REFINE.

Preserve from current design:
- The lack of gradients/glow/idle animation and the resulting light network/bundle footprint (Environmentally friendly scored 3/3) — evidence: `apps/mobile/src/screens/WalletScreen.tsx` imports (react-native core, react-native-safe-area-context, @expo/vector-icons only), 1 network request on mount (`:42`).
- The `SC` token-object pattern itself (a small named palette + single shared radius constant, `WalletScreen.tsx:14-25`) — keep this structure even if the specific hex values or the decision to roll it out app-wide changes later.
- Working Deposit/Send buttons and their `navigation.navigate(...)` wiring (`WalletScreen.tsx:87-93`) — these are the one part of the interaction design that is already honest and functional.

Discard:
- Request and Scan buttons in their current form (`WalletScreen.tsx:95-102`) — fully styled, screen-reader-announced as functional, but no `onPress` at all. Evidence: `01-evidence.md` Copy & Honesty §5, Accessibility §3. Caused failure on principle #6 (honest).
- The empty-state fallback that substitutes fake mock transactions (`WalletScreen.tsx:33-37,77`) instead of an honest empty state. Evidence: `01-evidence.md` Visual §5. Caused failure on principle #8 (thorough), and is itself a secondary honesty problem (a new user with a real empty wallet sees fabricated transaction history).
- The ungoverned spacing/type scale (8 distinct px values each, one fractional 13.5px type step, `WalletScreen.tsx:130-219`) and the two dead/redundant color tokens (`destructive` unused at `:23`, `primary`/`primaryForeground` duplicating `foreground`/`background` at `:20-21`). Evidence: `01-evidence.md` Visual §1-3. Caused failure on principle #3 (aesthetic).

Top 3-5 moves from the audit (verbatim):
1. Honest (#6): Either wire real `onPress` handlers for Request and Scan, or visually/programmatically mark them disabled (disabled prop, accessibilityState={{disabled:true}}, reduced opacity, no false affordance). Evidence: `WalletScreen.tsx:95-102`.
2. Thorough (#8): Add real Empty (ListEmptyComponent, not hardcoded fallback), Error (visible retry, not console.error), Success (post-action confirmation), Focus, and Disabled states. Evidence: `WalletScreen.tsx:33-37,47,77`.
3. Understandable (#4): Replace raw enum labels ("RECEIVE", "PAYMENT") with sentence-case human copy, and label/spell out "MSH" (Masheleni) at least once near the balance. Evidence: `WalletScreen.tsx:62,84`.
4. Aesthetic (#3): Collapse spacing onto one base unit (4px or 8px multiples), collapse type scale to a small deliberate set (drop the 13.5px fractional step), remove the two dead/redundant color tokens. Evidence: `WalletScreen.tsx:130-219`.
5. Useful (#2): Once #6 is resolved, deliberately decide whether Request/Scan belong in this pass — cut them if not ready rather than shipping decoys. Evidence: `01-evidence.md` Copy & Honesty §5.

Redesign principles in priority order:
1. Honest (#6) — every control that looks tappable either does something real or is visibly/programmatically marked as not-yet-available; zero silent no-ops.
2. Thorough (#8) — all six states (empty, loading, error, success, focus, disabled) exist and were deliberately designed, not defaulted or faked.
3. Understandable (#4) — every label a first-time user sees is plain language, not a raw backend enum or an unexplained currency code.

Deliverables for the plan:
- New information architecture for the action row (which of Deposit/Send/Request/Scan ship now vs. later, and what a not-yet-available action looks like)
- New primary flow (low-fi, labeled): view balance → deposit/send → see it reflected in Recent Activity, compared side-by-side to the current flow
- States checklist for the balance header and the transaction feed: empty, loading, error, success, focus, disabled — each with a concrete design, not a placeholder
- Migration path: this is still a one-screen proof of concept, not wired into the shared theme (`apps/mobile/src/theme/index.ts`) — plan should state whether the redesign stays scoped to WalletScreen.tsx alone or is the first step toward a broader token migration, and what "done" looks like for this pass specifically
- Cutover criteria: what must be true (states complete, no dead controls, copy pass done) before this screen is considered ready to be the template for any wider rollout

Anti-patterns to guard against (specific to REDESIGN):
- Porting the old dead Request/Scan buttons under new styling without resolving their behavior
- Keeping both the shadcn look and the app's existing violet/cyan glass-morphism look behind a flag indefinitely with no decision
- Redesigning further toward "flat neutral AI-app" trend styling rather than toward the principles above (useful, honest, thorough)
- Treating the Preserve list as optional — the working Deposit/Send flow and the light environmental footprint must survive this pass unchanged
