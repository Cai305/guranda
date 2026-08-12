# Guranda — Master Product Vision & Redesign Prompt

**Status:** Active north star. Supersedes/extends `01_PRD.md` and `11_Roadmap.md` where they conflict — those documents describe the "MXit 2.0" starting architecture; this document is the product direction Guranda is evolving toward. Do not treat this as permission to discard the existing application — see §43.

**Provenance:** Supplied verbatim by the product owner on 2026-08-12. Persisted here per its own instruction (§10: "Persist this product vision in the project's available memory/documentation/context so future AI agents do not reinterpret the product from scratch"). See `17_Product_Audit_And_Mapping.md` for the Phase 1/2 audit of the existing app against this vision, including flagged conflicts and open product decisions.

---

You are the principal product architect, UX designer, systems architect, and senior engineer responsible for evolving the existing Guranda application.

This is not a greenfield project.

The current Guranda application already contains features, screens, mini apps, navigation, backend logic, social functionality, entertainment, live streaming, profiles, accounts, wallet functionality, challenges, and other functionality.

Your job is to:

1. Inspect the existing application thoroughly.
2. Understand what has already been built.
3. Preserve existing functionality unless it conflicts with this vision.
4. Redesign, reorganize, connect, and enhance the existing experience.
5. Do not randomly remove existing features because they were not mentioned in this prompt.
6. Any existing feature not explicitly discussed here must be incorporated into this vision rather than deleted.
7. Before implementing major architectural changes, inspect the existing architecture and choose the least destructive path.
8. If you have access to project skills, documentation, design systems, coding standards, or relevant platform skills, retrieve and use them before implementing the redesign.
9. Treat this document as the single source of truth for the new Guranda experience.
10. Persist this product vision in the project's available memory/documentation/context so future AI agents do not reinterpret the product from scratch.

---

## 1. WHAT GURANDA IS

Guranda is not simply a social network.
It is not simply a finance application.
It is not simply an AI assistant.
It is not simply a marketplace.
It is not simply a collection of mini apps.

Guranda is an intelligent digital ecosystem.

The user has one identity and one ecosystem through which they can: communicate, create, discover, earn, spend, save, participate, build businesses, consume entertainment, play games, join challenges, livestream, use mini apps, manage their digital life, interact with AI, access financial services, discover opportunities, build reputation, develop achievements, grow their digital identity.

The entire ecosystem should feel connected. The user should never feel like they are jumping between unrelated applications.

## 2. THE MOST IMPORTANT PRINCIPLE

THE USER IS THE HERO.

AI is not supposed to replace the user. AI exists to make the user more capable. The user should feel: "I can do anything from here." The AI should feel like an intelligent partner working alongside the user. The user remains in control. The AI does the heavy lifting.

Example: the user says "I'm going to Cape Town tomorrow." Guranda's AI should understand the intent and potentially: check the user's calendar, understand the dates, search travel options, interact with the appropriate travel mini app, plan transport, find accommodation, create an itinerary, add relevant events, organize the trip, remind the user, coordinate other relevant actions. The user should not need to understand which mini app performs each task. The AI orchestrates the ecosystem.

## 3. AI IS THE CENTRE OF GURANDA

AI is the intelligence layer connecting the ecosystem. Do NOT force one fixed AI name onto the product. "Javas" was only an example. Users must be able to give their AI a personal name. Users should also be able to name their specialized AI assistants — e.g. Personal AI, Finance AI, Travel AI, Shopping AI, Business AI, Life AI (user chooses each name). These are not necessarily separate products — they are specialized AI capabilities working together.

The AI should be able to use tools and mini apps. The AI should understand the user's permissions and act within those permissions. The AI should be proactive when appropriate but must never make the user feel that they have lost control.

## 4. ONE ECOSYSTEM

One identity. One account. One profile. One ecosystem. One intelligent layer. Many experiences.

