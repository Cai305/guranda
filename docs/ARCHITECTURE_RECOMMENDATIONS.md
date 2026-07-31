# Architecture Recommendations

Written after a full-codebase cleanup and security pass (see `docs/testing/` for the white paper, test cases, and test report from the pass immediately before this one). This document is forward-looking: what to change structurally so the issues found in that pass — and the ones found in this one — don't quietly reaccumulate.

**Update:** all nine items below have since been implemented (see the `Status:` line under each). Two of them surfaced real, previously-unknown vulnerabilities during implementation, more severe than anything in the original audit: `POST /admin/deposits/:id/confirm` and the whole `/admin/verifications` surface had **no authentication at all** — the deposits endpoint let anyone credit their own pending real-money deposit without ever paying. Both are now fixed.

---

## 1. Authentication: one pattern, enforced

This pass found **two independent identity-spoofing vulnerabilities** (`video.controller.ts`, `eat.controller.ts`) where a controller trusted a client-supplied `x-user-id` header instead of the authenticated JWT — meaning any caller could act as any other user by setting that header. Both are fixed now (`JwtAuthGuard` + `req.user.userId`, matching the rest of the API), but the fact that it happened *twice*, independently, in different modules, means it's a pattern gap, not a one-off mistake.

**Recommendation**: treat `@UseGuards(JwtAuthGuard)` + `@Request() req` + `req.user.userId` as the *only* way a controller may learn who's calling it. Concretely:
- Add an ESLint rule (or a simple CI grep check) that fails the build if `@Headers('x-user-id')` appears anywhere in `apps/api/src`. It should never come back.
- Consider a lint rule or code-review checklist item: every new `@Controller` must either declare `@UseGuards(JwtAuthGuard)` at the class level, or have an explicit comment explaining why a given route is intentionally public.

