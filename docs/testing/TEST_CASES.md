# Guranda / LifeOS — Master Test Case Document

Companion to `WHITE_PAPER.md`. Each case: ID, Preconditions, Steps, Expected Result, Priority (P0=blocking/core, P1=important, P2=nice-to-have). "Automated" column notes whether this session executed it via API/socket script (A), live UI on the native emulator (U), or is documented but not yet executed (—).

---

## 1. Auth & Identity

| ID | Preconditions | Steps | Expected | Priority | Executed |
|---|---|---|---|---|---|
| AUTH-01 | API running | POST `/users/register` with valid username/password/firstName/lastName/occupation | 201, returns `user` + JWT `token`; free username claimed | P0 | A |
| AUTH-02 | Existing user | POST `/users/login` with correct credentials | 200, returns user + token | P0 | A |
| AUTH-03 | Existing user | POST `/users/login` with wrong password | 401 Unauthorized, generic "Invalid username or password" (no user enumeration) | P0 | A |
| AUTH-04 | Valid token | GET `/users/me` with `Authorization: Bearer <token>` | 200, own profile | P0 | A |
| AUTH-05 | Token for a since-deleted user | GET any authenticated route | 401 "Session expired", client shows login screen with a visible expiry banner, not a generic 500 | P0 | U (regression-fixed this session) |
| AUTH-06 | — | Register with a username that's a reserved word / already taken | 400 with a clear reason (not 500) | P1 | — |
| AUTH-07 | — | Register with missing firstName/lastName/occupation | 400 "First name, last name and occupation are required" | P1 | A (indirectly confirmed via service code path) |
| AUTH-08 | Logged in | Foreground the app after backgrounding | Verification/session status silently refreshed; no stale "unverified" state shown if it changed server-side | P1 | — |
| AUTH-09 | — | Attempt registration/login over the mobile UI end-to-end | Session persists across app restart; app lands on Home, not Login | P0 | U |

## 2. Wallet & Finance

| ID | Preconditions | Steps | Expected | Priority | Executed |
|---|---|---|---|---|---|
| WALLET-01 | Logged in | GET `/wallets/me` | Returns current MSH balance | P0 | — |
| WALLET-02 | Two users, sender has balance | POST `/wallets/send` to recipient | Balance debited/credited correctly, transaction recorded | P0 | — |
| WALLET-03 | — | POST `/wallets/send` with amount > balance | 400, no partial debit | P0 | — |
| WALLET-04 | — | Deposit flow (`/wallets/deposit`) | Deposit created pending, appears in history | P1 | — |
| WALLET-05 | Admin | Confirm/reject a pending deposit | Balance updates only on confirm; rejected deposit stays at 0 effect | P1 | — |
| FIN-01 | Logged in | Create a stokvel | Created with creator as owner | P0 | — |
| FIN-02 | Stokvel exists | Second user joins | Membership added; promote to admin works | P1 | — |
| FIN-03 | Stokvel with members | Activate XRPL multisig | Multisig account created on XRPL testnet — **note: observed `NotConnectedError: connect() timed out after 5000ms` in this environment; retest when XRPL testnet reachable** | P1 | A (failed — infra) |
| FIN-04 | Active stokvel | Member contributes | Contribution recorded, balance reflected | P1 | — |
| FIN-05 | Active stokvel | Raise a funding request, members vote/sign | Request only executes once required signatures/votes are met | P1 | — |
| FIN-06 | — | View stokvel audit log | Chronological, tamper-evident record of all actions | P2 | — |

## 3. Messaging & Media

