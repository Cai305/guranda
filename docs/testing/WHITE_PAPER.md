# Guranda / LifeOS Platform White Paper

**One Identity. One Economy. One Life.**

Version 1.0 — generated from a full codebase audit of the `mxit2.0` monorepo, reflecting the platform's *actual current implementation* (not aspirational roadmap items).

---

## 1. Executive Summary

Guranda (product name "LifeOS" internally) is a single mobile super-app that unifies social networking, real-time messaging, an AI companion, a suite of multiplayer games, a marketplace economy backed by a real-money wallet, and a wide set of "life services" (food, health, travel, property, work, learning, ride-hailing) behind one identity and one wallet.

The thesis is consolidation: instead of a user carrying WhatsApp, Instagram, Uber, a food-delivery app, a bank app, a game center, and a job board, LifeOS gives them one account, one balance (MSH — Mashaleni), and one AI assistant that can act across all of it on their behalf, with human approval gating anything that moves money or makes a booking.

## 2. Architecture Overview

**Monorepo layout** (`C:\Users\USER\Desktop\mxit2.0`):
- `apps/api` — NestJS backend, PostgreSQL via Prisma ORM, Socket.IO gateways for everything real-time (chat, games, live, ride).
- `apps/mobile` — Expo / React Native client (Android + iOS + web), React Navigation stack/tab structure.
- `packages/types` — shared TypeScript DTOs and game-rule engines (chess/ludo/morabaraba/turbo-racing) consumed by both apps so client and server never disagree on legality of a move.

**Infrastructure** (`docker-compose.yml`):
- **PostgreSQL 15** — primary datastore.
- **LiveKit** (self-hosted, dev-mode) — WebRTC SFU backing both one-way Live streaming and 1:1 calling.

**Auth**: JWT (Passport), issued at login/register, validated per-request; a server-side check added this session ensures deleted/stale users are rejected with a clean "session expired" flow instead of a generic 500.

**AI layer**: a tool-use agent runtime (`ai-runtime`) backed by Claude, with a formal Tool Registry (`tool-registry`) that both the in-app AI Companion and an external Model Context Protocol server (`mcp`) draw from — meaning the same permissioned tool surface the user's personal AI uses is also exposed, under the user's own JWT, to external MCP clients like Claude Desktop or Claude Code. Every tool that moves money, books something, or edits data is marked "Requires approval" and surfaced to the user before executing.

## 3. Feature Pillars

### 3.1 Identity, Wallet & Economy
- **Guranda identity** — one account per user; every account gets one free username claim at registration (`usernames` module), with a secondary marketplace to mint, browse, buy, bid on, and list additional handles.
- **Wallet (MSH)** — internal currency wallet (`wallets` module): balance, send, deposit + deposit approval workflow, admin oversight.
- **Stokvels (Finance module)** — South African-style rotating group savings pots, backed for real by XRPL (XRP Ledger) testnet multisig accounts: create/join/promote members, activate on-chain, contribute, raise funding requests that members vote on and multi-sign.
- **Verification** — identity verification workflow (submit → admin approve/reject) gates wallet use and creator payouts.