Mini apps should not feel like separate applications — they should feel like capabilities inside Guranda. The user should be able to move between experiences without repeatedly registering, logging in, or creating separate identities.

## 5. FINANCIAL EXPERIENCE

The underlying financial infrastructure should be completely abstracted from the user. Users should think in Rands. They should not need to understand XRP, XRPL, blockchain wallets, tokens, ledgers, or cryptocurrency infrastructure. If XRPL is used underneath the system, it remains invisible. The UI should communicate: Rand balance, send money, receive money, deposit, withdraw, transactions, payments, earnings.

The infrastructure should be replaceable/configurable without redesigning the user experience. Production financial integrations must be implemented through legally compliant and appropriately licensed partners and infrastructure. Do not design the system around avoiding financial regulation — design it so regulated financial responsibilities can be handled by the appropriate licensed entities and integrations. PayShap and banking integrations should be treated as infrastructure integrations rather than user-facing concepts. Use environment-driven configuration so dev/staging/testing/production financial integrations can be switched safely. Never expose internal blockchain infrastructure to normal users.

## 6. PROFILE — THE DIGITAL HEADQUARTERS

The profile is not merely a picture, username, bio, and follower count. The profile is the user's DIGITAL HEADQUARTERS. The user should be able to spend significant time here. Entering their profile should feel like: "This is my world." "This is what I've built." "This is how I'm progressing." "I'm in control." "I'm becoming something."

AI can power things in the background, but the profile should make the user feel like the super user.

## 7. USERNAME = DIGITAL IDENTITY

The username should feel more like a digital identity than a simple @handle — connected to profile, reputation, followers, subscribers, audience, achievements, badges, leagues, creator identity, business identity, content, social presence, marketplace presence, and potentially commercial value.

Architect the system so usernames can potentially become valuable digital assets. Carefully separate account identity/history from username ownership/assignment — a username may become transferable/reassignable in the future, but historical reputation, achievements, trust records, and authentic activity must not simply transfer with it. Design this carefully so the system does not allow reputation manipulation.

## 8. PROFILE REPUTATION

Reputation should tell a story, not be four meaningless numbers. The user should immediately understand: how they are doing, whether they are growing, whether they have been active, whether they are helping others, whether their community trusts them, whether they are progressing, whether they are improving or declining.

The metrics should create emotion: "Damn, I improved this week." / "I didn't really do much this week." / "I'm almost at the next level." / "I need to complete this challenge." The numbers must create motivation rather than merely display analytics.

## 9. FOUR PROFILE PILLARS

**Reputation** — trust, reliability, positive interactions, contribution, community confidence.
**Growth** — personal/account progression over time.
**Rank / Nano** — progression through Guranda's ecosystem, represented as understandable ranks/levels/leagues; do not expose XRPL concepts here.
**Impact** — value the user creates for others/the ecosystem: people helped, content contributions, successful challenges, community participation, creator activity, business activity, positive engagement, meaningful contributions.

Each pillar should tell a story and provide actionable next steps, e.g. "You're 240 points away from the next league." / "Your growth is up this week." / "You helped 12 more people than last week." / "Complete one more challenge to unlock your next achievement."

## 10. PERSONAL COMPANION / PET

Explore a visual companion/pet that reflects account growth, evolving based on meaningful activity (challenges, achievements, positive activity, creation, learning, contribution, progression, consistency) — not mindless screen time. The companion becomes an emotional representation of the user's journey; the user should feel attached to its development.

## 11. LEAGUES AND RANKS

A meaningful league/rank system for participation and progression within Guranda. Ranks should have visual identity, progression, requirements, achievements, potentially benefits, and social recognition. Do not expose the underlying XRPL implementation — the user sees only Rank → League → Progress → Achievements. Should create the feeling "I'm climbing." Avoid making this purely about spending money — reward meaningful participation and contribution.

## 12. BADGES ARE OWNED ACHIEVEMENTS