| ID | Preconditions | Steps | Expected | Priority | Executed |
|---|---|---|---|---|---|
| CHAT-01 | Two registered users, A searches B | Add contact by username, start chat | New DIRECT chat created; `targetUserId` passed to ChatRoom | P0 | U (pass) |
| CHAT-02 | Existing DIRECT chat | Send text message | Appears instantly for sender; delivered to recipient via socket if online | P0 | U (pass, via prior session's socket.io script) |
| CHAT-03 | DIRECT chat open | Header shows call icon + video icon | Both icons visible and tappable only for DIRECT chats (not group/public) | P0 | U (pass) |
| CHAT-04 | Home screen has a recent chat | Tap "Continue chatting" tile | Opens ChatRoom with `targetUserId` populated (call/video icons present) | P0 | U (pass — regression fixed this session) |
| CHAT-05 | Chat open | Tap emoji icon | Emoji picker opens, tapping an emoji inserts it into the input | P0 | U (pass) |
| CHAT-06 | Chat open | Tap GIF icon, search, select a GIF | GIF sent as a media message | P1 | — |
| CHAT-07 | Chat open | Tap attach/paperclip icon | Native photo/video library picker opens; selecting an item uploads and sends it | P0 | U (pass) |
| CHAT-08 | Chat open | Tap camera icon | **FAIL** — no permission dialog, no camera opens, no visible error (see Test Report §Camera Bug) | P0 | U (FAIL — open bug) |
| CHAT-09 | Chat open, mic idle | Tap-and-hold / tap mic button to record a voice note, release/stop | Recording UI shows, stopping produces a playable voice bubble with waveform/timer | P0 | — (blocked: needs real device or a mic-permitted emulator run) |
| CHAT-10 | Voice message sent | Tap play on a voice bubble | Audio plays, progress bar advances, pause/resume works | P1 | — |
| CHAT-11 | Two contacts, one creates a group | Create Group with 2+ members | Group chat created, all members see it, creator is ADMIN | P0 | — |
| CHAT-12 | Group chat | Send message | All members receive it in real time | P0 | — |
| CHAT-13 | Group/public chat | Header shows room type, no call/video icons | Call/video icons correctly absent for non-DIRECT chats | P1 | — |
| CHAT-14 | Chat list | "+" FAB tap | Opens Add Contact screen (not obscured by tab bar) | P1 | U (pass — regression fixed) |
| CHAT-15 | Chat screen input row | Visual check | Icons (emoji/GIF/attach/camera) compact, evenly spaced, don't crowd the text input | P2 | U (pass — regression fixed) |

## 4. Calling & Live Streaming

| ID | Preconditions | Steps | Expected | Priority | Executed |
|---|---|---|---|---|---|
| CALL-01 | LiveKit running, two users, A has B as DIRECT contact | A taps call icon | `call_invite` emitted, B receives `call_incoming`, A sees "ringing" | P0 | A (socket.io script, prior session) |
| CALL-02 | Incoming call showing on B | B taps Accept | Both sides connect to the same LiveKit room, `call_accepted` fires, CallScreen mounts on both | P0 | A (partial — signaling only) |
| CALL-03 | Incoming call showing on B | B taps Decline | `call_decline` fires, A's UI shows declined and returns to chat | P0 | A |
| CALL-04 | Call ringing, B doesn't respond | Wait for ring timeout (~30s) | Call auto-cancels, both sides notified, no orphaned LiveKit room | P1 | — |
| CALL-05 | Call connected | Either side toggles mic/camera | Local track enable/disable reflected, remote side sees the change | P1 | — |
| CALL-06 | Call connected | Either side taps hangup | `call_end` fires, both sides return to chat, LiveKit room cleaned up | P0 | — |
| CALL-07 | LiveKit unreachable (simulated) | A attempts to call B | `call_failed` emitted with clear message; caller's UI does **not** hang forever | P0 | A (pass — regression verified this session's predecessor) |
| LIVE-01 | LiveKit running | Host taps "Go Live" | Host connects as publisher, room appears in Live Now / Discovery feeds | P0 | — |
| LIVE-02 | Live room active | Viewer taps into the stream | Viewer connects as subscriber only (`canPublish:false`), sees host's video | P0 | — |
| LIVE-03 | Live room active | Viewer sends a chat message / emoji reaction | Host and other viewers see it in real time | P1 | — |
| LIVE-04 | Live room active | Host pins a product/food item | Viewers can tap to buy without leaving the stream | P2 | — |
| LIVE-05 | Live room active | Host starts a quiz/poll/prediction | Viewers can answer/bet; results resolve correctly | P2 | — |
| LIVE-06 | Live room active | Host ends stream | Room closes, all viewers disconnected gracefully | P0 | — |

