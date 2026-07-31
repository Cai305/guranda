# Product Requirements Document (PRD): MXit 2.0 - The African SuperApp

## 1. Product Vision
Create a lightweight, low-data, mobile-first SuperApp inspired by MXit, WeChat, Telegram, WhatsApp, Discord, and Grab. It aims to be Africa's leading ecosystem for communication, commerce, entertainment, gaming, and financial services.

## 2. Core Principles
- **Ultra-low data usage**: Optimized protocols for regions with expensive or constrained data.
- **Fast performance**: Native-like responsiveness on low-end Android devices and basic web browsers.
- **Offline-friendly**: Local caching and queued actions when disconnected.
- **AI-first**: Integrated generative AI for translation, moderation, and assistance.
- **Financial Inclusion**: Built-in Masheleni 2.0 XRPL wallet (user-selected custody model).
- **Extensible**: Mini-App and developer SDK ecosystem.

## 3. Core Modules & Features

### 3.1 Messaging Platform
- **1-on-1 Chat**: Text, voice notes, stickers, GIFs, disappearing messages.
- **Presence System**: Online/last seen status, custom badges.
- **AI Enhancements**: Smart replies, real-time message translation, auto-summaries.
- **Cross-Network**: Unified inbox bridging SMS, Email, and Business APIs.

### 3.2 MultiMX & Communities (Groups)
- **Scale**: Unlimited group sizes with role-based access (admin, mod, member).
- **Channels**: Text threads, voice channels, stage channels (live audio/video).
- **Tools**: Polls, announcements, events.

### 3.3 Chat Rooms
- **Public**: Regional, topical, and language-based rooms.
- **Private**: Invite-only, subscription-gated.
- **Safety**: AI toxicity detection, spam prevention, age protection.

### 3.4 Social Network & Media
- **Profiles**: Custom usernames, bios, avatars, social links, buddy lists.
- **Feed**: Text posts, photos, short-form video (stories).
- **Media**: AI image enhancement, tagging, and low-bandwidth cloud storage.

### 3.5 Gaming Ecosystem (MXit Arcade & MoonBase 2.0)
- **Casual Multiplayer**: Trivia, quizzes, card games, turn-based strategy.
- **MoonBase 2.0**: Space colony MMO with resource management and PvP.
- **Dev Ecosystem**: SDK for 3rd-party game publishing, leaderboards, and Moola payments.

### 3.6 Mini-App Ecosystem
- **Categories**: Commerce, Mobility, Food, Education, Gov Services, Healthcare.
- **Integration**: Seamless single-sign-on (SSO) and in-app payments.

### 3.7 Financial Services (Masheleni 2.0)
- **Asset**: XRPL-based stablecoin pegged 1:1 with the Rand.
- **Custody Options**: Users choose between self-custodial (private keys) or platform-custodial at registration.
- **Features**: P2P transfers, merchant QR payments, bill payments (electricity, water, TV), and savings pockets.

## 4. Rollout Strategy
- **Phase 1**: Messaging, contacts, groups, public chat rooms.
- **Phase 2**: Masheleni 2.0 Wallet, payments, basic mini-apps.
- **Phase 3**: Marketplace, Gaming ecosystem (Arcade + MoonBase).
- **Phase 4**: Gov services and advanced AI platform features.
- **Phase 5**: Open developer ecosystem and Pan-African expansion.

## 5. Non-Functional Requirements
- **Security**: End-to-end encryption for 1-on-1 chats, KYC compliance for the wallet.
- **Scalability**: Target architecture capable of 10M concurrent users.
- **Client Platforms**: Android (Kotlin/Compose), iOS (SwiftUI), Web (React), lightweight PWA.
