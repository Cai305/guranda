# Guranda — Phase 1/2: Existing-App Audit & Vision Mapping

Companion to `16_Product_Vision_Master.md`. Produced by inspecting the actual repository (file:line citations below) — not assumed. This is the required Phase 1 (Audit) and Phase 2 (Product Architecture) deliverable the vision document calls for before any redesign work begins.

Read this before starting any Phase 3+ work. It exists so a future session doesn't re-derive "what already exists" from scratch, and so implementation work targets real gaps instead of rebuilding things that already work.

---

## How to read this doc

For each vision area: **What exists today** (grounded, cited) → **Alignment** (already matches the vision, don't touch) → **Gap** (doesn't exist yet, safe to build) → **Conflict** (exists but contradicts the vision — needs a product decision before changing, not a unilateral engineering call).

---

## Navigation & structure

**Bottom tabs** (`apps/mobile/src/navigation/BottomTabNavigator.tsx:46-50`): Home, Chats, Explore, Life, Profile. ~130 screens registered in `RootNavigator.tsx`, spanning every mini-app plus social, live, AI, editor, wallet/finance areas.

**Mini-apps registry** (`apps/mobile/src/config/miniAppManage.ts`, `MINI_APP_MANAGE_REGISTRY`): 14 entries with full owner CRUD — Property, Work, Restaurant (eat), Shop, Marketplace, CarFind, Travel, Events (entertainment), Stokvels (finance), Health, Learning, Usernames, Carwash, Salon (hair). Consumed by `DashboardScreen` to render manage tiles.

**Backend modules** (`apps/api/src/app.module.ts:87-147`): 62 feature modules already registered — everything from Chess/Ludo/Pool/Murabaraba/WordBattle/Turbo Racing games to Cards/Tournaments, Property/Marketplace/Shopping/Travel/Work/Health/Learning/Hair/Carwash/CarFind mini-apps, Live/LiveReports, Story, Achievements/DailyChallenges/Referrals/Leaderboard, Relationships/Couples, Trust&Safety/Intelligence, Ranking, Usernames, Reactions, Notifications, Assistant.

**Alignment**: The "one ecosystem, many capabilities" structure the vision asks for already exists at the data-model level — every mini-app is a first-class backend module behind one auth/identity system, not a bolted-on separate app. §4 and §36 are largely already true architecturally.

---

## Explore / Social / Trending / Discovery (vision §14-17)

**What exists**: `ExploreScreen.tsx` has three in-page tabs via `activeTab` state (lines 654-669) — **Social Feed**, **Trending**, **Challenges** — plus a button (line 673) that navigates out to `Discovery` (`DiscoverScreen.tsx`, a separate screen). `DiscoverScreen.tsx` has its own `feed`/`trending` tabs (line 18) and 15 category chips (Gaming, Music, Education, Cooking, Sports, Comedy, Technology, Fashion, Travel, Fitness, Art, Science, News, DIY, Finance — line 10), content is `VideoCard`-based. `TrendingStoriesFeed.tsx` renders ephemeral vertical Stories (`StoryDto`, CCR reward rate 0.58 — line 19), a third distinct content type.

**Alignment**: Social/Trending are already separated as distinct concepts (just co-located as tabs, not distinct top-level destinations) — the vision's "Social = conversations, Trending = momentum" split (§16) is already partially real, not something to invent from zero.

**Gap**: Trending's current scope is Explore-tab-local (posts/challenges), not yet the cross-ecosystem momentum surface §16 describes (surfacing live streams, products, mini-app activity, not just posts+challenges). Challenges currently live in their own permanent tab rather than flowing into Trending when they gain momentum (§16's explicit requirement) — this is a real, well-scoped gap.

**Conflict (needs a decision, not a unilateral change)**: Discovery today is short-and-long-form video mixed by category, not filtered toward "intentional, ~1min+, deliberate viewing" (§17). Redefining Discovery's content model touches the video upload flow, the feed-ranking algorithm, and probably needs a stance on what happens to short-form video already in the catalog (re-tag into Social's feed? keep as-is? filter by duration going forward only?). This is a product decision, flag before touching `video.service.ts`'s feed/trending queries.

---

## Live streaming (vision §20-21)