## 5. AI Companion

| ID | Preconditions | Steps | Expected | Priority | Executed |
|---|---|---|---|---|---|
| AI-01 | Logged in, first time | Complete "Meet your AI" setup (name/gender/voice/personality) | Companion created with chosen config | P0 | U (pass) |
| AI-02 | Setup complete | Review "Access for Aura" permission list | Every tool has a clear description; toggles work; "Allow all"/"Restrict all" work | P1 | U (pass — list renders, toggles present) |
| AI-03 | Companion activated | Send a message to companion | Companion responds contextually; tool calls that move money/data show an approval prompt first | P0 | U (pass — got a real contextual response) |
| AI-04 | — | Ask companion to do a write action (e.g. send money, book something) | Action is NOT executed silently; user sees an explicit approve/deny prompt | P0 | — |
| AI-05 | — | Open Sipho or Thandi | Persona responds as a warm friend, no tool-call attempts, no "I'm just an AI" hedging | P0 | U (pass, verified earlier this session) |
| AI-06 | — | Open Guranda AI Assistant | Explains platform features and explicitly distinguishes itself from the personal companion | P0 | U (pass, verified earlier this session) |
| AI-07 | Switch between Sipho → Assistant → Sipho quickly | Chat history for each stays isolated (no bleed-through) | P0 | U (pass — regression fixed earlier this session) |
| AI-08 | Valid JWT | Call an MCP tool externally using the user's token | Only read-only tools are exposed; response matches in-app data | P2 | — |

## 6. Games Hub

| ID | Preconditions | Steps | Expected | Priority | Executed |
|---|---|---|---|---|---|
| CHESS-01 | Two players | Join chess queue, get matched | Both land in the same `gameId`, board renders identically | P0 | — |
| CHESS-02 | Game in progress | Make a legal move | Move validated by `chess.js` both client and server side, board updates for both players | P0 | — |
| CHESS-03 | Game in progress | Attempt an illegal move | Rejected, board unchanged | P1 | — |
| CHESS-04 | Game ends | Offer rematch | New game starts if both accept | P2 | — |
| LUDO-01 | 1v1 through 1v5 modes | Start each mode | Correct number of seats/AI opponents populate | P1 | — |
| LUDO-02 | Game in progress | Roll dice, move a token | Legal moves highlighted via shared rules engine; illegal moves blocked | P0 | — |
| LUDO-03 | Game in progress | Send a gift via GiftButton | Gift animation shows, recorded server-side | P2 | — |
| POOL-01 | Select AI difficulty + wager ≤ balance | Start game | Wager deducted, table racks correctly | P0 | — |
| POOL-02 | Game in progress | Aim and strike cue ball | Physics resolves realistically (collisions, pocketing, respot) | P0 | — |
| POOL-03 | Wager > balance | Attempt to start game | Blocked with a clear insufficient-funds message | P0 | — |
| POOL-04 | 8-ball pocketed rule | Pocket the 8-ball out of turn / before clearing group | Correct win/loss per standard 8-ball rules (`onEight`) | P1 | — |
| MURA-01 | New game | Placement phase — place all 12 pieces | Mill formation (3 in a row) correctly triggers a capture prompt | P0 | — |
| MURA-02 | Movement phase | Move a piece to an adjacent point | Only legal adjacency moves allowed | P0 | — |
| MURA-03 | Player down to 3 pieces | Move | Flying phase enabled (move anywhere) | P1 | — |
| MURA-04 | Opponent at 2 pieces or fully blocked | Continue play | Win condition triggers correctly | P0 | — |
| RACE-01 | Wallet has currency | Buy a car upgrade (speed/accel/handling/colour) | Balance deducted, upgrade applied and visible on car | P1 | — |
| RACE-02 | Race started | Drive through the simulated track | Position reported to server on interval; race ends at finish distance | P0 | — |
| WORD-01 | Word Battle lobby | Pick Wordle Duel mode + wager | Both players get the same secret word, race to guess | P0 | — |
| WORD-02 | Guess submitted | Check tile coloring | Correct/present/absent colors match standard Wordle rules | P0 | — |
| WORD-03 | Boggle mode | Trace a valid word path on the shared grid | Word accepted, added to found-words tally within the timer | P0 | — |
| WORD-04 | Boggle mode | Trace a non-adjacent or invalid path | Rejected | P1 | — |
| WORD-05 | Scrabble mode | Place tiles forming a valid word on a premium square | Score computed correctly including premium multiplier | P0 | — |
| WORD-06 | Scrabble mode | Use a blank tile | Letter picker appears, chosen letter scores as 0 | P1 | — |
| WORD-07 | Scrabble mode | Exchange tiles instead of playing | Turn passes correctly, rack refreshed | P1 | — |
| ARCADE-01 | Trivia Arcade open | Answer a series of questions | Score tallies correctly, no server dependency issues | P2 | — |
| STORE-01 | Games/Hub screen | View catalog | Live games marked distinctly from "under construction" ones | P1 | U (indirectly — Home screen tiles visible) |
| STORE-02 | Store screen | Install / uninstall a mini-app | Reflected immediately in Hub screen | P2 | — |

