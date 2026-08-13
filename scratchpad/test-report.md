# Guranda — Full App Test Report

**Date:** 2026-08-11
**Scope:** apps/api (NestJS), apps/mobile (Expo/React Native web export), website (Next.js marketing site)
**Method:** automated test suites, TypeScript typecheck, lint, live browser smoke testing of both frontends, live API endpoint checks

---

## TL;DR

- **2 severe bugs found and fixed:** the Live Viewer screen crashed to a blank black screen for *every* stream, and **voice/video calling was completely broken** — both were the same class of bug (`SPACING`/`styles` referenced but never defined), and one (`CallScreen.tsx`) was already committed to the repo, not just local WIP.
- **3 more real bugs found and fixed** during verification: a mobile nav-overflow bug, and two React hydration-mismatch errors on the website (one firing on *every* page load).
- **1 real environment bug found and fixed:** the mobile dev server's Metro bundler cache was corrupted, causing 60–200+ second rebuild hangs that were blocking testing itself.
- **1 infrastructure gap found (not fixed — needs a decision from you):** the LiveKit media server is unreachable (`ECONNREFUSED`) from this dev environment, so no call or live stream can actually establish real audio/video right now, even though the surrounding UI no longer crashes. See §2 below.
- **8 real, pre-existing findings** from static analysis (typecheck/lint) — mostly known/tracked (an in-progress theme migration), but a few new ones worth a look (listed below).
- Core flows now verified working end-to-end: registration, login, Home, all 5 tabs, Store/mini-apps (including the Events fix from earlier), wallet, live streams (post-fix), call signaling (post-fix), and the reload-crash fix from earlier in this session.
- **Nothing has been committed.** All fixes described below are sitting as uncommitted changes — say the word if you want them committed/deployed.

---

## 1. Bugs found and fixed this session

### 🔴 Live Viewer crashes on every stream — `SPACING is not defined`
**File:** `apps/mobile/src/components/live/GifPicker.tsx:214-215`
**Severity:** Severe — live streaming was unusable.

`GifPicker` only destructures `COLORS` from the theme at component scope; `SPACING` was only available inside a separate `useThemedStyles(...)` callback. Two lines in the `FlatList`'s inline JSX props referenced the bare `SPACING` identifier outside that scope, throwing an unconditional `ReferenceError` on mount — and `GifPicker` is always mounted inside `LiveViewerScreen`, so **every** stream you opened crashed to a blank screen.

**Fix applied:** reference `theme.SPACING.sm` directly (matching the pattern already used two lines above it in the same file).
**Verified:** opened "Friday Night Hangout" live — host name, chat messages, gift/speak/GIF controls all render correctly now.

### 🔴 Voice and video calls crash — `styles is not defined` (already committed to the repo)
**File:** `apps/mobile/src/screens/calls/CallScreen.tsx`
**Severity:** Severe — calling was completely unusable. **This one was already merged**, not uncommitted WIP — traced to commit `8aae2e0` ("fix(ui): resolve style references and socket issues", Aug 5).

That commit, part of the ongoing theme migration, deleted the entire `StyleSheet.create({...})` block for `CallScreen` (root, avatarWrap, controls, hangupBtn, pip, reactionTray, etc. — 17 style keys) but only added a `useThemedStyles` call for a small inner sub-component (`FloatingVemoji`), never for the main screen. Every reference to `styles.root`, `styles.controls`, etc. in the main render was left pointing at nothing, throwing on mount.

**Fix applied:** recovered the original 17 style definitions from git history (`git show 8aae2e0 -- CallScreen.tsx`) and re-added them via a proper `useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({...}))` call in the main component, matching the migration's intended pattern. Also removed the now-unused `StyleSheet` import.
**Verified:**
- Typecheck clean for this file.
- Live-tested the actual call-initiation path end-to-end (see §2 below) — the screen no longer crashes; the "Call failed" flow renders correctly for an offline target, and the call successfully progresses through invite → presence check → LiveKit room creation without hitting the old crash.

### 🟡 Mobile nav hamburger clipped off-screen + horizontal page overflow (website)
**Files:** `website/components/DownloadCTA.tsx`, `website/app/globals.css`
**Severity:** Moderate — cosmetic/layout, mobile only.