Badges must not feel like random stickers — the user should feel "I own this." Earned through meaningful achievements: completing difficult challenges, winning tournaments, reaching important milestones, being an early member, creator/business/community achievements, exceptional contributions.

Badges should have scarcity — some with a fixed maximum supply (e.g. only 10,000 Founder badges; only 500 Champion badges). Badges can potentially become transferable assets, but preserve the distinction between achievement history and ownership of a collectible badge — if a badge is sold/transferred, the historical achievement should not falsely become the buyer's achievement.

Badges should potentially provide meaningful utility: recognition, access, community membership, special experiences, reduced fees, exclusive challenges, creator/business opportunities, status, event access. Do not create badges simply for decoration.

## 13. HOME

Home answers: "What is happening with me?" It surfaces the most relevant things for the user. AI can personalize Home based on goals, activity, relationships, calendar, challenges, content, business, finances, upcoming events, opportunities. Home should not become an overwhelming analytics dashboard.

## 14. EXPLORE

Explore answers: "What is possible for me?" Contains and connects: Discovery, Social, Trending, Challenges, live experiences, creators, people, communities, mini apps, opportunities, products, events. Dynamic and personalized.

## 15. SOCIAL

Guranda's open conversation space — the feeling of an open public town square. Users discuss politics, sports, technology, entertainment, culture, anime, games, business, life, current events, opinions, anything else permitted by community guidelines. Users post, comment, reply, follow, share, mention/tag people, participate in discussions, interact with businesses and creators.

## 16. TRENDING

The pulse of Guranda — "What is happening right now?" Dynamic, not fixed categories. Surfaces posts, discussions, creators, challenges, live streams, games, products, events, hashtags, mini apps, cultural moments that are currently gaining momentum. Challenges can become trends — a challenge is not isolated from trending; if it gains momentum it becomes part of the trending ecosystem.

Social = conversations. Trending = momentum.

## 17. DISCOVERY

Must feel different from Social and Trending — for intentional viewing, focused on longer-form creator content: podcasts, game reviews, reaction videos, documentaries, educational content, travel content, deep discussions, tutorials, long-form entertainment, music videos where legally permitted, other deliberate-viewing content.

Avoid turning Discovery into another endless short-video feed. The feeling should be "I came here because I want to watch something," not "I'm endlessly scrolling." ~1 minute or longer is a useful guideline for long-form, but prioritize content intent/experience over an arbitrary duration rule.

## 18. ENTERTAINMENT MINI APP

The existing Entertainment mini app must remain — do not recreate it unnecessarily. Integrate it into the broader ecosystem. Can contain licensed media: movies, series, music, other premium entertainment experiences. Do not treat licensed content casually — the system must be designed around proper licensing and rights management.

## 19. MUSIC AS AN ECOSYSTEM ASSET

Where licensing permits, music can flow throughout Guranda, not just inside Entertainment. A creator uploads music; another user can use it in a status, story, challenge, video, live experience, or other supported content. The system should track usage/attribution; creators/rightsholders should receive appropriate revenue/royalties per the applicable licensing/monetization model. Content flows naturally across Guranda, but creators are always credited and rewarded. Build the architecture so content ownership, licensing, attribution, and revenue tracking can be handled properly.

## 20. LIVE STREAMING — NOT ONE GENERIC EXPERIENCE

Do NOT make one generic livestream interface for every type of live. Guranda Live must adapt to what the user is doing.

- **Talk/Social Live**: audience, speaker queue (host-configurable, ~10 in queue as a guideline), moderators, reactions, comments, multiple speakers.
- **Chess/Game Live**: viewers see the board, both players, game state, moves, timers, relevant game info, optional player cameras — not a generic feed of two people sitting there. The chess mini app stays active for the players; the livestream is a spectator experience of the game.
- **Shopping Live**: products, product info, prices, offers, shopping interactions, host if necessary — seller doesn't necessarily need to appear on camera.
- **Other mini-app experiences**: the same principle applies — chess → spectator view, drawing → live canvas, game → spectator interface, shopping → product showcase, teaching → lesson interface, music → performance interface.