## 7. Life Services

| ID | Preconditions | Steps | Expected | Priority | Executed |
|---|---|---|---|---|---|
| MARKET-01 | Seller lists an item | Buyer views listing | Details render correctly | P1 | — |
| MARKET-02 | Listing active | Buyer uses Buy Now | Invoice generated, listing marked sold | P0 | — |
| MARKET-03 | Auction listing | Buyer places a bid | Bid recorded, "My Bids" reflects it, higher bid supersedes | P1 | — |
| MARKET-04 | Own listing | Cancel it | Listing removed from browse, no longer biddable | P1 | — |
| SHOP-01 | Store with products | Add to cart, checkout | Order created, appears in Shopping Orders | P0 | — |
| SHOP-02 | Seller side | Update order status | Buyer sees updated tracking status | P1 | — |
| EAT-01 | Store menu | Add items to cart, place order | Order created, store receives it | P0 | — |
| EAT-02 | Order placed | Track order | Status progression visible (received → preparing → out for delivery, etc. as modeled) | P1 | — |
| HEALTH-01 | — | Log a fitness entry | Summary reflects new entry | P2 | — |
| HEALTH-02 | Practitioner exists | Book an appointment | Appointment created, shows in My Appointments | P1 | — |
| HEALTH-03 | Pharmacy exists | Order a product | Order placed and tracked | P1 | — |
| PROPERTY-01 | Listing exists | Browse and view detail | Renders correctly | P1 | — |
| PROPERTY-02 | Rental listing | Create tenancy | Tenancy created, lease viewable | P1 | — |
| PROPERTY-03 | Active tenancy | Pay rent | Payment recorded, reflected in lease/rent history | P0 | — |
| PROPERTY-04 | Active tenancy | Report an issue | Issue created with status, landlord can update status | P2 | — |
| TRAVEL-01 | — | Search/browse flights, stays, cars, packages | Each category returns results | P1 | — |
| TRAVEL-02 | Item selected | Book it | Booking created, appears in Trips/mine | P0 | — |
| WORK-01 | Company posts a job | Applicant applies | Application recorded, company sees it in applicant management | P0 | — |
| WORK-02 | Freelance gig posted | Freelancer submits a proposal | Proposal recorded; poster can accept | P1 | — |
| WORK-03 | Gig accepted | Freelancer submits work | Poster can approve, completing the escrow-style flow | P1 | — |
| LEARN-01 | Course exists | Enroll, view lessons, mark complete | Progress tracked, certificate issued on completion | P1 | — |
| LEARN-02 | Tutor exists | Book a session | Session created, appears in My Sessions | P1 | — |
| LEARN-03 | Study community exists | Join, post | Post visible to other members | P2 | — |
| HAIR-01 | Hairdresser exists | View profile/services, book | Booking created with chosen slot | P1 | — |
| RIDE-01 | Driver online | Rider requests a ride | Driver sees request, can accept | P0 | — |
| RIDE-02 | Ride accepted | Track live location | Rider sees driver's live position update | P1 | — |
| RIDE-03 | Ride in progress | Driver completes ride | Ride closes, both sides see completed state | P0 | — |
| CARFIND-01 | Listing exists | Buyer submits enquiry | Seller sees it in My Car Enquiries | P1 | — |
| ENT-01 | Movie/concert exists | Book | Booking appears in My Entertainment Bookings | P1 | — |
| ENT-02 | Self-service event created | Generate invite link, add managers/scanners | Roles function correctly (manager can edit, scanner can only verify tickets) | P1 | — |
| ENT-03 | Event with tickets | Scan a ticket via Verify Ticket screen | Valid ticket confirmed once; re-scan flagged as already used | P0 | — |

