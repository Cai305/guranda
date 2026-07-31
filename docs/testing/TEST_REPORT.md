# Guranda / LifeOS — Test Report

Companion to `WHITE_PAPER.md` and `TEST_CASES.md`. Generated from a live testing session against the running `apps/api` server (localhost:3000) and the `apps/mobile` app installed natively on a Pixel_9 Android emulator (AVD), plus a full backend smoke sweep of ~107 endpoints.

**Environment**: Windows host, ~2.3–4GB free RAM during testing (below the recommended threshold — see Environment Notes), PostgreSQL + LiveKit via `docker-compose`, API run from source (`nest build` + `node dist`), mobile app built via `expo run:android` (native debug APK, not Expo Go).

---

## 1. Summary

| Category | Result |
|---|---|
| Backend endpoints smoke-tested | **107 routes**, 105 pass (200/expected), 2 failures found — **both fixed this session** |
| Critical security issues found | **2** — both fixed this session (see §3) |
| UI flows verified live on-device | Registration, login, session-expiry handling, AI companion setup/chat/persona-switching, chat (text/emoji/attach/contact-add/group-FAB), call/video icon regression, camera capture (bug reproduced + partially fixed) |
| UI flows not completed live | Voice message recording/playback, full 1:1 call media path, live-stream "Go Live" submission, and all 20+ mini-games — see §6 for why and what's recommended instead |
| Outstanding known bug | Camera capture in chat still does not reliably open the device camera (see §5) |

## 2. Backend Smoke Test Results

Executed via `curl` against every parameterless `GET` route across all ~50 API modules (auth token for a real registered test user). Full endpoint list and raw results are reproducible from `docs/testing/TEST_CASES.md` §1–10.

- **105 / 107 returned the expected status.** The two 404s (`/health/pharmacies/mine/orders`, `/shopping/my-store/orders`) are *correct* behavior for a user with no pharmacy/store — not bugs.
- **2 real failures found, both fixed and re-verified in this session:**
  1. `GET /videos/feed` → 500 (see §4).
  2. `GET /admin/users` (and five sibling admin endpoints) → leaked bcrypt password hashes to **any unauthenticated caller** (see §3 — this is the headline finding of this test pass).

This sweep intentionally did not exercise POST/write endpoints broadly (to avoid mutating shared test data without a cleanup pass); the write paths already covered in this session (registration, login, chat/contact creation, AI companion setup/chat) all passed live.

## 3. Critical Security Finding — Fixed

**`AdminController` had no authentication guard at all.** Every route under `/admin/*` (`users`, `users/:id`, `stats`, `gaming`, `rides`, `live`, `stories`, `economy`, `ai-usage`) was reachable by anyone, with no token, no login, nothing:

```
curl http://localhost:3000/admin/users
# 200 OK — full user list including bcrypt passwordHash, wallet balances, XRPL addresses, phone numbers
```