"Guranda doesn't stream screens. It streams experiences." — core principle. Do not simply broadcast the user's screen; broadcast the experience itself.

## 21. MINI APPS + LIVE

Mini apps should be deeply integrated into Guranda Live — a user can use a mini app while remaining inside the Guranda live experience, and the viewer gets a purpose-built representation of the mini app rather than a raw screen recording. This is a new category: interactive live experiences. The architecture should allow future mini apps to declare their own live presentation configuration.

## 22. CONTENT SHOULD FLOW

Do not build isolated silos. Content can travel through different Guranda experiences: Music → Story → Challenge → Trending → Discovery; a Challenge → Trending → Live → Social; a Product → Marketplace → Live → Social → Creator content; a Mini App → Live → Discovery → Social. The ecosystem should feel connected.

## 23. BUSINESS ACCOUNTS — PHASE 2

Do not create a completely separate product for businesses — Guranda remains one ecosystem, but the interface adapts based on the account's purpose. Future account experiences: personal, creator, merchant, small business, business, enterprise — sharing the same core identity and ecosystem.

Businesses can still post on Social, comment, reply, go Live, join Lives, participate in/create challenges, interact with customers, receive payments, sell products, use mini apps, build followers/subscribers — but their profile/dashboard prioritizes business intelligence: notifications, mentions, customer interactions, customer satisfaction, trends, campaign performance, challenge performance, participation, products, sales, revenue, payments, product performance, audience growth, engagement, business reputation.

The AI should summarize this information, e.g. "Your chicken promotion is performing 23% better than last week." / "Customer sentiment improved this week." / "Your challenge has reached 42,000 participants." / "This product is generating the most engagement." The business should feel like it has a powerful command centre without needing a completely different application.

## 24. CREATOR EXPERIENCE

Same ecosystem, tools focused on content, audience, followers, subscribers, earnings, royalties, challenges, live streaming, content performance, reputation, badges, discovery, trends. AI helps answer: "What is working?" "What should I create next?" "How much am I earning?" "Where is my audience coming from?"

## 25. MERCHANT EXPERIENCE

A small independent seller should not be forced into enterprise complexity. Prioritize: products, sales, customers, payments, marketplace, live selling, reputation, messages, orders. Do not overwhelm small sellers with enterprise analytics.

## 26. KIDS / MINORS

Treat the under-16/under-18 experience as a future dedicated Guranda product/application (Guranda Kids) — stricter safety, restricted functionality, age-appropriate discovery, appropriate communication, stronger parental/safety controls. Do not mix into the full adult experience. Do not let this complicate the current redesign — document as a future product direction only.

## 27. PROFILE SHOULD CONNECT EVERYTHING

Potential profile areas: username, identity, bio, profile media, reputation, growth, rank/league, impact, companion, badges, achievements, followers, subscribers, content, products, business, challenges, live history, creator performance, wallet/earning indicators where appropriate, AI, activity, interests, communities. Do not display everything at once — create hierarchy. The profile should feel powerful without feeling cluttered.

## 28. PROFILE EMOTIONAL DESIGN

Every major profile component should answer one of: Who am I? What have I achieved? How am I growing? What have I built? What value am I creating? Where am I going next? The user should leave the profile motivated and want to return.

## 29. AI SHOULD NOT DESTROY THE HUMAN EXPERIENCE

Do not turn every screen into an AI chatbot. AI should be deeply integrated but intelligently invisible when appropriate. The user should feel "Guranda understands me," not "Everything is a chatbot." The profile is a great example — AI can power insights and recommendations, but the user should see themselves, not the AI.

## 30. EXISTING FEATURES

