# Guranda — Engine Architecture: Audit & Design

Companion to `18_AI_Engine_Architecture_Master.md`. Produced by inspecting the actual repository (five parallel Explore passes + direct reading of `16_Product_Vision_Master.md`, `17_Product_Audit_And_Mapping.md`, `ARCHITECTURE_RECOMMENDATIONS.md`) — not assumed. This is the Phase 1/2 (Audit + Target Architecture) deliverable `18`'s §27/§33 requires before any implementation.

**Headline finding, before the detail:** this is not a greenfield engine build. A working proto-Orchestrator, a ~150-tool Capability Registry, and a real widget-contract mechanism already exist in production, just under different names and without the vision's vocabulary. The single highest-leverage move across every phase below is **connecting and renaming what's real**, not building parallel systems next to it.

---

## 1. Current architecture (as it actually runs today)

```
Mobile (AiChatScreen / AiChatDropdown / HandsFreeOverlay)
        │  POST /ai/chat  {messages}
        ▼
AiController → AiService.chat()
        ▼
AgentRuntimeService.runLoop()          ← the de facto Orchestrator
   ├─ buildSystemPrompt()  (agent identity + capabilities + mini-app catalog + history)
   ├─ LlmAdapter.runTurn() → AnthropicAdapter (claude, via LLM_ADAPTER token)
   ├─ ToolRegistryService.resolve(name) → one of ~150 registered tools
   ├─ ActionExecutorService.execute()  → calls the real domain service (wallets, travel, ride, ...)
   ├─ orb.delegate / specialist.yield  → hands off to 1 of 5 hardcoded specialist agents
   ├─ ContextManagerService            → persists AiSession(activeModule, taskSummary, activeAgentId)
   ├─ ConversationHistoryService       → persists AiConversationMessage (per companionId)
   └─ ToolExecutionLog                 → audit trail of every tool call/result
        ▼
ToolWidget[] (renderAs tag) → AiWidgetRenderer (mobile) → WidgetCard / TripCard / RideStatusCard / PlatformWidget
```

Three separate LLM entry points exist side by side: the real per-user assistant above; `AssistantController` (website marketing bot, own hardcoded prompt, no tools, no auth); and `CompanionChatService` (fixed personas Sipho/Thandi/Guranda Assistant, no tools). Only the first is the "AI companion" the vision describes.

Parallel to this, a completely separate real system handles money (`WalletsService`, atomic `$transaction`-based send/deposit/hold), a completely separate real event-outbox helper exists (`EventBusService.write()`), and a completely separate real-but-unwired capability-grant/manifest scaffold exists (`CapabilityGrant` model, `CapabilityManifest` type — both explicitly commented "nothing consumes this yet").

---

## 2. Existing systems discovered