**What exists**: `apps/mobile/src/config/liveCategories.ts` already defines 12 adaptive categories (`social`, `conversation`, `shopping`, `business`, `gaming`, `education`, `entertainment`, `sports`, `food`, `ride`, `career`, `dating`) — 11 of 12 are `status: 'live'` with real, category-specific UI (only `ride` is `'construction'`). This session's own work (multi-guest streaming, Chess spectator board view distinct from a raw screen share, Shopping Live's product showcase, moderator tools) directly implements §20's "Guranda doesn't stream screens, it streams experiences" principle already.

**Alignment**: This is the vision area closest to already-done. The adaptive-live architecture (`LiveCategoryHostPanel.tsx` / `LiveCategoryViewerPanel.tsx` branching per category) is exactly the pattern §21 asks for — new mini-apps can plug in a live presentation the same way Chess/Shopping/Dating already do.

**Gap**: Not every mini-app has a live presentation yet (only Chess/Shopping/Dating/Conversation are deeply customized; other categories are UI-differentiated but not mini-app-driven). `ride` category is still a stub. No formal "mini-app declares its own live config" API exists yet — today each category is hand-built in the panel components rather than mini-apps registering a live capability.

---

## Profile (vision §6-12, §27-28) — the largest gap

**What exists**: `ProfileScreen.tsx` — a static `BADGES` array (line 10) + `VERIFY_BADGE` verification-status badges (line 29) + a single `user?.reputation` number with a "Reputation" label (lines 167-168) + a couples `relationship.rank` value (line 160). `DashboardScreen.tsx` shows `activeUsername.reputationScore` (line 289) and story "ranks received" stats (line 420). No matches anywhere for "league", "companion", or "xp" as profile concepts.

**Alignment**: None of the vision's core profile asks exist yet in a real form — this confirms Phase 5 (Profile / Digital Headquarters) is genuinely greenfield within the existing app, not a redesign of something already working. Good news: nothing here needs to be preserved carefully or migrated — it's additive.

**Positive signal worth verifying, not assuming**: reputation is read via `activeUsername.reputationScore`, i.e. already hung off a `Username` entity rather than directly off `User`. If that's the actual data model, it may already partially satisfy §7's requirement to separate account identity from username ownership — needs a schema read before either assuming it's solved or rebuilding it from scratch.

**Gap (net-new, matches vision directly)**: the four pillars (Reputation/Growth/Rank-Nano/Impact) as a structured, narrated system; the companion/pet; leagues with visual progression; badge scarcity (fixed supply) and transfer-vs-achievement-history separation; badge utility (access/fees/exclusive content).

---

## Wallet / Finance (vision §5)

**What exists**: `WalletScreen.tsx` labels the balance "Total Balance (Masheleni)" (line 242) and displays amounts as `{amount} MSH` throughout (lines 226, 243). `01_PRD.md:11,47` confirms Masheleni is an XRPL-based stablecoin pegged 1:1 to Rand — so it's already Rand-equivalent in value, just not Rand-labeled in the UI.

