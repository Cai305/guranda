# Implementation Plan — Redesign `apps/mobile/src/screens/WalletScreen.tsx`

Source: `DESIGN-IS-2026-08-05/04-handoff-prompt.md` (REDESIGN verdict, 13/30, principles #6 Honest and #8 Thorough scored 0).

Each phase below is self-contained — it names exact files, exact patterns to copy (with file:line), and a verification step, so it can be run in a fresh chat context without re-reading the audit.

---

## Phase 0: Documentation Discovery (facts gathered, not invented)

**Data contract** — `apps/mobile/src/utils/api.ts:44`, `fetchApi(endpoint, options)` returns the raw `Response`; it does not throw on non-2xx and does not parse JSON. Convention used elsewhere (`SendScreen.tsx:65-67`, `DepositScreen.tsx:77-78`):
```ts
const data = await res.json();
if (!res.ok) throw new Error(data.message || 'Couldn't load wallet.');
```
`WalletScreen.tsx` currently skips this check entirely — an error JSON body is silently treated as wallet data.

**Real backend shape** — `GET /wallets/me` (`apps/api/src/wallets/wallets.controller.ts:27-30`, `wallets.service.ts:40-55`) returns the raw Prisma `Wallet` row: `{ id, userId, balanceMasheleni (Float→number), pendingCreatorFunds, xrplAddress, encryptedSeed, createdAt, updatedAt, transactions: Transaction[] }` (last 20, desc, not paginated). `Transaction.amount` is a `Decimal` → serializes as a **string** (existing `Number(item.amount).toFixed(2)` at `WalletScreen.tsx:67` is already correct). `Transaction.type` is a free string, real values: `SEND, RECEIVE, PAYMENT, DEPOSIT, STORY_LIKE, STORY_COMMENT, STORY_RANK, STORY_ITEM_SALE, EAT_ORDER_PAYOUT, SHOPPING_ORDER_PAYOUT`. `Transaction.status` is `PENDING | SUCCESS | FAILED` and is currently never read by the screen. `encryptedSeed`/`xrplAddress` are present in the response and must not be destructured or displayed.

**Empty-state convention** — icon + centered one-line friendly copy: `ChallengeDetailScreen.tsx:233-239`, `ExploreScreen.tsx:329-336`. Loading-vs-empty disambiguation inside `ListEmptyComponent`: `ChallengesLeaderboardScreen.tsx:79-83` (`loading ? <ActivityIndicator/> : <Text>...</Text>`).

**Error-state convention** — no dedicated retry component exists anywhere in the app (confirmed by exhaustive grep). The established pattern for user-visible errors is `Alert.alert(title, message, buttons)` on mutation failures (`SubmitChallengeEntryScreen.tsx:50-58`), safe cross-platform including web via the existing monkey-patch at `apps/mobile/src/utils/webAlertPolyfill.tsx:46-51`. Applying `Alert.alert` with a Retry button to an *initial-load* failure (not just a mutation) is a first-of-its-kind use in this codebase, but consistent with the app's only existing error-feedback mechanism — no new component needed.

**Success-state convention** — `SendScreen.tsx:69-77` already shows `Alert.alert('Transfer Complete! ✅', ...)` on send; `DepositScreen.tsx:118-125` already shows an inline "Deposit started" card. WalletScreen's real gap isn't a missing toast — it's that it only fetches `[]` on mount (`WalletScreen.tsx:39-49`), so returning from Send/Deposit shows a stale balance/list. Fix is a focus-refetch, not a new success UI.

**Pull-to-refresh convention** — `RefreshControl` + `refreshing` state, ~30 screens, canonical example `ShoppingOrdersScreen.tsx:25-37,96`. `RefreshControl` takes identical props on `FlatList` (WalletScreen's list type) via its `refreshControl` prop.

**Disabled-control convention** — `disabled={cond}` always paired with an opacity-drop style branch (`{ opacity: 0.4-0.5 }`), used 30+ times app-wide. Closest same-shape precedent: `ChessLobbyScreen.tsx:83,97` — disabled option + small inline "Coming Soon" caption text directly below it. Also relevant: `DashboardScreen.tsx:113-134` locked-tile pattern (`opacity: 0.45`, swapped subtitle). Dedicated `ComingSoonNote`/`ConstructionBadge` components exist (`components/ComingSoonNote.tsx`, `components/ConstructionBadge.tsx`) but are built for banner/pill placement, not a 72px vertical icon+label button — the inline-caption pattern fits better here.

**Accessibility convention** — `accessibilityState`/`accessibilityRole` are used nowhere in the codebase (RN auto-derives `accessibilityState.disabled` from the `disabled` prop). `accessibilityLabel` is used sparingly (~7 spots) on icon-only buttons. No shared `Button` component exists anywhere in `apps/mobile/src/components` — every screen hand-rolls `TouchableOpacity`.

**Shared token scale** — `apps/mobile/src/theme/index.ts` exports (verified verbatim):
```ts
export const SPACING = { xs: 4, sm: 8, md: 12, lg: 20, xl: 28, xxl: 40 };
export const TYPOGRAPHY = { display:{fontSize:40,...}, h1:{fontSize:32,...}, h2:{fontSize:24,...}, h3:{fontSize:20,...}, h4:{fontSize:18,...}, body1:{fontSize:16,...}, body2:{fontSize:14,...}, label:{fontSize:13,...}, caption:{fontSize:12,...}, button:{fontSize:15,...} };
export const RADIUS = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 };
```
Import path from `WalletScreen.tsx`: `import { SPACING, TYPOGRAPHY } from '../theme';` (same relative depth as `HomeScreen.tsx:9`). ~207 of 208 screens already use this scale; `FinanceHomeScreen.tsx` (wallet-adjacent) shows the established pattern of adopting `SPACING`/`TYPOGRAPHY` increments while keeping some local literals — direct precedent for borrowing increments without adopting the shared `COLORS`.

### Allowed APIs / patterns for this plan
- `fetchApi` (`utils/api.ts`) + manual `res.ok` check + `data.message` convention.
- `Alert.alert(title, message, buttons)` — cross-platform safe, no new component.
- `RefreshControl` on `FlatList` via its native `refreshControl` prop.
- `useFocusEffect` (already used in `DepositScreen.tsx:37`) for refetch-on-return.
- `disabled` prop + opacity style branch + inline caption `<Text>` — no new component.
- `SPACING`, `TYPOGRAPHY` from `../theme` — increments only, not `COLORS`.

### Anti-patterns to avoid (none of these exist in the codebase — do not invent them)
- A new Toast/Snackbar component.
- A new generic `Button` component.
- A new "coming soon" component beyond the existing inline-caption/`ComingSoonNote` options.
- Rendering or destructuring `encryptedSeed` / `xrplAddress` from the wallet response.
- Silently swallowing a non-2xx response as valid data (the bug `WalletScreen.tsx` has today).

---

## Phase 1: Data contract & freshness (foundation)

**What to implement:**
1. In the `fetchApi('/wallets/me')` chain (`WalletScreen.tsx:42-48`), check `res.ok` and throw `new Error(data.message || "Couldn't load your wallet.")` on failure — copy the exact shape from `SendScreen.tsx:65-67`.
2. Add a typed response shape covering only the fields actually rendered: `{ balanceMasheleni: number, transactions: { id: string, amount: string, type: string, status: string, timestamp: string }[] }`. Do not type or destructure `encryptedSeed`/`xrplAddress`.
3. Replace the mount-only `useEffect(() => {...}, [])` with `useFocusEffect(useCallback(() => { load(); }, []))`, copying the pattern from `DepositScreen.tsx:37`, so returning from Send/Deposit shows fresh data.
4. Add pull-to-refresh: `refreshing` state + `RefreshControl` on the existing `FlatList`, copying `ShoppingOrdersScreen.tsx:25-37,96`.

**Documentation references:** `apps/mobile/src/utils/api.ts:44,73-90`; `apps/mobile/src/screens/SendScreen.tsx:65-67`; `apps/mobile/src/screens/DepositScreen.tsx:37,77-78`; `apps/mobile/src/screens/shopping/ShoppingOrdersScreen.tsx:25-37,96`.

**Verification checklist:**
- `curl` (or the app) confirms `GET /wallets/me` shape matches the new type.
- `npx tsc --noEmit` clean for `apps/mobile`.
- Manually force a 401 (expired token) — confirm existing `onUnauthorized` flow fires, no crash.
- Send MSH from a test account, navigate back to Wallet — balance/list update without a manual app reload.
- Pull down on the transaction list — spinner shows, list refetches.

**Anti-pattern guards:** no `Alert`/UI work in this phase — pure data-layer fix. No new dependency added (`RefreshControl`/`useFocusEffect` are both already-imported RN/React-Navigation primitives used elsewhere).

---

## Phase 2: Empty, loading, and error states (closes #8 Thorough)

**What to implement:**
1. Delete `fallbackTransactions` (`WalletScreen.tsx:33-37`) and its use at `:77` entirely — no more fake mock data standing in for a real empty wallet.
2. Add `ListEmptyComponent` to the `FlatList`, copying the icon+copy shape from `ChallengeDetailScreen.tsx:233-239` (icon size 40, muted color, centered) with wallet-specific copy (e.g. "No transactions yet"), and the loading/empty disambiguation from `ChallengesLeaderboardScreen.tsx:79-83` so a fetch-in-flight doesn't briefly flash "No transactions yet".
3. On the Phase-1 fetch failure (`catch` block), fire `Alert.alert("Something went wrong", "Couldn't load your wallet. Please try again.", [{ text: 'Retry', onPress: load }, { text: 'OK' }])` — same `Alert.alert` mechanism already used app-wide for errors (`SubmitChallengeEntryScreen.tsx:50-58`), applied here to an initial-load failure for the first time in this codebase — call this out in review as intentional, not accidental scope creep.

**Documentation references:** `ChallengeDetailScreen.tsx:233-239`; `ChallengesLeaderboardScreen.tsx:79-83`; `SubmitChallengeEntryScreen.tsx:50-58`; `webAlertPolyfill.tsx:46-51` (confirms `Alert.alert` is web-safe).

**Verification checklist:**
- Fresh/empty test account → real empty state renders, not mock transactions.
- Temporarily break the endpoint (or use airplane mode) → `Alert` fires with a working Retry button that re-triggers `load()`.
- Normal account with transactions → list renders as before, no regression.

**Anti-pattern guards:** do not build a dedicated inline error-banner component — none exists in this codebase; `Alert.alert` is the established mechanism, use it.

---

## Phase 3: Confirm success is real, not just believed (closes remaining #8 gap)

**What to implement:** No new UI. Confirm Phase 1's focus-refetch is the correct and sufficient "success" signal — `SendScreen.tsx` and `DepositScreen.tsx` already own their own success confirmation (Alert / inline card respectively); WalletScreen's job is only to reflect the result, which Phase 1 now does.

**Verification checklist:** Complete a Send and a Deposit from Wallet, in both cases confirm the sub-screen's existing success UI still fires unchanged, and Wallet reflects the new balance/transaction immediately on return (no stale data, no duplicate success alert).

**Anti-pattern guards:** do not add a second, redundant success toast/alert on WalletScreen itself — that would duplicate `SendScreen`'s existing confirmation.

---

## Phase 4: Honest Request/Scan treatment (closes #6 Honest — highest priority)

**What to implement:**
1. Decision for this pass: Request and Scan are **not** wired to real functionality (that requires new backend endpoints out of scope for this redesign) — they are explicitly marked disabled/coming-soon instead of left as silent no-ops.
2. On both `TouchableOpacity` (`WalletScreen.tsx:95-102`): add `disabled`, a paired style branch dropping opacity to `0.4` (matching the app-wide convention, e.g. `CarListingFormScreen.tsx:224`), a small inline caption `<Text>` reading "Coming Soon" directly under the label (copying `ChessLobbyScreen.tsx:83,97`), `accessibilityState={{ disabled: true }}`, and `accessibilityLabel="Request — coming soon"` / `"Scan — coming soon"`.

**Documentation references:** `CarListingFormScreen.tsx:224`; `ChessLobbyScreen.tsx:83,97`; `DashboardScreen.tsx:113-134` (locked-tile precedent).

**Verification checklist:**
- Tap Request/Scan — no navigation, no crash, visibly dimmed vs. Deposit/Send.
- `read_page` accessibility tree (or a screen reader) reports the disabled state and "coming soon" label, not silence.
- Screenshot: Deposit/Send visually distinct (full opacity) from Request/Scan (dimmed + caption).

**Anti-pattern guards:** do not silently leave them as-is under new styling (this is the exact anti-pattern the audit named) — every existing action must either work or honestly say it doesn't.

---

## Phase 5: Copy pass (closes #4 Understandable)

**What to implement:**
1. Add a small `humanizeTransactionType(type: string)` mapping covering every real value from Phase 0 (`SEND→'Sent'`, `RECEIVE→'Received'`, `PAYMENT→'Payment'`, `DEPOSIT→'Deposit'`, `STORY_LIKE→'Story like'`, `STORY_COMMENT→'Story comment'`, `STORY_RANK→'Story ranking'`, `STORY_ITEM_SALE→'Item sale'`, `EAT_ORDER_PAYOUT→'Food order payout'`, `SHOPPING_ORDER_PAYOUT→'Shopping order payout'`) and use it in place of the raw enum at `WalletScreen.tsx:62`.
2. Spell out "Masheleni (MSH)" once near the balance header (`WalletScreen.tsx:84`); leave "MSH" shorthand elsewhere.

**Verification checklist:** with a test account that has transactions of at least 2-3 different real types, confirm every one renders human copy, never a raw uppercase enum.

**Anti-pattern guards:** don't invent copy for `type`/`status` values not confirmed in Phase 0 — if an unmapped value appears at runtime, fall back to a sentence-cased version of the raw string rather than crashing or showing `undefined`.

---

## Phase 6: Token governance (closes #3 Aesthetic)

**What to implement:**
1. `import { SPACING, TYPOGRAPHY } from '../theme';` in `WalletScreen.tsx`.
2. Replace every ad hoc spacing value in `styles` (`WalletScreen.tsx:119-220`) with the nearest `SPACING` step (`xs:4, sm:8, md:12, lg:20, xl:28, xxl:40`) — eliminates the ungoverned 8-value scale.
3. Replace ad hoc font sizes with the nearest `TYPOGRAPHY` size/style object, eliminating the fractional `13.5` at `:209`.
4. In the local `SC` object (`:14-25`), delete the unused `destructive` key and the redundant `primary`/`primaryForeground` aliases (`primary` duplicates `foreground`, `primaryForeground` duplicates `background`) — keep only colors genuinely referenced: `background, card, border, foreground, mutedForeground, success, radius`.

**Documentation references:** `apps/mobile/src/theme/index.ts:56-84`; `FinanceHomeScreen.tsx:7,110,138,141` (precedent for partial adoption — increments borrowed, colors kept local).

**Verification checklist:**
- Grep the file for remaining bare numeric literals in `styles` that aren't `SPACING`/`TYPOGRAPHY` references or the two intentionally-fixed sizes (`actionButton` width `72`, `txIconWrap` size `36`).
- Confirm `SC` has no unused/redundant keys.
- Visual screenshot comparison — spacing/type rhythm should look tighter and more consistent, colors unchanged.

**Anti-pattern guards:** do **not** import or adopt `COLORS`/`GRADIENTS` from the shared theme in this pass — the shadcn palette (`SC`'s color values) stays local per the scope constraint below. Only increments migrate, not the visual identity.

---

## Migration path / scope statement (per handoff's "Deliverables" ask)

This redesign **stays scoped to `WalletScreen.tsx` alone**. The shadcn-style color palette (`SC`'s `background`/`card`/`border`/`foreground`/etc.) is **not** promoted into `apps/mobile/src/theme/index.ts` in this pass — that remains a separate, later decision once this screen is reviewed. Only the `SPACING`/`TYPOGRAPHY` *increments* are borrowed from the shared theme (Phase 6), for internal governance, not visual-identity alignment. No other screen is touched by this plan.

## Cutover criteria

This screen is ready to be considered a template for any wider shadcn-style rollout only once, in this exact order: (1) Phase 4 ships — zero dead/silently-inert controls, (2) Phase 2 ships — all six states real, (3) Phase 5 copy pass done, (4) Phase 6 token governance applied. Until all four are true, treat this as a proof-of-concept confined to one screen, not a pattern to copy elsewhere.

---

## Final Phase: Verification

1. `npx tsc --noEmit` clean in `apps/mobile`.
2. Grep for regressions: no `fallbackTransactions`, no raw `item.type` rendered directly in a `<Text>`, no bare `console.error(e)` as the only error handling on the initial fetch, no unused `SC` keys, no new Toast/Button/error-banner component introduced.
3. Browser-pane pass (per this session's standing verification workflow): load with an empty test account (real empty state), a populated account (human-readable types, correct balance, fresh after Send/Deposit), tap Request/Scan (disabled + coming-soon, accessible), force an error (Alert + working Retry), pull-to-refresh (spinner + refetch). Screenshot before/after for the record.
4. Confirm the Migration path statement still holds — no other screen or shared theme file was touched.