| System | Real? | Where |
|---|---|---|
| AI orchestration loop | ✅ working | `apps/api/src/ai-runtime/agent-runtime.service.ts` |
| Tool/capability registry | ✅ working, ~150 tools | `apps/api/src/tool-registry/*`, 38 `*-ai-tools.provider.ts` files |
| Specialist-agent handoff (proto-orchestrator) | ✅ working | `orchestrator-tools.provider.ts`, `specialist-agents.ts` |
| Widget contract (`renderAs`) | ✅ working, 10 tools tagged | `tool-registry.types.ts`, `AiWidgetRenderer.tsx` |
| Voice (hands-free) | ✅ working, siloed state | `HandsFreeOverlay.tsx`, `useVoiceCapture.ts` |
| Per-user AI identity | ✅ working | `AiAgent` model, `AiSetupScreen.tsx` |
| Conversation memory (raw log) | ✅ working, not distilled | `ConversationHistoryService`, `AiConversationMessage` |
| Session/context state | ✅ working | `ContextManagerService`, `AiSession` |
| Deferred single-shot reminders | ✅ working | `AiReminder` + cron scheduler |
| Structured long-term memory | ❌ missing | — |
| Event outbox | ✅ working (schema) | `Event` model, `schema.prisma:223-233` |
| Event bus (pub/sub) | ⚠️ misnamed — write-only helper | `event-bus.service.ts` |
| Event consumers | ⚠️ only 2, poll-based | Trust & Safety (cron), Intelligence (on-demand) |
| Wallet ledger (MSH) | ✅ working, atomic | `WalletsService` |
| Withdraw | ❌ missing | — |
| WalletHold (escrow) | ⚠️ built, zero call sites | `wallets.service.ts:164-170` |
| XRPL | ✅ real SDK+testnet, wrong rail | only backs Stokvels + signup address gen, not MSH spend |
| PayShap | ⚠️ manual admin-confirmed placeholder | `wallets.service.ts:225-256` |
| Cards/other PSP | ❌ missing, zero dependencies | — |
| Money-on-approval template | ✅ working, reusable | `ChallengeSponsorshipService.approve()`, `CampaignsService.approve()` |
| Mini-app registry (UI tiles) | ✅ working, no capability metadata | `modules.ts` |
| Mini-app owner-CRUD registry | ✅ working | `miniAppManage.ts` |
| Install/store gate | ⚠️ bookkeeping only, not enforced | `StoreContext` |
| `CapabilityGrant` | ⚠️ built, never imported into `app.module.ts` | `capabilities/` |
| `CapabilityManifest` type | ⚠️ built, zero consumers | `packages/types/src/index.ts:545-560` |
| Contextual capability injection | ✅ working precedent, ad hoc | `EventMiniCard`/`ProductMiniCard` (chat), `ContextualNewsOverlay` (route-aware) |
| Event Mini App (ticketing) | ✅ working, full-featured | `apps/api/src/entertainment/`, `apps/mobile/src/screens/events/` |
| Auth / JWT / role | ✅ working, solid | `JwtAuthGuard`, `AdminAccessGuard`, `AdminActionLog` |
| Location (live point) | ✅ working, minimal | `User.locationLat/Lng`, `syncLocation()` |
| Home/saved locations | ❌ missing | — |
| Location used by ride booking | ❌ missing (asks user every time) | `ride.service.ts` |

---

## 3. Existing functionality that can be reused as-is