This connects directly to the passwordHash-hygiene concern raised earlier in this project's history — the leak wasn't in registration/login (those are fine — bcrypt is used correctly there), it was in **read paths that serialize the whole `User` row** via `include: { user: {...} }` without ever excluding `passwordHash`. Six methods in `admin.service.ts` had this pattern (`getStats`'s `recentUsers`, `getUsers`, `getUserDetail`, `getActiveGames`, `getRides`, `getLiveRooms`, `getEconomy`).

**Fix applied this session** (`apps/api/src/admin/admin.controller.ts`, `apps/api/src/admin/admin.service.ts`):
1. Added `@UseGuards(JwtAuthGuard)` to `AdminController` — closes the fully-unauthenticated hole immediately.
2. Added a deep `stripSensitive()` helper that recursively removes `passwordHash` from every admin response (handles arbitrarily nested `include`s without needing to hand-audit every query), applied to all six affected methods.
3. Verified: unauthenticated request now returns `401`; authenticated request returns `200` with **no `passwordHash` anywhere in the response**; `Date`/`Decimal` fields (createdAt, balanceMasheleni, transaction amounts) confirmed still serialize correctly post-fix (the stripping helper explicitly special-cases those types to avoid corrupting them).

**Follow-up recommended, not done this session**: there is currently no `role`/`isAdmin` field on `User` at all, so the guard only proves *someone is logged in*, not that they're actually an admin. A real authorization check needs a schema migration (add a role field) — flagged here rather than attempted blind, since it touches the User table and login/registration flow and deserves its own testing pass.

**Also recommended**: audit other modules for the same `include: { user: {...} }` pattern outside of `admin` — this session only fixed the admin surface because that's what testing surfaced; the same class of bug could exist elsewhere (e.g. any endpoint that includes a `creator`/`rider`/`driver`/`host` relation without a `select`).

## 4. Bug Fixed — `GET /videos/feed` 500 error

**Root cause**: `VideoController` doesn't use the app's normal JWT-authenticated-user pattern. It reads user identity from a client-supplied `x-user-id` **header** instead (`@Headers('x-user-id') userId: string`), and `VideoService.getFeed()` passed that straight into `prisma.user.findUnique({ where: { id: userId } })`. Prisma's `findUnique` requires at least one unique field to be defined — when the header isn't sent (which is legitimate: our smoke test only sent the standard `Authorization: Bearer` header, since every other module in the API expects that), `userId` is `undefined` and Prisma throws a `PrismaClientValidationError`, which the framework surfaces as a bare 500.

**Fix applied**: `apps/api/src/video/video.service.ts` — the `user.findUnique` call is now skipped entirely (falls back to `null`, already handled by existing optional-chaining) when `userId` is falsy. Verified: `GET /videos/feed` now returns `200 []` instead of `500`.

**Separate, larger finding not fixed this session**: the entire Video module (`upload`, `feed`, `trending`, `search`, `watch-later`, `like`, `comments`, playlists — every route) trusts this same client-supplied `x-user-id` header instead of verifying a JWT. That means **any caller can act as any other user** in this module (upload a video as them, like/comment as them, pollute their watch history/interests) simply by setting that header to someone else's user id — no password or token required. This is architecturally inconsistent with the rest of the API (which correctly uses `JwtAuthGuard` + `@Request() req.user`) and should be redesigned the same way. Not fixed in this pass because it touches every route in the controller and the mobile client's calling convention for this module specifically — recommend a dedicated session to migrate it and verify the mobile Discover/video-upload screens still work end-to-end afterward.

## 5. Known Open Bug — Camera capture in chat

**Symptom**: tapping the camera icon in `ChatScreen` does nothing observable — no permission dialog, no camera app, no error toast.

**Diagnosis performed this session**:
- Isolated to the camera-specific code path — the emoji button and the attach/gallery button (`pickAndSendMedia`, which shares the exact same `!socket || !user?.userId || uploadingMedia` guard) both work correctly on the same native build, ruling out the guard clause, auth state, and socket connection as causes.
- The original `captureAndSendMedia` had **zero error handling** around `ImagePicker.requestCameraPermissionsAsync()` / `launchCameraAsync()` — any failure there was silently swallowed as an unhandled promise rejection. **Fixed**: wrapped in try/catch with a visible `Alert` on failure (`apps/mobile/src/screens/ChatScreen.tsx`).
- One live reproduction showed Android's `GrantPermissionsActivity` briefly become the focused window immediately after the tap, before the whole app task was pushed to the home launcher (app process itself stayed alive, confirmed via `ps`) — camera permission remained ungranted afterward. This is consistent with the combined `mediaTypes: ['images','videos']` camera-capture intent not resolving cleanly against this AVD's camera app, though sustained low host memory during this session (as low as ~2.3GB free) is a confounding factor and can't be fully ruled out.
- `app.json`'s `expo-image-picker`/`expo-camera` permission-string plugins (added earlier this session) are confirmed present in the built APK's manifest permissions (`CAMERA`, `RECORD_AUDIO` both declared) — this was **not** the cause.

**Status**: still open. **Recommended next step**: re-test with the new error-surfacing Alert in place under normal host memory conditions (or on a physical device) to capture the actual exception text, which will make the remaining root cause immediately obvious. If it turns out to be the combined images+videos capture mode, splitting into two explicit buttons (or a mode picker before invoking the camera) is the likely fix.

## 6. UI Flows Verified Live (this session + carried from immediately prior session)

| Flow | Result |
|---|---|
| Registration (via API, then session persisted through app UI) | Pass |
| Login, including stale-session detection showing a clear "session expired" banner | Pass (regression-fixed) |
| AI companion setup (name/gender/voice/personality), permission list, "Activate" | Pass |
| AI companion chat — contextual response received | Pass |
| Sipho / Thandi personas — friend tone, no tool-call attempts | Pass |
| Guranda AI Assistant — explains platform, distinguishes itself from personal companion | Pass |
| Switching rapidly between AI personas — no history bleed-through | Pass (regression-fixed) |
| Add Contact → start DIRECT chat | Pass |
| Chat header shows call + video icons for DIRECT chats | Pass |
| Home screen "Continue chatting" tile → correct `targetUserId` → icons present | Pass (regression-fixed) |
| Chat emoji picker | Pass |
| Chat attach/photo-library picker | Pass |
| Chat camera capture | **Fail — open bug, see §5** |
| Chat list "+" FAB not obscured by tab bar | Pass (regression-fixed) |
| Chat input row icon sizing/spacing | Pass (regression-fixed) |

## 7. Not Completed Live — and Why

Given the size of this platform (~25 mini-apps/games plus a dozen life-service verticals, per the White Paper's inventory), and that native-emulator UI automation in this environment runs at roughly 15–60 seconds per interaction even under good conditions (with the host's available RAM dropping to ~2.3GB during this session, causing frequent `adb`/`uiautomator` timeouts and unreliable taps), a full manual UI click-through of every mini-app and every media flow was not realistic to complete reliably in this pass without many more hours and a healthier host environment.

**Not verified live in this session** (though backend routes for all of these passed the smoke sweep in §2, and call signaling was verified via direct socket scripts in the immediately-prior session):
- Voice message recording/playback (blocked: needs real microphone permission flow, best done on a physical device or a healthier emulator)
- Full 1:1 call media (audio/video actually flowing) — call *signaling* (invite/ring/accept/decline/end/failure-handling) was previously verified via direct `socket.io-client` scripts
- Live streaming "Go Live" submission and viewer-side playback
- All games in the Games Hub (chess, ludo, pool, murabaraba, turbo racing, word battle's three modes, trivia)
- Every life-service vertical's full user journey (marketplace, shopping, eat, health, property, travel, work, learning, hair, ride, carfind, entertainment)

**Recommendation**: `docs/testing/TEST_CASES.md` already has a structured test case for every one of these — treat it as the execution checklist for a follow-up pass once host resources are available, ideally on a physical Android device (removes the emulator-camera and AVD-permission-dialog variables entirely) or a machine with more headroom.

## 8. Environment Notes

- Host free RAM ranged from ~4.3GB down to ~2.3GB over the course of this session. Below ~2GB is the documented danger zone for Gradle daemon kills during builds (not hit this session since no build was in progress at the low point), but it also visibly degraded `adb`/`uiautomator` responsiveness during UI testing.
- Push notifications are non-functional in this build (`FirebaseApp is not initialized` — no `googleServicesFile` configured). This doesn't block any in-app functionality tested but should be noted as a known gap.
- XRPL testnet connectivity timed out during this session (`NotConnectedError` in the API logs) — stokvel on-chain activation could not be tested end-to-end; retry when testnet connectivity is confirmed.

## 9. Outstanding Items Carried From Before This Session

- **`hair.service.ts`'s `seedTestHairdresser()`** sets `passwordHash: 'dummy'` and **`admin.service.ts`'s `suspendUser()`** sets `passwordHash: '__SUSPENDED__'` — both write non-bcrypt sentinel values into a real password field. Not fixed in this pass (out of this session's focus, but directly adjacent to the admin security fix in §3 — recommend fixing alongside a proper `role` field migration).
- A prior investigation found one user (`power`) with a suspicious 8-character plaintext-looking `passwordHash` whose write-path was never conclusively identified. Still unresolved.