Before modifying the application: AUDIT EVERYTHING — screens, components, navigation, APIs, services, mini apps, authentication, profiles, social, chat, voice, video, live, challenges, discovery, trending, entertainment, marketplace, payments, wallet, notifications, creator functionality, business functionality, settings, search, events, tournaments, funding, communities, content, recommendations, AI, any other existing functionality.

Do NOT remove an existing feature simply because it was not explicitly mentioned in this document. Instead ask: "Where does this feature belong in the Guranda ecosystem?" Then integrate it into the appropriate experience.

## 31. DESIGN LANGUAGE

The entire application should feel like one ecosystem: consistent navigation, cards, typography, spacing, motion, interaction patterns, AI behavior, identity, accessibility, responsive behavior. But do not make every screen identical — the experience should adapt to the user's intent.

## 32. USER JOURNEY

Design the journey from the beginning, not individual widgets first. Start with: Who is the user? What does the user want? What does Guranda understand about the user? What can the AI do? What can the user do? What does the profile represent? What can the user discover? What can the user create? What can the user earn? What can the user build? How does the ecosystem grow with the user? Then design the screens.

## 33. UX RULE

Every major screen should answer: "Why would the user come here?" "What can they accomplish here?" "What should they feel when they leave?" Avoid screens that exist simply because other applications have them.

## 34. GURANDA BRAND PRINCIPLES

- THE USER IS THE HERO. AI is the amplifier.
- YOUR PROFILE IS YOUR DIGITAL HEADQUARTERS — identity, progress, achievements.
- AI IS THE INTELLIGENCE LAYER — connects the ecosystem, helps users accomplish things.
- EXPLORE IS THE OPPORTUNITY ENGINE — shows users what is possible.
- SOCIAL IS THE CONVERSATION SPACE — people talk freely and connect.
- TRENDING IS THE PULSE — shows what is gaining momentum.
- DISCOVERY IS FOR STORIES WORTH YOUR TIME — long-form and intentional content.
- ENTERTAINMENT IS THE MEDIA EXPERIENCE — licensed movies, music, other entertainment.
- CONTENT FLOWS — content can move naturally across the ecosystem.
- CREATORS ARE REWARDED — attribution and monetization follow content appropriately.
- GURANDA DOESN'T STREAM SCREENS. GURANDA STREAMS EXPERIENCES.
- ONE ECOSYSTEM. MANY EXPERIENCES — the system adapts without fragmenting the user experience.

## 35. PRODUCT PHILOSOPHY

Guranda should make the user feel like a creator, builder, explorer, entrepreneur, participant, community member, super user. The AI should make those things easier. Never make the user feel like they are merely consuming Guranda — they should feel like they are building their own world inside Guranda.

## 36. TECHNICAL IMPLEMENTATION

Before changing code: inspect the existing repository, architecture, navigation, components, state management, backend integrations, database structure, mini app architecture, authentication, financial integrations, existing AI integrations, current design system. Identify reusable components, technical debt, broken/incomplete functionality, duplicate implementations.

Do not rewrite functioning infrastructure unnecessarily. Prefer incremental architectural evolution where possible.

## 37. PRODUCTION READINESS

This redesign must not be a visual prototype. Everything should be built with production in mind: proper error handling, loading states, empty states, offline states where appropriate, authentication, authorization, permissions, secure API handling, environment configuration, observability, analytics, accessibility, performance, scalability, data validation, rate limiting where appropriate, secure financial integrations, auditability, privacy, moderation, content reporting, fraud prevention, abuse prevention.

## 38. PRODUCTION ACCOUNT SWITCHING

Create a safe environment/configuration architecture to switch between development, staging, production — able to test different account types and flows. Production must use the correct real integrations without requiring a rewrite. Financial integrations must use real, authorized production credentials/configuration only in production environments. Never hardcode secrets.

## 39. DO NOT FAKE FUNCTIONALITY