**Conflict (needs a decision)**: §5 says users should see "Rand," not blockchain/token terminology, and MSH is a token/brand name surfaced everywhere — transaction types, gift catalog pricing (1-10,000 MSH range, this session's own earlier work), wallet balance, dashboards. Renaming the user-facing unit from "MSH" to "R"/"Rand" is a large-blast-radius change (every screen that prices anything) and a brand decision (does "Masheleni" disappear as a product name entirely, or stay as the backend/technical name while the UI shows "R"?). Do not do this unilaterally — needs explicit confirmation of the intended display convention before touching pricing displays app-wide.

---

## Business / Creator / Merchant (vision §23-25)

**What exists**: `DashboardScreen.tsx` + the 14-entry mini-app registry already function as a business command-center — owner CRUD, orders, per-module manage screens. This session's earlier work (salon owner CRUD, CCR monthly payout analytics, mini-app earnings cards) already built toward "business headquarters" summarization.

**Alignment**: Structurally close to §23's ask already — one dashboard, adaptive tiles per what the account actually runs, not a separate app.

**Gap**: The AI-narrated summary layer (§23's "Your chicken promotion is performing 23% better than last week") doesn't exist — current dashboard shows raw stats, not AI-generated narrative insight. No formal personal/creator/merchant/business/enterprise account-type distinction exists yet; today it's "you have mini-apps you own" rather than an explicit account mode.

---

## AI system (vision §2-3, §29, §40)

**What exists**: `ai-runtime.module.ts` exports `AgentRuntimeService`, `ActionExecutorService`, `ContextManagerService`, `ConversationHistoryService`, `CompanionChatService`, and an `LLM_ADAPTER` (Anthropic). A `CompanionChatScreen` route already exists in `RootNavigator.tsx` (separate from the generic `AiChatScreen`) and an `AiSetupScreen`/`AiAccess` flow already exists. No hardcoded AI name found in `AiChatScreen.tsx`.

**Needs inspection before deciding this is a gap**: `CompanionChatService` + `AiSetupScreen` strongly suggest a user-nameable companion/persona setup flow may already exist in some form. Read `AiSetupScreen.tsx` and `CompanionChatService` before building §3's "user names their AI" feature — there's a real chance this is already solved or half-solved.

---

## Entertainment / licensed media (vision §18-19)

**What exists**: `EntertainmentModule` (backend) + `entertainment` mini-app registry entry (label "Events") + `EventFormScreen.tsx`/`EventTicketsScreen.tsx` (touched earlier this session) — this is an **events/ticketing** mini-app, not a movies/series/music streaming catalog.

**Conflict / major scope gap**: §18 describes Entertainment as containing licensed movies, series, music, "premium entertainment experiences" — that content catalog, DRM/rights management, and licensing relationships do not exist in this codebase at all. This is not a redesign task, it's a net-new product line requiring real licensing agreements before any engineering is meaningful (the vision doc itself says so — §18, §39: "do not treat licensed content casually," "do not fake... production integrations"). Flag as out of scope for engineering work until licensing/legal status is confirmed by the product owner.

---

## Achievements / Challenges / Gamification

**What exists**: `AchievementsModule` and `ChallengesModule` are independent backend modules (`app.module.ts:115,140`), not nested. `achievements.service.ts:11-27` defines two static sets — card-game achievements (`CARDS_FIRST_WIN`, `CARDS_10_WINS`, etc.) and challenge achievements (`CHALLENGE_FIRST_ENTRY`, `CHALLENGE_100_COMPLETED`, `CHALLENGE_STREAK_30`, etc.).

**Alignment**: A real achievements substrate already exists and already spans two feature areas (cards + challenges) — this is exactly the kind of system the vision's badge/rank layer (§9, §12) should sit on top of and extend, not replace.

---

## Kids product (vision §26)

No implementation exists; the vision document itself defers this to a future dedicated product. No action needed now — just recorded here so it isn't rediscovered as a "missing feature" later.

---

## Summary: where the vision is mostly a naming/framing exercise vs. real net-new engineering

**Already substantially real, needs connecting/framing, not rebuilding**: Live's adaptive-per-category architecture, the one-ecosystem/one-identity mini-app structure, the business-dashboard concept, the achievements substrate, Social-vs-Trending separation, username-as-entity data model (verify).

**Genuinely net-new (safe to build, no conflicting existing implementation)**: profile pillars (Reputation/Growth/Rank/Impact) as a structured narrated system, companion/pet, league visuals, badge scarcity + transfer/history separation, AI-narrated business insights, per-mini-app live-config registration API, cross-ecosystem Trending (not just Explore-tab-local).

**Needs a product decision before engineering starts**: Discovery's content model change (duration/intent filtering, what happens to existing short-form catalog), MSH→Rand display convention (and whether "Masheleni" survives as a name anywhere user-facing), Entertainment's licensed-media scope (this one needs real licensing/legal groundwork, not just an engineering decision).

---

## Recommended next step

Per the vision's own Phase 3 ("Design System") and Phase 5 ("Profile") ordering, and because Profile is (a) the largest genuinely-greenfield area, (b) has zero conflicting existing implementation to reconcile, and (c) is the single highest-leverage piece for making the app *feel* like the vision — it's the natural first implementation phase once the product decisions above are resolved (or explicitly deferred).

Before writing any Phase 3+ code, confirm scope with the product owner: which phase to start on, and resolution (or explicit deferral) of the three flagged conflicts above.