- **`AgentRuntimeService.runLoop`** — becomes the Interaction Engine's core loop / the Orchestrator's execution arm. Don't replace it.
- **`ToolRegistryService`** (~150 tools) — becomes the Capability Registry's data source. A `CapabilityManifest` per mini-app can be *generated from* the existing tool definitions grouped by module, rather than hand-authored from scratch.
- **`orb.delegate` / `specialist.yield`** — this *is* the Orchestrator pattern the vision asks for, just scoped to 5 hardcoded specialists instead of a generic capability-driven router. Formalize, don't rebuild.
- **`renderAs` + `AiWidgetRenderer`** — this *is* the Widget Interaction Contract's identity/rendering half. Extend it with state/actions/voice-verbs (§10) rather than inventing a parallel widget system.
- **`ContextManagerService` / `AiSession`** — the "what is the user currently doing" state the Interaction Engine needs already exists and is already threaded into the system prompt.
- **`ConversationHistoryService`** — cross-session conversational continuity already works; it's the substrate memory extraction should read from, not replace.
- **`AiAgent` model** — per-user nameable AI identity (§2 of `18`) is *already solved*. No "Javas" hardcoding exists anywhere in source.
- **`AiReminder` + cron scheduler** — the deferred-follow-up primitive (§16 of `18`'s "task" example) already exists; extend for recurrence/routines rather than building a new scheduler.
- **`WalletsService` send/deposit/hold-primitives + atomic `$transaction` pattern** — the ledger core is solid.
- **`ChallengeSponsorshipService.approve()` / `CampaignsService.approve()`** — the exact "approve → atomic debit + Transaction row" shape the Financial Engine's payment-routing needs as a template.
- **`GiftsService.sendGift()`** — a second working example of "spend wallet balance for a catalog item," useful as a second reference implementation.
- **`Event` outbox model + `EventBusService.write()`** — sound schema and a correct transactional-write pattern; keep the write API, extend the consumption side.
- **`miniAppManage.ts` registry + `EventMiniCard`/`ProductMiniCard` + `ContextualNewsOverlay`** — real, working precedent for "capability appears in context" (§11 of `18`). Generalize the pattern, don't discard it.
- **Auth stack (`JwtAuthGuard`, `AdminAccessGuard`, `role` enum, `AdminActionLog`)** — production-grade per `ARCHITECTURE_RECOMMENDATIONS.md`; build permissions on top, don't touch the core.
- **`entertainment` module (Event Mini App)** — full-featured (create, discover, book, gift-ticket, poster generation, QR verification, team/scanner management). Per `18` §20, integrate as-is; do not rebuild.

## 4. Existing functionality that needs refactoring

- **Three parallel LLM entry points** (`/ai/chat`, `/assistant`, `CompanionChatService`) — should converge on one Orchestrator entry with different personas/scopes, not three independently-maintained prompt/loop implementations.
- **`AiWidgetRenderer`'s hardcoded switch** — works, but adding a widget type requires a mobile app release. If the Capability Engine (§8/§9) needs mini-apps to register new widget types without a client update, this needs a data-driven rendering layer (e.g. a small declarative widget-shape → component mapping resolved at runtime, or at minimum a versioned widget-type catalog fetched at boot).
- **Voice/text state silo** — `HandsFreeOverlay` keeps its own local conversation array, separate from `AiChatScreen`/`AiChatDropdown`'s. They share backend history but not live UI state, so "hold voice, say 'show me the second one', then switch to touch" (§8 of `18`) doesn't actually preserve widget selection state today — it would need the Interaction Engine's shared state layer built.
- **`EventBusService`** — sound as a transactional-write helper, misnamed as a "bus." No subscribe/dispatch API exists; Trust & Safety and Intelligence poll the table directly. Needs either (a) a real in-process dispatch step after the outbox write commits, or (b) an explicit poller/worker pattern formalized instead of two independent cron jobs doing it ad hoc.
- **`reaction.sent` event write** — not atomic with its triggering `$transaction` (a real bug, not just a gap) — fix before building more consumers on top of the event stream.
- **`StoreContext` install/uninstall** — currently UI bookkeeping only; if "installed" is meant to gate capability access (implied by the vision's registry language), it needs a real guard consuming `InstalledApp`, which doesn't exist today.
- **`personalActivitySummary`** (Intelligence Engine) — only counts `wallet.transfer.completed` because `aggregateId` isn't uniform across event types; needs a consistent aggregate-id convention across all emitters before it can generalize.
- **XRPL / SendScreen copy** — `SendScreen.tsx` shows "Tx Hash" / "XRPL transaction did not succeed" copy for a wallet send that never touches the chain. Either wire real XRPL settlement into `sendMasheleni`, or fix the misleading UI — do not ship both a fake blockchain UI and a real ledger side by side.
- **Location** — real but minimal (single overwritten point, no home/saved locations); ride booking doesn't read it at all. Needs the schema/UX work in §18 of `18` before "get me a ride home" is possible.

## 5. Missing components

- **Structured long-term memory** (memories/tasks/routines/goals/preferences/relationships, distinct types) — zero implementation. Only raw conversation replay + the narrow `AiReminder` fire-once primitive exist.
- **"What my AI knows" user-facing memory view** — doesn't exist (there'd be nothing to show yet regardless).
- **Home/saved locations** — no `Location`/`SavedLocation` model, no "home"/"work" concept.
- **Generic Capability Registry consumed by the AI** — `CapabilityGrant`/`CapabilityManifest` exist as inert scaffolding; nothing generates a manifest from a tool group, nothing checks a grant before a tool executes.
- **True Financial Engine abstraction** — no rail-agnostic interface; `WalletsService` *is* the MSH ledger directly, XRPL/PayShap/cards are three disconnected, differently-real stories (real-but-wrong-rail / manual-placeholder / absent) rather than pluggable rails behind one interface.
- **Withdraw** — no method exists at all.
- **Real PSP integration** (PayShap API client, card processor) — zero dependencies, zero code beyond an admin-manual-confirm placeholder.
- **Widget Interaction Contract's state/actions/voice-verb declaration** — `renderAs` only carries an identity tag today; there's no per-widget declared action list or voice-phrase mapping for the Interaction Engine to route "next"/"compare this" against.
- **External/web fallback with normalization into Guranda widgets** — no evidence found of any external-search-then-normalize-into-widget pipeline.
- **Device/physical-world integration layer** — nothing found (expected; §19 of `18` is explicitly long-term).
- **Formal event taxonomy** — only 4 narrow event types exist; none of `USER_SPOKE`, `WIDGET_ACTION_REQUESTED`, `TASK_CREATED`, `PAYMENT_COMPLETED`, etc.
- **Dead-letter/retry on the event outbox** — unprocessed events sit forever with no error tracking or alerting.

---

## 6. Proposed Interaction Engine architecture

Don't build a new engine — **formalize `AgentRuntimeService` + `ContextManagerService` + `ToolRegistryService` + `AiWidgetRenderer` as the Interaction Engine**, then close its three real gaps:

1. **One entry point, not three.** Collapse `/ai/chat`, `/assistant`, and `CompanionChatService` behind a single `InteractionEngine.handle(input, context)` that takes `{source: 'text'|'voice'|'touch', userId, sessionId, payload}`. Persona selection (personal AiAgent vs. Sipho vs. website bot) becomes a parameter, not three separate code paths.
2. **Shared interaction state, not per-surface state.** Introduce a single `InteractionSession` (mobile-side, backed by `AiSession` server-side) holding `{activeWidgetId, selectedItemId, screenContext}`. `AiChatScreen`, `AiChatDropdown`, and `HandsFreeOverlay` all read/write the same session instead of each keeping local arrays — this is what makes "hold voice → say 'second one' → switch to touch → tap compare" (§8 of `18`) actually work.
3. **Extend the widget contract** (see §10 below) so the Interaction Engine can resolve "next"/"previous"/"compare" against a widget's declared actions instead of the AI re-reasoning about UI capabilities every turn (directly serves §23 of `18`, token cost).
4. **Route resolution reuses `orb.delegate`.** Intent → capability lookup → specialist/tool selection is already the shape of `orb.delegate`; extend it to route against the Capability Registry (§8 below) instead of only the 5 hardcoded specialists.

## 7. Proposed Financial Engine architecture

Wrap, don't replace:

```
FinancialEngine
  .getBalance(userId)                    → WalletsService.getMyWallet (unchanged)
  .send(userId, to, amount, memo)         → WalletsService.sendMasheleni (unchanged)
  .requestPayment(userId, amount, from)   → new — payment-request primitive, doesn't exist today
  .hold(userId, amount, reason)           → WalletsService.holdFunds (already built, just needs a real caller)
  .capture(holdId) / .release(holdId)     → WalletsService.captureHold/releaseHold (same)
  .deposit(userId, amount, rail)          → WalletsService.requestDeposit, rail param routes to PayShap-manual today
  .withdraw(userId, amount, rail)         → NEW — doesn't exist, needs a real rail before it can be real
  .approve(entityType, entityId)          → generalizes ChallengeSponsorshipService/CampaignsService.approve() shape
```

Rail strategy (this needs a product decision, not just engineering — flagging per `17`'s convention): the vision says "the user thinks Rand, not XRP" (§5/§15 of `18`) — today MSH balances are **not** settled on XRPL at all (confirmed: `sendMasheleni` never touches the chain), so the "hide XRPL" requirement is already trivially satisfied for the primary ledger. The *actual* open question is whether XRPL should become the real settlement rail for MSH (a large change — real signing, real fees, real reconciliation) or whether it stays scoped to Stokvels only and MSH remains a pure internal ledger backed by manual PayShap deposits until a real PSP is integrated. Do not decide this unilaterally in code.

`WalletHold` is the natural mechanism for "AI wants to buy something, needs a confirmation step" (§40 of `16`: "For actions that require confirmation, obtain appropriate user confirmation") — wire an AI purchase-tool flow through `hold → user confirms → capture` instead of the current instant-debit-only pattern used by gifts/sponsorships. This is additive, not a rewrite of the existing instant-debit path (campaigns/gifts can keep using instant debit where no confirmation step is needed).

## 8. Proposed Capability Engine architecture

The registry-of-registries already half-exists in three disconnected pieces: `ToolRegistryService` (150 real tools, runtime-enforced), `CapabilityManifest` type (right shape, zero consumers), `CapabilityGrant` model (right shape, zero consumers). The design is to **connect these three, not add a fourth**:

1. **Generate `CapabilityManifest` entries from `ToolRegistryService` at boot**, grouped by module namespace (e.g. all `ride.*` tools → one `ride` capability manifest with `actions` = tool names, `inputSchema` = each tool's existing input schema). This is mechanical, not a rewrite — the data already exists on `ToolDefinition`.
2. **Wire `CapabilityGrant` into `ToolRegistryService.resolve()`** — before a tool executes, check `CapabilityGrantService.assertGranted(userId, capabilityKey)` for capabilities that aren't universally available (most are; grants matter for future third-party/paid capabilities, per the model's own doc comment). Low-risk since the service already has the exact methods needed (`check`, `assertGranted`).
3. **Import `CapabilitiesModule` into `app.module.ts`** — it currently isn't even reachable at runtime. Trivial fix, currently blocking everything downstream of it.
4. **Extend the manifest with `widgets`/`voiceInteractions`** fields (already declared in the type, just unpopulated) sourced from each tool's `renderAs` + a new declared voice-verb list (see §10).

## 9. Orchestrator design

`orb.delegate` / `specialist.yield` is the existing implementation of this exact concept — formalize rather than duplicate:

```
Orchestrator.route(intent, context):
  1. resolve current InteractionSession (active widget, screen, selection)
  2. query Capability Registry for capabilities matching intent
     (today: hardcoded to 5 specialists; target: driven by the generated manifests from §8)
  3. if a widget is active and intent maps to one of its declared actions → dispatch directly to the widget
     (no LLM/tool round-trip needed — this is the §23 cost-reduction path)
  4. else → ToolRegistryService.resolve() → ActionExecutorService.execute()
  5. write result + emit event (§11) → return to Interaction Engine for rendering/speech
```

Step 3 is new — today every turn round-trips through the LLM even for a pure UI action like "next image," which both `18` §7-9 and §23 argue against. This is the concrete mechanism that makes "TALK LESS. DO MORE." real rather than aspirational.

## 10. Widget Interaction Contract

Extend the existing `ToolDefinition.renderAs` + `ToolWidget` shape (don't invent a parallel one):

```ts
interface WidgetContract {
  type: string;              // = today's renderAs value, e.g. "product-list"
  version: number;           // NEW
  state: {
    items: unknown[];
    selectedIndex?: number;  // NEW — the "second one" resolves against this
    mode?: string;
    loading?: boolean;
    error?: string | null;
  };
  actions: string[];         // NEW — e.g. ["next","previous","select","compare","buy"]
  voicePhrases: Record<string, string[]>;  // NEW — action -> natural-language triggers
}
```

`AiWidgetRenderer`'s existing switch already maps `renderAs` → component; each widget component gains a small `actions`/`voicePhrases` declaration (a handful of lines per existing widget, not a rewrite) so the Orchestrator's step 3 above can resolve intent → action without an LLM call.

## 11. Event architecture

Keep the outbox schema and the transactional-write discipline; add the pieces that don't exist:

1. **Fix `reaction.sent`** to write inside the same `$transaction` as the gift/wallet write (real bug, cheap fix).
2. **Add a dispatch step.** After `EventBusService.write()`'s row commits, invoke any in-process listeners registered for that `type` (simple synchronous map, not a new message broker) — this turns the "outbox + two independent cron pollers" pattern into a real bus without adding infrastructure.
3. **Expand the taxonomy incrementally**, driven by real consumers, not speculatively — start with `WIDGET_ACTION_REQUESTED`, `CAPABILITY_REQUESTED`, `PAYMENT_REQUESTED`/`PAYMENT_COMPLETED` (needed by §7-9 above), rather than pre-declaring all of `18` §22's list before anything consumes them.
4. **Normalize `aggregateId`** across all emitters (currently inconsistent, which is why `personalActivitySummary` can't generalize) — pick one convention (e.g. always `userId` for user-scoped events) before adding more emitters.
5. **Add a dead-letter marker** — an `attempts`/`lastError` pair on `Event`, and a cron that flags rows stuck unprocessed past a threshold, rather than the current silent-forever failure mode.

## 12. Data/state relationships

```
User ──1:1── Wallet ──1:N── Transaction
  │                    └1:N── WalletHold  (built, unused)
  ├─1:1── AiAgent (name/personality — THE AI identity)
  ├─1:1── Companion (reputation-tied pet — UNRELATED to AiAgent, naming collision only)
  ├─1:1── AiSession (activeModule/taskSummary/activeAgentId — interaction state)
  ├─1:N── AiConversationMessage (per companionId — history)
  ├─1:N── AiReminder (fire-once deferred tasks)
  ├─1:N── CapabilityGrant (unwired)
  ├─locationLat/Lng (single point, no relation — no SavedLocation model exists)
  └─role (MEMBER|ADMIN)

Event (outbox) ──type,aggregateId,payload,processedAt──  polled by:
  ├── TrustSafetyService (cron, wallet.transfer.completed only)
  └── IntelligenceService (on-demand, groupBy all types)

ToolDefinition (in-memory registry) ──renderAs──> ToolWidget (per-response)
  └── consumed by AiWidgetRenderer (client-side switch)

CapabilityManifest (packages/types) ──unconsumed──  (target: generated FROM ToolDefinition, §8)
```

The two collision risks worth flagging explicitly: (a) **`Companion` vs `AiAgent`** — same word, unrelated entities (reputation mascot vs. chat identity) — a product-naming decision is needed before user-facing copy uses "Companion" for either, to avoid confusing the two; (b) **`miniAppManage.ts`'s `crudCapability` field vs. `CapabilityGrant`/`CapabilityManifest`** — same word "capability," unrelated concepts (owner CRUD-permission enum vs. the AI capability system) — rename one of them before both are in active use, or a future engineer will conflate them.

## 13. Interfaces between engines

- **Interaction Engine → Capability Engine**: `resolve(intent, grantedCapabilities) → ToolDefinition | WidgetAction`. Read-only from the Interaction Engine's side — it never contains capability business logic itself (per `18` §6/§24).
- **Interaction Engine → Financial Engine**: only through capability calls (e.g. the `wallet.*` tools already registered in `ToolRegistryService`) — never a direct import of `WalletsService` from AI-runtime code (this boundary already holds today, worth preserving explicitly).
- **Capability Engine → Financial Engine**: a capability's manifest may declare `requiresPayment: true` (new field) — the Orchestrator checks this before dispatch and triggers `FinancialEngine.hold()` for confirmation, rather than the tool itself calling wallet code directly (today's `ChallengeSponsorshipService`/`CampaignsService` call `PrismaService`+wallet logic directly, which is fine for those two internal flows but shouldn't become the pattern every future paid capability copies).
- **All engines → Event System**: fire-and-forget writes via `EventBusService.write()`, always inside the triggering `$transaction` (the one existing discipline worth enforcing everywhere, given the `reaction.sent` counterexample).
- **Any engine → Memory System** (once built): read-only query interface (`getRelevantMemories(userId, context)`) feeding into `buildSystemPrompt`; writes happen through an explicit extraction step, not ad hoc from arbitrary engines.

## 14. Security and permissions considerations

Building on real, already-audited infrastructure (`ARCHITECTURE_RECOMMENDATIONS.md` confirms `JwtAuthGuard`, `AdminAccessGuard`, `role` enum, `AdminActionLog`, `StripSensitiveInterceptor`, `class-validator` DTOs on money/account surfaces, and `@nestjs/throttler` are all real and working):

- **`CapabilityGrant.assertGranted` becomes the natural authorization point** for any future third-party or paid capability — wire it into `ToolRegistryService.resolve()` (§8.2) rather than adding a parallel permission check.
- **Every AI tool that moves money must go through `WalletHold`'s confirm step**, not instant debit — this is a policy to enforce as new AI-purchase tools are added, not a retrofit of existing instant-debit flows (gifts/sponsorships/campaigns) that already have their own explicit user-initiated approval step (a human clicking "approve" in an admin/owner flow, not an AI acting autonomously).
- **`ToolExecutionLog`** already gives an audit trail for every AI tool call — extend it to also log Orchestrator routing decisions (which capability was selected and why) once the Orchestrator formalizes, for the same auditability reason `AdminActionLog` exists.
- **Voice input needs the same input-validation discipline** `ARCHITECTURE_RECOMMENDATIONS.md` §4 calls for on REST DTOs — transcribed voice text hitting `/ai/chat` is still untrusted user input.
- **Location data is sensitive** — `18` §18 explicitly requires view/edit/disable/delete/override; today `updateLocation`/`getLocation` exist but no mobile UI was found for a user to review or clear stored location history (there is none to review yet, since it's a single overwritten point — but the *deletion* affordance should exist before any "home location" feature adds persistent saved places).

## 15. Migration plan

Sequenced to avoid the "Interaction Engine finished → Financial Engine bolt-on → Capability Engine bolt-on" anti-pattern `18` §26 explicitly warns against — each step below touches all three because they're already entangled in the real code:

1. **Wire the dead scaffolding first** (cheapest, unblocks everything): import `CapabilitiesModule` into `app.module.ts`; generate `CapabilityManifest` entries from `ToolRegistryService` at boot; fix `reaction.sent` atomicity.
2. **Formalize the Orchestrator** on top of `orb.delegate`: add the manifest-driven routing (§9 step 2/3) alongside the existing 5 hardcoded specialists (don't remove them — they become capability entries too).
3. **Extend the Widget Contract** (§10) on the 10 already-`renderAs`-tagged tools first (smallest surface, proves the pattern) before requiring it of all future tools.
4. **Build the Interaction Session** (shared state across `AiChatScreen`/`AiChatDropdown`/`HandsFreeOverlay`) — this is what makes voice↔touch continuity real; do this before investing further in voice features, since it's the actual blocker for `18` §8's example flow.
5. **Wire `WalletHold`** into one real AI-purchase-confirmation flow end-to-end (proves the Financial Engine's confirmation pattern) before generalizing.
6. **Only then** start on structured memory, home/saved locations, and external-web fallback — these are net-new builds with no existing scaffolding to connect to, so they're correctly last, not because they're unimportant but because everything above them changes the shape they should take.

## 16. Phase 1 implementation plan (Interaction Engine, per `18`'s own phasing)

Scoped to what's genuinely Phase 1 (Interaction Engine) per `18` §25, deferring Financial/Capability deep work to their own phases even though the migration plan above touches all three lightly to unblock things:

1. Import `CapabilitiesModule`; generate manifests from `ToolRegistryService` (mechanical, ~1-2 days).
2. Add `actions`/`voicePhrases` to the 10 existing `renderAs`-tagged widget components + the shared `ToolWidget` type in `packages/types`.
3. Build `InteractionSession` (server: extend `AiSession`; client: a shared context replacing the three siloed conversation arrays).
4. Add Orchestrator step 3 (direct widget-action dispatch bypassing the LLM for declared actions) — the concrete "TALK LESS. DO MORE." + token-cost deliverable.
5. Collapse the three LLM entry points behind one `InteractionEngine.handle()` — riskiest single item, do it after 1-4 land and are stable, with the website `/assistant` path migrated last (lowest stakes, easiest to regression-test).
6. Verification: typecheck both apps, curl the consolidated endpoint against all three former personas, live-test the voice→touch handoff (hold, say "second one," release, tap something on that widget) as the concrete acceptance test for the whole phase.

## 17. Risks and architectural tradeoffs

- **Collapsing three LLM entry points risks regressing the website's public `/assistant` bot** (no auth, different trust boundary) — needs its own scoped persona/permission set in the unified engine, not just a config flag, or it could accidentally gain access to authenticated user tools.
- **Wiring `CapabilityGrant` into every tool call adds a DB round-trip per tool execution** — fine for the current ~150 tools at current scale, but worth a cache/in-memory grant snapshot per session rather than a fresh query per call if the Capability Engine's usage grows.
- **The XRPL rail decision is genuinely unresolved and expensive to get wrong** — building the Financial Engine's `withdraw()`/real-settlement path before the product owner decides "XRPL settles MSH for real" vs. "XRPL stays Stokvel-only" risks building the wrong rail integration entirely. Flagged in §7 — do not default to one silently.
- **`WalletHold` confirmation flow changes the AI purchase UX** from instant to two-step — this is a deliberate, vision-aligned trade (§40 of `18`: "For actions that require confirmation, obtain appropriate user confirmation") but will feel slower than the current instant-debit campaigns/gifts pattern; worth user-testing the added friction rather than assuming it's correct by default.
- **Generalizing the event bus to real pub/sub (in-process dispatch) is a correctness risk if any future listener is slow/blocking** inside the same request that wrote the event — needs an explicit async-dispatch (e.g. `setImmediate`/queue-microtask) boundary, not a synchronous call chain, or a slow Trust & Safety check could add latency to, say, a wallet transfer response.
- **Structured memory is the largest genuinely-new build with no existing pattern to extend** (unlike everything else in this doc) — highest design risk, most likely to need its own dedicated design pass before implementation rather than being scoped inline here.
- **Naming collisions (`Companion`/`AiAgent`, `crudCapability`/`CapabilityGrant`)** aren't bugs today but are real landmines for whoever picks this up next without having read this document — worth a deliberate rename pass even though it's the lowest-engineering-value item on this list.