Do not create fake analytics, fake payments, fake balances, fake users, fake transactions, fake AI actions, or fake production integrations and present them as real. If something is not yet connected, clearly isolate it behind a proper integration boundary. Create realistic development mocks only where necessary and clearly distinguish them from production.

## 40. AI IMPLEMENTATION RULE

The AI should understand Guranda's ecosystem — reason about users, profiles, relationships, content, challenges, trends, live experiences, mini apps, products, payments, calendar, travel, entertainment, business, creator activity, reputation, growth, rank, badges. The AI should use tools rather than pretending it performed actions. For actions that require confirmation, obtain appropriate user confirmation.

## 41. FINAL UX TEST

When this redesign is complete, test the experience as a real Guranda user would:
Profile: "Does this make me want to spend time here?"
AI: "Does this make me feel more powerful?"
Social: "Can I freely participate?"
Trending: "Can I immediately understand what's happening?"
Discovery: "Does this feel intentional rather than another scrolling feed?"
Live: "Does the experience adapt to what I'm doing?"
Mini apps: "Do they feel like capabilities of Guranda rather than separate apps?"
Business: "Can a business understand how it is performing?"
Creator: "Can a creator understand how they are growing and earning?"
Reputation: "Does this tell me a story?"
Rank: "Do I want to progress?"
Badges: "Do these feel meaningful and scarce?"
Username: "Does this feel like my digital identity?"
Overall: "Do I feel like the super user?"
If the answer is no, redesign it.

## 42. EXECUTION ORDER

**Phase 1 — Audit**: Understand the entire existing Guranda application.
**Phase 2 — Product Architecture**: Map all existing functionality into the Guranda ecosystem.
**Phase 3 — Design System**: Establish the common visual and interaction language.
**Phase 4 — Core Experience**: Redesign navigation, Home, AI interaction, global experience.
**Phase 5 — Profile**: Build the Digital Headquarters experience.
**Phase 6 — Explore**: Build Social, Trending, Discovery as distinct but connected experiences.
**Phase 7 — Live**: Implement adaptive live experiences and mini-app live integration.
**Phase 8 — Content**: Connect content, entertainment, music, attribution, creator monetization.
**Phase 9 — Ranks/Badges/Reputation**: Implement meaningful progression and identity systems.
**Phase 10 — Business/Creator Adaptation**: Adaptive account experiences without a separate ecosystem.
**Phase 11 — Finance**: Connect production-ready compliant financial infrastructure.
**Phase 12 — Production Hardening**: Security, performance, testing, observability, accessibility, deployment.

## 43. IMPORTANT FINAL INSTRUCTION

Do not interpret this prompt as permission to throw away the existing Guranda application. The existing application is the foundation. Preserve what works. Improve what is weak. Connect what is disconnected. Redesign what does not fit the vision. Complete what is incomplete.

If a feature already exists but was not mentioned in this document, do not delete it — ask "How does this feature fit into the Guranda vision?" and adapt it accordingly. If a feature conflicts with this vision, explain the conflict before making destructive changes. If additional project skills or documentation are needed, retrieve and use them. Do not hallucinate existing functionality — inspect the actual application first. Do not assume. Do not rebuild something that already works simply because you cannot immediately find it.

## FINAL GURANDA NORTH STAR

Build Guranda so that the user feels: "This is my world." The AI helps me operate it. My profile shows me who I am becoming. My reputation shows the trust I have built. My rank shows how far I have progressed. My badges show what I have achieved. My username represents my digital identity. Explore shows me what is possible. Social gives me a voice. Trending shows me what is moving. Discovery gives me things worth my time. Mini apps give me capabilities. Live lets me share experiences. My business can grow here. My content can earn here. My money can move here. And AI connects everything together.

GURANDA DOESN'T STREAM SCREENS. GURANDA STREAMS EXPERIENCES.
THE USER IS THE HERO. AI IS THE AMPLIFIER.
ONE ECOSYSTEM. MANY EXPERIENCES.