## 8. Social

| ID | Preconditions | Steps | Expected | Priority | Executed |
|---|---|---|---|---|---|
| SOCIAL-01 | — | Create a post | Appears in feed, likeable/commentable | P1 | — |
| SOCIAL-02 | — | Create a story | Appears in story tray, viewable, expires per ephemeral rules | P1 | — |
| SOCIAL-03 | Story posted | View story, like/comment/"rank" vote | Reflected correctly | P2 | — |
| SOCIAL-04 | Community exists | Join, browse, post | Membership and post visible | P1 | — |
| MOON-01 | — | Enter a MoonBase room | Presence shown, room chat works in real time | P1 | — |
| MOON-02 | Server restart | Re-enter a MoonBase room | **Known limitation**: room state is in-memory only, will be reset | P2 | — |

## 9. Admin

| ID | Preconditions | Steps | Expected | Priority | Executed |
|---|---|---|---|---|---|
| ADMIN-01 | Admin account | View stats dashboard | Aggregate numbers render (users, games, rides, live, economy) | P1 | — |
| ADMIN-02 | Admin account | View/suspend a user | Suspended user cannot log in; **verify this does not write a non-bcrypt sentinel into `passwordHash`** (flagged as a prior finding, not yet fixed) | P0 | — |
| ADMIN-03 | Admin account | Approve/reject a verification submission | Status updates, user's app reflects it | P1 | — |
| ADMIN-04 | Admin account | Manage reserved usernames | CRUD works, reserved names blocked from public claim | P2 | — |

## 10. Non-Functional / Infrastructure

| ID | Preconditions | Steps | Expected | Priority | Executed |
|---|---|---|---|---|---|
| NFR-01 | Fresh clone | `docker compose up -d` (postgres + livekit) | Both containers healthy | P0 | A (livekit confirmed running) |
| NFR-02 | API + mobile running | Native Android build (`expo run:android`) | Builds and installs without Gradle failure | P0 | U (pass this session) |
| NFR-03 | — | `expo-image-picker`/`expo-camera` permission strings present in `app.json` | Present after rebuild | P0 | U (confirmed present, did not resolve the camera bug) |
| NFR-04 | Low host RAM (<2GB free) | Run a Gradle build | **Known risk**: daemon can be silently killed; documented mitigation is to free RAM before building | P1 | Documented (memory) |
| NFR-05 | — | Confirm no plaintext/non-bcrypt writes to `User.passwordHash` anywhere in the codebase | **Open item from a prior session — not completed.** `hair.service.ts` `seedTestHairdresser()` and `admin.service.ts` `suspendUser()` both write non-bcrypt sentinel values | P0 | Documented, unresolved |
| NFR-06 | — | Push notification registration | **Known failure**: `FirebaseApp is not initialized` — no `googleServicesFile` configured | P2 | U (observed every session) |