### 3.2 Messaging & Social
- **Chat** — 1:1 and group/channel messaging, presence (online/offline), typing groundwork, media attachments (photo/video/voice/GIF/emoji), a WhatsApp-style UI.
- **Calling** — 1:1 audio/video calls over LiveKit, ring/accept/decline/end signaling through the chat gateway.
- **Stories** — ephemeral status posts, feed, likes/comments, "rank" voting, buyable items tagged in a story.
- **Posts & Communities** — a social feed (post/like/comment) plus joinable topic communities.
- **MoonBase** — themed live social rooms (Lunar Lounge, Crater Club, Gamers' Galaxy, Love Orbit, Study Station, Trade Post) with real-time presence and room chat.

### 3.3 AI Companion
- **Personal AI Companion** — a configurable agent (name/gender/voice/personality) with graduated, user-controlled tool permissions across every module in the platform (read/write pairs per domain, write actions gated behind approval).
- **Fixed personas** — Sipho and Thandi, always-on "best friend" characters with no tool access, purely conversational; Guranda AI Assistant, a fixed persona that explains the platform itself and is explicitly distinguished from the user's personal companion.
- **MCP server** — read-only tool exposure over Model Context Protocol for external AI clients under the user's own auth.

### 3.4 Games & Entertainment Hub
A full multiplayer games hub, each with a lobby (mode/AI-difficulty/wager selection), Socket.IO-based matchmaking/live-move gateway, and a dedicated game screen:
- **Chess** — full legal-move engine (`chess.js`), ranked matchmaking, rematch.
- **Ludo** — 1v1 up to 4v4 and 1v5 (vs AI swarm) modes, animated board.
- **Pool (8-ball)** — real ball physics, AI opponent with difficulty levels, wager-based play.
- **Murabaraba** (Morabaraba) — traditional African mill-capture game, placement/movement/flying phases, AI opponent.
- **Turbo Racing** — client-simulated racing with wallet-funded car upgrades (speed/accel/handling/colour).
- **Word Battle hub** — three modes sharing one lobby: **Wordle Duel** (head-to-head word guessing), **Boggle** (shared grid, timed word tracing), **Scrabble** (full 15x15 board with premium squares, tile exchange).
- **Trivia Arcade** — local general-knowledge quiz.
- **Games/Store catalog** — an app-store-style install/uninstall surface for all of the above, feeding both the Hub screen and the AI's own product knowledge.

### 3.5 Life Services
A set of full vertical mini-apps, each with its own browse/detail/booking or ordering flow and (mostly) a seller/provider-side management dashboard under Profile:
- **Marketplace** — general classifieds/auction (buy-now, bid, invoices).
- **Shopping** — retail stores/products/orders.
- **Eat** — food delivery (store browse, cart, order tracking, store-side order management).
- **Health** — fitness logging, practitioner booking, pharmacy ordering, wellness content.
- **Property** — rentals (list/browse, tenancy creation, rent payment, lease view, issue reporting).
- **Travel** — flights, stays, cars, packages, trip history.
- **Work** — company pages, job postings/applications, freelance gigs with an escrow-style proposal → accept → submit → approve flow.
- **Learning** — courses (enroll/lessons/certificates), tutor booking, study communities.
- **Hair** — hairdresser/beauty professional search and booking.
- **Ride** — rider request / driver accept-complete with live location matching.
- **CarFind** — car classifieds with buyer enquiries.
- **Entertainment** — movies, concerts, and full self-service events (ticketing, invite links, door-scanner verification, managers/scanners roles).

### 3.6 Live & Broadcasting
- **Live streaming** (one-way, distinct from calling) — a host broadcasts to many viewers via LiveKit (viewers cannot publish); supports pinning products/food for in-stream purchase, linking a mini-game, live quiz/poll/prediction betting, live job postings with applicants, live Q&A, custom emoji reactions, GIF picker.
- **Discovery / Video** — a YouTube-style short/long video platform: upload, personalized feed, trending, search, playlists, watch later, likes/comments, related videos.

### 3.7 Advertising & Admin
- **Ads** — advertiser campaign creation, status management, ad-delivery serving.
- **Admin** — platform operations dashboard: user management (including suspend), gaming/rides/live/stories/economy aggregate views, AI usage monitoring, reserved-username administration.

## 4. Current State & Known Gaps (as of this audit)

- Core social, messaging, wallet, AI companion, and the full games hub are implemented end-to-end (REST + real-time + mobile UI).
- **Camera capture in chat is a known open bug** (see Test Report) — the photo-library attach path works; the in-chat camera-capture path does not currently open the device camera reliably on Android.
- MoonBase room state is in-memory only (not persisted across server restarts).
- Push notifications are not functional in the current build (missing Firebase configuration) — this affects notification delivery but not core in-app functionality.
- The finance/stokvel module's XRPL integration depends on live testnet connectivity; connection timeouts have been observed in this environment.

## 5. Audience

This document, together with the accompanying Test Case Document and Test Report, is intended for: engineering (regression baseline), QA (test case source of truth), and product/marketing (source of truth for what is *actually* live today, as distinct from what may be described as "coming soon" on public-facing materials).
