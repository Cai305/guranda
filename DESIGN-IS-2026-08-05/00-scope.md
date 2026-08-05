# Scope

**Audited surface:** `apps/mobile/src/screens/WalletScreen.tsx` — single React Native/Expo screen, dark-mode mobile UI (repo: Guranda, `C:\Users\USER\Desktop\mxit2.0`).

**Primary user:** An authenticated Guranda user checking their MSH (Masheleni) wallet balance and recent activity.

**Primary task:** See current balance at a glance; initiate Deposit or Send; scan recent transactions.

**Constraints:**
- Stack: React Native + Expo (StyleSheet, not CSS/DOM) — no browser devtools contrast tooling applies directly; contrast must be computed manually from hex values.
- Scope is deliberately narrow: this is a one-screen proof of concept, not an app-wide rollout. The screen's own local palette (`SC` object, top of file) is NOT wired into the shared theme yet.
- Must stay comparable against the app's existing design system for regression purposes.

**What changed (input material):** The screen was just restyled from the app's established look (vibrant violet/cyan gradients, glass-morphism, glow shadows, pill radius — see `apps/mobile/src/theme/index.ts`) to a shadcn/ui-inspired neutral grayscale look: near-black background `#0A0A0A`, card `#18181B`, hairline borders at `rgba(255,255,255,0.1)`, ~10px radius, no gradients/glow, flat bordered "outline"-style buttons instead of filled gradient pills.

**Reference for regression comparison:** `apps/mobile/src/theme/index.ts` (COLORS, GRADIENTS, RADIUS, SHADOW, TYPOGRAPHY) — the design language every other screen in the app still uses.

**No running instance available for live screenshots** — local dev servers are up (API :3000, Expo web :8081) but the Browser pane's screenshot/navigation pipeline is currently stuck in this session. Visual Evidence subagent will read source (StyleSheet objects, theme tokens) and mark findings `INFERRED` rather than measured from a live render.
