# Evidence

All citations are `apps/mobile/src/screens/WalletScreen.tsx` unless noted. Theme reference is `apps/mobile/src/theme/index.ts`.

## Structural Evidence

1. **Interactive-element count:** 5 distinct — 4 discrete `TouchableOpacity` (Deposit :87, Send :91, Request :95, Scan :99) + 1 repeating FlatList transaction-row template (defined :51-71, invoked :108-113).
2. **Max nesting depth:** 6 levels — `SafeAreaView(81) → View feedContainer(106) → FlatList(108) → View txRow(56) → View txLeft(57) → View txIconWrap(58)`.
3. **Repeated-pattern count:** Action-button row — 4 instances, identical `styles.actionButton` treatment (:87-102), but Deposit/Send have `onPress`, Request/Scan do not (structurally identical, functionally divergent). Card border/radius treatment (`borderWidth:1`, `SC.border`, `SC.radius`) reused identically in 3 separate style blocks (actionButton :158-160, txRow :184-187, txIconWrap :197-199) — not consolidated into a shared style.
4. **Dead-prop / unused-import count:** 0 unused imports.
5. **Theme token counts (comparison):** `theme/index.ts` — 16 COLORS tokens, 12 GRADIENTS, 5 RADIUS steps. WalletScreen.tsx imports **none** of these — it defines a separate local `SC` object (:14-25) with its own values, fully decoupled from the shared design system.

## Visual Evidence (INFERRED — no live render available)

1. **Spacing scale:** `[2, 6, 8, 10, 12, 14, 20, 24]` px — 8 distinct values, no consistent base unit (e.g. not a clean 4px or 8px multiple set: 2, 6, 10, 14 break an 8px grid; 12, 20, 24 fit one).
2. **Type scale:** `[11, 12, 13, 13.5, 14, 15, 18, 36]` px — 8 distinct values for one screen, including a fractional step (13.5, :209) with no evident system.
3. **Distinct color count:** 7 unique values across 9 `SC` keys (`primary` duplicates `foreground`, `primaryForeground` duplicates `background`). `destructive` (`#EF4444`, :23) is declared but **never referenced** anywhere in the file — dead token.
4. **Lowest contrast ratio:** worst pairing is `SC.mutedForeground` (#8A8A8E) on `SC.card` (#18181B) = **5.15:1** — passes WCAG AA for both normal text (≥4.5:1) and large text (≥3:1). Best pairing `SC.foreground` on `SC.background` = 18.97:1.
5. **States-present checklist:**
   - Empty state: **missing** — no `ListEmptyComponent`; falls back to hardcoded mock transactions (:33-37) instead, so a genuinely-empty wallet never renders an empty state.
   - Loading state: **present**, :73-75 — full-screen spinner, no skeleton, no partial UI.
   - Error state: **missing** — fetch failure only does `console.error(e)` (:47), no user-visible error/retry.
   - Success state: **missing** — no confirmation/toast after any action.
   - Focus state: **missing** — no focus styling/handling anywhere.
   - Disabled state: **missing** — no `disabled` prop or style branch on any TouchableOpacity.

## Copy & Honesty Evidence

1. **User-facing strings:** "Total Balance" (:83), "MSH" (:84, :67), "Deposit" (:89), "Send" (:93), "Request" (:97), "Scan" (:101), "Recent Activity" (:107), raw transaction-type enum e.g. "RECEIVE"/"PAYMENT" (:62), locale date string (:63), amount e.g. "+150.00 MSH" (:67).
2. **Inflations:** none found.
3. **Dark patterns:** none found.
4. **Jargon/unclear labels:** "MSH" unexplained currency code (:84, :67) — plain fix: spell "Masheleni" once, or label it. Raw all-caps enum as transaction type (:62, e.g. "RECEIVE") — plain fix: sentence-case human labels ("Received", "Sent").
5. **Label→behavior mismatches (load-bearing finding):** **"Request" (:97) and "Scan" (:101) buttons have no `onPress` prop at all (:95, :99) — tapping them does nothing.** Deposit (:87-89) and Send (:91-93) both have working `onPress` → `navigation.navigate(...)`. This predates the shadcn restyle (styling-only change; behavior was already absent) but is directly visible on the audited surface.

## Weight & Friction Evidence

1. **Network requests on mount:** 1 — `fetchApi('/wallets/me')` in `useEffect` (:39-49, call at :42).
2. **Blocking behavior:** Blocks — full-screen spinner substitutes for *all* content until the fetch resolves (:73-75); no partial UI (e.g. cached balance, skeleton) shown first.
3. **Animation count on idle screen:** 0 — no `Animated.*`/Lottie usage anywhere.
4. **Notification/modal on initial load:** 0 — no `Alert.alert`/`Modal`/toast fires automatically.
5. **Import weight signal:** `react-native` core components (:2), `react-native-safe-area-context` (:3), `@expo/vector-icons` (:4) — all already-shared app dependencies, no new weight added by this screen specifically.

## Accessibility Evidence

1. **accessibilityLabel/Role presence:** Missing on all 5 interactive surfaces (4 action buttons :87-102, transaction row :56) — relies entirely on RN's default child-text fallback announcement.
2. **Focus order:** Deposit(:87) → Send(:91) → Request(:95) → Scan(:99) → transaction rows(:108-113) — matches visual top-to-bottom order, no traps.
3. **Screen-reader reachability:** Deposit/Send are announced and activatable. **Request/Scan are announced identically to working buttons (via child-text fallback) with no `accessibilityState`/hint indicating they're non-functional — a screen-reader user has no way to know activation is a no-op**, same defect as sighted users but worse (no visual "coming soon" affordance either).
4. **Touch target size:** `actionButton` (:152-162) — explicit `width: 72`, intrinsic height ≈ 64pt (12+12 vertical padding + 20pt icon + 6pt gap + ~14pt text line). Both dimensions clear the 44×44pt minimum.
5. **Icon-only vs icon+label:** All 4 action buttons are icon+label (:88-89, :92-93, :96-97, :100-101). Transaction-row icon (:58-59) is icon-only within its own wrapper but sits beside sibling text (type, date, amount) in the row — not a standalone icon-only control.

## Known Gaps

- No live render was available (Browser pane stuck this session) — all Visual/Structural findings are static-source-derived and marked INFERRED where applicable; actual on-device rendering (font metrics, OS-level dynamic type, RN StyleSheet unit rounding) was not verified.
- FlatList real-world nesting/instance count depends on runtime `transactions.length`, not verifiable statically.
- Whether Request/Scan's missing handlers are an intentional "not yet built" placeholder or an oversight was not determined from the code alone.