Two compounding causes:
1. `DownloadCTA.tsx` had two decorative blurred glow blobs (`w-96 h-96`, offset `-top-16`/`-bottom-16` etc.) with no `overflow-hidden` ancestor, letting them push the page ~4px wider than the viewport.
2. A further ~40px of overflow came from the layout viewport itself growing past the visual viewport on narrow screens (a browser quirk `html` wasn't defending against).

**Fix applied:** added `overflow-hidden` to the DownloadCTA wrapper, and `overflow-x: hidden; max-width: 100vw;` to both `html` and `body` in `globals.css` as a defense-in-depth safety net.
**Verified:** at 375px width, `scrollWidth`/`innerWidth`/`visualViewport.width`/`clientWidth` all now agree exactly at 375, and the hamburger button's right edge sits at 355px (well inside the viewport, previously clipped past it).

### 🟡 React hydration mismatch on every page load (website)
**File:** `website/components/UpcomingEventsSection.tsx:80`
**Severity:** Moderate — console error on every single page load/navigation.

The event countdown timers (`useCountdown`) compute `Date.now()`-based values inside a lazy `useState` initializer, which runs once during server-side rendering and again moments later during client hydration — the seconds digit almost always differs between the two, which is React's documented "live clock" hydration-mismatch case.

**Fix applied:** `suppressHydrationWarning` on the digit `<span>` — the officially documented fix for this exact pattern (the value is *supposed* to differ; only the warning needs suppressing).
**Verified:** clean in a fresh tab, no console errors.

### 🟡 Second, distinct hydration mismatch (website)
**File:** `website/components/AISection.tsx:163`
**Severity:** Low — console noise only, no visible defect.

The orbit-diagram connector lines compute `Math.sin()`/`Math.cos()`-derived SVG coordinates that occasionally differ in the 14th significant digit between server and client (floating-point engine variance) — e.g. `84.43747686898274` vs `...76`. Note: `suppressHydrationWarning` does **not** work for attribute mismatches (only text-content mismatches per React's own docs), so that was a dead end.
**Fix applied:** round the computed coordinates to 2 decimal places, which eliminates the float-precision noise at the source rather than trying to suppress it.
**Verified:** clean in a fresh tab.

### 🟠 Mobile dev server unusable — corrupted Metro cache
**Not a product bug** — an environment/tooling issue that was actively blocking testing itself.

Metro's disk cache had become corrupted (`Unable to deserialize cloned data due to invalid or unsupported version`), forcing a full filesystem crawl on every single request instead of using cache. Bundle rebuild times were measured at 67s, 111s, and 204s — enough to exceed both `curl`'s and the browser tool's timeouts, making the app look "broken" when it was really just catastrophically slow.

**Fix applied:** one-time `expo start --clear` to rebuild a valid cache, then reverted the flag so future starts don't pay the full-rebuild cost every time.

### ⚙️ Dev server port conflicts (from earlier in this session, included for completeness)
`apps/api`'s configured dev port (3000) and `apps/mobile`'s dev port (8081) were both being squatted on by stray processes, and Expo's CLI doesn't gracefully honor dynamic port reassignment (it hard-prompts interactively, which fails in this non-interactive environment). Fixed by aligning `api`'s port to 3001 (matching what `apps/mobile/src/utils/api.ts` already hardcoded) and giving `mobile-web` an explicit `--port 8090` flag. See `.claude/launch.json`.

---

## 2. Voice/video call testing — deep dive

You asked me to specifically test calling. Testing a real 2-person call needs two genuinely separate logged-in sessions, but this app stores its auth token in `localStorage`, which is shared across every tab of the same browser origin — so two normal browser tabs can't hold two different logged-in users at once here. To work around that without creating a real second account or logging into anyone else's, I opened a second tab, connected a raw `socket.io-client` directly to the API's WebSocket endpoint (no login, no token needed for this — see finding below), and used it purely to mark a local test account "online" at the presence layer, exactly like a real client's socket does.

**What I verified, end-to-end, from a real logged-in tab:**
1. Tapped the call icon in a 1:1 chat → client emits `call_invite` over the socket.
2. Server looks up the target user, checks presence, and (before my fix) would have crashed the caller's screen the moment the call actually started ringing. **This no longer happens** — confirmed via both typecheck and by driving the flow far enough to prove the crash path is gone.
3. Tested the "offline" branch: server correctly replies `call_failed` with "X is offline right now" and the app shows a clean alert, no crash.
4. Tested the "online" branch (via the presence trick above): server correctly passes the online check and proceeds to provision a LiveKit room — which is where it currently stops (see below).

**What's blocking full end-to-end verification (not a code bug):** the server logged this on room creation:
```
call_invite: failed to create LiveKit room: TypeError: fetch failed
  ... cause: AggregateError [ECONNREFUSED]
```
LiveKit credentials *are* configured in `apps/api/.env` (not missing), but the LiveKit media server itself isn't reachable from this machine right now — most consistent with a self-hosted LiveKit instance that isn't currently running. This affects both calling and actual live-stream video/audio (the Live Viewer screen I tested earlier renders fine and doesn't crash, but I did not confirm real video was flowing — same underlying dependency). I didn't attempt to start a LiveKit server myself since I don't know whether you run it locally via Docker, another local process, or expect LiveKit Cloud — that's your call.

**One incidental finding from this investigation:** the chat/call WebSocket gateway trusts a client-declared `userId` on `set_status` with no server-side verification against the connection's own identity — I was able to mark an arbitrary user "online" from an entirely unauthenticated socket connection. Worth a look if presence/calling security matters to you; I didn't chase this further since it's outside today's scope, but flagging it since I found it in the course of testing.

---

## 3. Live smoke test — mobile app (localhost:8090)

Tested end-to-end as a fresh registered account (`qatest_4821`) against the local dev database.

| # | Check | Result |
|---|---|---|
| 1 | Initial load | ✅ Pass |
| 2 | Registration / login flow | ✅ Pass |
| 3 | Home screen loads, no console errors | ✅ Pass |
| 4 | Bottom tab nav (Home/Chats/Explore/Life/Profile) | ✅ Pass |
| 5 | Store/Hub mini-app grid shows "Events" | ✅ Pass (confirms last session's fix) |
| 6 | Home "Explore Mini Apps" strip shows "Events" | ✅ Pass (confirms last session's fix) |
| 7 | Live streams list + open a stream | ❌→✅ Was crashing; **fixed and reverified this session** |
| 8 | Wallet balance UI | ✅ Pass |
| 9 | Reload mid-navigation doesn't crash | ✅ Pass (confirms earlier session's fix) |
| 10 | Voice/video call initiation | ❌→✅ Was crashing (`CallScreen.tsx`); **fixed** — see §2 for the full deep-dive, including the LiveKit infrastructure gap that still blocks real media |

## 4. Live smoke test — website (localhost:3010)

| # | Check | Result |
|---|---|---|
| 1 | Homepage loads, no console errors | ❌→✅ Was throwing a hydration error on every load; **fixed** |
| 2 | No horizontal overflow, desktop (1280px) | ✅ Pass |
| 3 | No horizontal overflow, mobile (375px) | ❌→✅ Was overflowing by ~44px; **fixed** |
| 4 | Mobile hamburger button fully visible | ❌→✅ Was clipped 20px past the edge; **fixed** |
| 5 | Nav routes (Home/Leagues/Roadmap/Contact/Download) | ✅ Pass |
| 6 | All homepage sections render real content | ✅ Pass |

## 5. API endpoint checks (localhost:3001)

| Endpoint | Expected | Actual |
|---|---|---|
| `GET /` | 200 | ✅ 200, "Hello World!" |
| `GET /live/rooms` | 200 (public by design) | ✅ 200 |
| `GET /wallets/me` (unauthenticated) | 401 | ✅ 401 |
| `GET /challenges` (unauthenticated) | 401 | ✅ 401 |
| `GET /work/companies/mine` (unauthenticated) | 401 | ✅ 401 |

All routes correctly mapped and guarded — no 404s (unmapped) or 500s (crashing) anywhere.

## 6. Automated tests, typecheck, lint

| Check | Result |
|---|---|
| `apps/api` jest (50 tests) | 42 passed, **8 failed** — see below |
| `packages/types` jest | 49/49 passed |
| `apps/api` typecheck | 5 errors (2 in a test file, 1 unused-var) |
| `apps/mobile` typecheck | 115 errors — ~70 are the known, already-tracked in-progress theme migration; the rest are new findings below |
| `apps/api` eslint (no auto-fix) | 3,128 errors / 723 warnings, mostly `no-unsafe-*` any-typing — not evaluated for severity, just counted |
| `apps/mobile` eslint (no auto-fix) | 5,379 errors / 5,439 warnings — same caveat |
| `npx prisma validate` | ✅ schema is valid |

### New findings worth a look (not fixed this session — flagging for follow-up)

- **`apps/api/src/challenges/challenges.service.spec.ts`** — all 8 test failures are the *test mock* missing `prisma.userProfile.upsert` and `prisma.challenge.count`, not a service bug. The mock needs those two methods added.
- **`PlatformWidget.ts` vs `platformWidget.ts` filename casing conflict** in `apps/mobile` — causes ~10 typecheck errors across `AiWidgetRenderer.tsx`, `ChallengeDetailScreen.tsx`, `ChallengesFeedScreen.tsx`, `PostCommentsScreen.tsx`, `WidgetComposer.tsx`. Worth resolving to one canonical filename.
- **`ChallengesFeedScreen.tsx:271-273`** — references `EntryStats.likeCount`/`voteAverage`/`commentCount`, which don't exist on that type.
- **`ChallengeCard.tsx:107,109`** — uses `StyleSheet.absoluteFillObject`, which isn't a real RN API (should be `StyleSheet.absoluteFill`).
- Minor: a Framer Motion console warning ("animating multiple children within AnimatePresence set to mode='wait'") appears repeatedly in the website dev logs — cosmetic, not investigated further.

---

## What wasn't covered

Given the size of this app, this pass prioritized the primary user-facing flows over exhaustive coverage. Not tested: native (iOS/Android) builds, payment/wallet transfer execution, chess/card game logic, admin console, actual real-time media (video/audio bytes flowing through LiveKit — blocked by the infrastructure gap above), and most of the ~15 mini-apps beyond a surface check that they list correctly.

## Next steps

1. Review the 5 code fixes above (all uncommitted) — say the word to commit and/or deploy.
2. **Decide on LiveKit**: is there a local/self-hosted LiveKit server that should be running alongside the other dev servers, or should local dev point at a cloud LiveKit project? Once that's sorted, I can re-verify a full two-way call and confirm live-stream video actually plays.
3. Decide whether to act on the 4 "new findings" from static analysis, or leave them for the in-progress theme migration work to sweep up.
4. Consider the presence-spoofing finding (§2) if call/status security matters.
5. If you want deeper coverage (native builds, payment flows, admin console, individual game logic), let me know which area to prioritize next.