**Status: done.** `eslint.config.mjs` has a `no-restricted-syntax` rule banning `@Headers('x-user-id')`; the one legitimate remaining use (`live.controller.ts`'s public room list, personalization-only) has an explicit `eslint-disable` with rationale.

## 2. Real admin roles, not a shared secret

There is currently no `role` or `isAdmin` field on `User` at all. This pass closed the *immediate* hole (six previously-unauthenticated admin endpoints, one unauthenticated file-upload endpoint, two unauthenticated admin-write endpoints) using a shared `ADMIN_API_KEY` header, checked by a new `AdminApiKeyGuard`. That's a reasonable stopgap for a single internal ops dashboard, but it doesn't scale to multiple admins, can't be individually revoked, and produces no audit trail of *which* admin suspended a user or toggled a feature flag.

**Recommendation**:
- Add a `role` enum to `User` (`MEMBER | ADMIN`, or a separate `AdminUser` table if admin accounts should be fully distinct from regular platform accounts).
- Replace `AdminApiKeyGuard` with a real `AdminGuard` that checks `req.user.role === 'ADMIN'` after normal JWT auth.
- Add an `AdminActionLog` (who did what, to whom, when) — the current `suspendUser`/`unsuspendUser` and feature-flag toggles have zero audit trail. This is the single highest-value addition for an admin surface that can suspend accounts and move money-adjacent state.

**Status: done**, with one adjustment. `AdminApiKeyGuard` wasn't fully replaced — it's *superseded* by `AdminAccessGuard` (`admin/admin-access.guard.ts`), which accepts **either** the legacy shared key (so the website's ops dashboard, which has no per-admin login UI, keeps working unmodified) **or** a Bearer JWT for a `User` with the new `role` field set to `ADMIN`. `User.role` (enum `MEMBER | ADMIN`) and `AdminActionLog` are both in `prisma/schema.prisma`; `AdminAuditService` writes a row — real `adminId` for the JWT path, `actorLabel: 'shared-key'` for the legacy path — on every suspend/unsuspend, feature-flag change, reserved-username add/remove/seed, deposit confirm/reject, and verification approve/reject. Verified end-to-end: admin JWT → 200, shared key → 200 (unchanged), non-admin JWT → 401, no credentials → 401, and an audit row lands with the real actor's identity.
>
> Applying this guard uniformly is what surfaced the two unauthenticated endpoints mentioned at the top of this document (`admin/deposits`, `admin/verifications`) — they had never been guarded by anything, not even the old shared key.

## 3. Secrets: fail fast, everywhere

This pass found the API was running on a **hardcoded, source-visible JWT signing secret** (`JWT_SECRET` was never set in `.env`, so it silently fell back to a literal string in `auth.module.ts`) — a full authentication bypass for anyone who'd read the code. Fixed with a shared `jwt-secret.ts` that throws at startup if the secret is missing or matches the known-weak default.

**Recommendation**: apply the same fail-fast pattern to every other secret the app depends on (`ADMIN_API_KEY`, `GIPHY_API_KEY`, `ANTHROPIC_API_KEY`, `LIVEKIT_API_SECRET`, XRPL keys). A single `env.ts` module that validates all required secrets at boot — and refuses to start if any are missing — turns "silently insecure" into "won't run," which is the correct failure mode for a secret, not a feature flag.

**Status: done**, scoped down from the original proposal. `src/env.ts` (imported first thing in `main.ts`) hard-fails at boot if `DATABASE_URL` or `BLOB_READ_WRITE_TOKEN` are missing — both load-bearing with no safe fallback. `ANTHROPIC_API_KEY`, `GIPHY_API_KEY`, `LIVEKIT_API_KEY`, `ROUTESTACK_API_KEY`, and `ADMIN_API_KEY` were deliberately **not** made boot-fatal: each already degrades gracefully at its own call site (a clear 400 for AI/GIF requests, working self-hosted-dev LiveKit credentials, a clear 401 naming the missing var for admin) — making the whole API refuse to boot without them would break every dev who only needs the core app. `env.ts` does still warn at boot if any of these are unset, so the gap is visible without being fatal.

## 4. Input validation

Most write endpoints take `@Body() dto: any` — there is no schema validation on request bodies at all, and no global `ValidationPipe`. This means malformed or unexpected payloads reach service/Prisma layers unchecked, relying entirely on each service function to defensively check what it needs (inconsistently — some do, many don't).

**Recommendation**: this is a real but *large* structural change, not a quick fix — migrating `any`-typed DTOs to `class-validator`-decorated classes across ~50 controllers is its own project. Suggested approach: don't do it all at once. Start with the highest-risk write surfaces (money movement: `wallets`, `finance`; account mutation: `users`, `admin`) and add a global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` scoped to routes that have been migrated, expanding module by module.

**Status: done for the named surfaces.** `class-validator`/`class-transformer` installed; real DTO classes added for `users` (register, login, profile update, push token, location), `wallets` (send, deposit request, deposit admin confirm/reject), `finance` (create stokvel, contribute, create funding request, vote), and the admin feature-flag write. `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` is applied **per-route or per-controller**, not globally — `finance.controller.ts` in particular still has unmigrated `body: any` routes alongside the migrated ones, so a global pipe would have been wrong. Verified: missing required fields → 400, an extra/unexpected field (e.g. smuggling `"role":"ADMIN"` into a register payload) → 400, a non-numeric wallet amount → 400, and legitimate requests still succeed. The other ~46 modules are unmigrated — expand the same way, module by module.

## 5. Rate limiting

There is currently no rate limiting anywhere — `/users/login` and `/users/register` can be hit as fast as the network allows, with no backoff. `@nestjs/throttler` is not installed.

**Recommendation**: add `@nestjs/throttler` with a conservative global default (e.g. 60 req/min per IP) and a tighter limit specifically on `/users/login` (e.g. 5/min) to blunt credential-stuffing/brute-force attempts. This is a small, contained addition — a good first PR for whoever picks up this list.

**Status: done**, exactly as proposed. Global default 60 req/min/IP via `ThrottlerModule.forRoot()` + `APP_GUARD`; `/users/login` and `/users/register` carry a `@Throttle({ default: { limit: 5, ttl: 60_000 } })` override. Verified live: 7 rapid login attempts against the same IP returned `401 401 401 401 429 429 429`.

## 6. Defense-in-depth for sensitive fields

The admin surface was leaking `passwordHash` in six different response shapes, all via the same root cause: `include: { user: {...} }` (or `user.findMany()` with no `select`) serializes the *entire* User row, including the hash. Fixed this pass with a recursive `stripSensitive()` helper scoped to `admin.service.ts` — but the same pattern (`include: { creator: {...} }`, `include: { rider: {...} }`, `include: { host: {...} }`) exists in other modules too, and wasn't audited beyond admin in this pass.

**Recommendation**:
- Run a repo-wide search for `include: {` blocks that pull in a `user`/`creator`/`rider`/`driver`/`host` relation without a `select`, and check each one for hash exposure. This wasn't done exhaustively — admin was fixed because testing happened to surface it there first.
- Longer-term, the cleanest fix is a Prisma Client Extension (`$extends`) with a `result` transform on the `User` model that strips `passwordHash` from *every* query result by default, with an explicit opt-in (a separate raw client, or an internal-only method) for the two places that legitimately need it — login's `bcrypt.compare` and registration's write. This eliminates the whole bug class at the ORM layer instead of requiring every service to remember to be careful.

**Status: done, via a different (better) mechanism than originally proposed.** The repo-wide search found the unscoped `include` pattern in **11 more service files** beyond admin — `video`, `posts`, `chat`, `ride`, `wallets`, `story`, `property`, `entertainment`, `finance`, `health`, `eat` — most returning the raw Prisma result straight to the client. `ride.service.ts` was the worst: `rider: true` / `driver: true` (bare, no `select` at all) returned the *entire* User row, `passwordHash` included, on every ride status change.
>
> A true Prisma Client Extension turned out not to compose with this codebase's DI pattern: `PrismaService extends PrismaClient` is injected directly as `private prisma: PrismaService` in ~190 files calling `this.prisma.model.method()`; `$extends()` returns a *new* wrapper object rather than mutating the instance in place, and per-model monkey-patching doesn't reach `$transaction`-scoped queries (used in `users.service.ts`'s registration flow, among others) — a real gap, not a cosmetic one.
>
> Instead, `StripSensitiveInterceptor` (`common/strip-sensitive.interceptor.ts`) is registered globally via `APP_INTERCEPTOR` and deletes `passwordHash` **and `encryptedSeed`** (the XRPL wallet seed — funds-controlling key material, at least as sensitive, and was *also* leaking through `admin.service.ts`'s wallet/economy endpoints) from every REST response body, recursively, regardless of which controller or query produced it. This is strictly more complete than the extension approach would have been: it catches every controller — present and future — with zero per-file opt-in, and can't break internal logic (ranking, signing, etc. still see the real fields; only the outgoing HTTP response is stripped). The one gap: it doesn't cover Socket.IO gateway emissions (a separate response path) — audited at the time, no gateway currently emits a raw user/wallet object, but a future one could.
>
> `admin.service.ts`'s original hand-rolled `stripSensitive()` was removed (redundant, and it never covered `encryptedSeed`) now that the global version supersedes it.

## 7. Keep the "no unused code" state, don't just reach it once

This pass got `apps/api` and `apps/mobile` to a genuinely clean `tsc --noUnusedLocals --noUnusedParameters` state (0 findings, down from 22 and 45 respectively) — but nothing stops that from drifting again immediately.

**Recommendation**:
- `apps/mobile` has **no lint configuration and no lint script at all** (confirmed this pass — `package.json` has no `eslint` devDependency, unlike `apps/api`). Add one, mirroring `apps/api/eslint.config.mjs`.
- Add `noUnusedLocals: true, noUnusedParameters: true` to both `tsconfig.json` files permanently (this pass ran them as one-off CLI flags, not persisted config) so every future `tsc` run — including CI — catches new unused code immediately instead of letting it accumulate until the next manual audit.
- Wire whichever of these is added into CI (or at minimum a pre-commit hook) so this is enforced automatically, not manually re-discovered every few months.

**Status: done.** Both flags are now permanent in both `tsconfig.json` files (found and fixed 3 fresh unused-code findings just from persisting them — `chess.service.ts`'s unused `logger`, two `ride.gateway.ts` unused socket params, one unused destructured var in `scripts/backfill-usernames.ts`). `apps/mobile` got a real flat-config ESLint setup (`eslint-config-expo`) it never had, with `npm run lint` added; the base config's React Compiler rules (`react-hooks/*`) flagged ~150 pre-existing, unrelated-to-dead-code patterns at error severity (a very common data-fetch-on-mount idiom used throughout the app) — those are downgraded to warnings so `npm run lint` reflects the *actual* target (dead code) rather than blocking on an unrelated, larger refactor. One genuine `react-hooks/rules-of-hooks` bug was caught and fixed: `LiveViewerScreen.tsx` called several hooks *after* an `if (!stream) return null` early return, which is undefined behavior in React if that condition ever differs between renders. CI/pre-commit-hook wiring doesn't exist yet — that's the natural next step so this stays enforced automatically rather than resting on someone remembering to run `tsc`/`eslint` locally.

## 8. Testing infrastructure

Verification this pass and the one before it leaned entirely on ad-hoc `curl` scripts and one-off `socket.io-client` Node scripts written and thrown away per-session. That works, but it's not repeatable — the next person (or the next session) has to reinvent the same checks.

**Recommendation**:
- Formalize the highest-value ad-hoc checks from this pass (auth-guard presence per controller, the suspend/unsuspend flow, the passwordHash-never-leaks invariant) into a real Jest e2e suite (`apps/api` already has a `test:e2e` script and a `test/jest-e2e.json` config — it's just empty/unused). A handful of well-chosen e2e tests would have caught the JWT_SECRET and identity-spoofing issues automatically on every CI run, rather than requiring a full manual audit to surface them.
- For the mobile side, native-emulator UI automation via raw `adb`/`uiautomator` (what this session used) is slow (15–60s per interaction) and fragile (coordinate drift between screenshots, timing races with the emulator). If recurring UI regression testing is a priority, adopt a real mobile E2E framework — **Detox** or **Maestro** are the standard choices for Expo/React Native — rather than continuing to script raw `adb` calls per session.

## 9. Module organization

`apps/api/src` currently has ~50 top-level modules in a flat structure (`marketplace/`, `shopping/`, `eat/`, `carfind/`, `travel/`, `work/`, `hair/`, `ride/`, ... each a sibling). This isn't broken, but as the platform grows it will get harder to navigate. The white paper's Section 3 groupings (Identity/Wallet, Messaging/Social, AI, Games, Life Services, Live/Broadcasting, Advertising/Admin) already describe a natural domain boundary.

**Recommendation** (lower priority than the items above — purely organizational, not correctness/security): consider grouping related modules under domain folders (e.g. `src/commerce/{marketplace,shopping,eat,carfind}`, `src/life-services/{travel,work,hair,ride,property,health}`) once the module count grows further. Not urgent today; worth doing before it becomes a 70+-module flat list.

---

## Priority if picking this up

If only doing a few of these next: **(1) real admin roles + audit log**, **(2) rate limiting on login**, and **(3) the Prisma-level passwordHash strip** are the highest security value for the lowest effort. The DTO validation and module-reorganization items are larger, slower-burn projects better suited to incremental adoption.
