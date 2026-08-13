# Guranda — Master Engine Architecture & Integration Prompt

**Status:** Active north star for the AI/orchestration/engine layer specifically. Companion to `16_Product_Vision_Master.md` (which covers product/UX — Profile, Social, Trending, Live, badges) — this document covers the underlying intelligence/orchestration architecture: how the AI understands intent, how capabilities get executed, how money moves, how widgets work.

**Provenance:** Supplied verbatim by the product owner on 2026-08-13. Persisted here per the same instruction `16_Product_Vision_Master.md` established (§10 there: "Persist this product vision in the project's available memory/documentation/context so future AI agents do not reinterpret the product from scratch") — this document deserves identical treatment. See `19_AI_Engine_Audit_And_Design.md` for the Phase 1/2 audit of the existing app against this document, including what already exists, what's reusable, and the proposed target design.

---

## IMPORTANT CONTEXT

We are not starting a new project.

Guranda is an existing application with existing code, mini apps, widgets, systems, APIs, UI, and functionality.

Your first responsibility is to understand what already exists before changing anything.

Do NOT rebuild existing functionality simply because you would architect it differently.

Inspect the existing codebase and determine:

* what already exists
* what already works
* what is partially implemented
* what can be reused
* what needs refactoring
* what needs to be connected
* what is missing
* where the current architecture creates limitations

The goal is to evolve Guranda into the architecture described below while preserving working functionality.

Do not throw away existing work unless there is a strong architectural reason.

---

## 1. WHAT GURANDA IS

Guranda is not intended to be another traditional social-media or chatbot application.

Guranda is intended to become an AI-powered operating system for interacting with the digital and physical world.

The user should not feel:

"I opened a chatbot and I'm asking an AI questions."

The user should feel:

"I have an intelligent companion inside my world that understands what I'm doing and helps me get things done."

The central design principle is:

TALK LESS. DO MORE.

The AI should not constantly explain what it is doing.

It should understand intent and execute actions through the Guranda system.

---

## 2. AI IDENTITY

There is an important distinction:

Javas is the name of the AI associated with the creator's Guranda experience.

Javas is NOT the generic name of the AI system.

Every Guranda user should eventually be able to give their own AI companion a name.

For example:

* User A → Javas
* User B → Nova
* User C → Alex
* User D → their own chosen name

The underlying intelligence and architecture can be shared, but the AI companion identity belongs to the user.

Therefore, do not hard-code "Javas" throughout the architecture as though it is the universal AI name.

Instead, support concepts such as:

AI Companion
AI Identity
AI Name
AI Personality
AI Preferences
AI Memory
AI User Context

The architecture should support a user-specific AI identity from the beginning.

---

## 3. THE CORE IDEA

Guranda should not be built around:

AI → Chat → Answer

Instead, it should work more like:

User Intent → AI Understanding → Orchestration → Capability → Engine → Widget/UI → Action → Result

The AI understands the user.

The system executes.

The UI reflects what is happening.

The user should not need to understand the architecture.

---

## 4. THE MAJOR ARCHITECTURAL COMPONENTS

The target architecture should contain:

1. AI Intelligence Layer
2. Orchestrator
3. Interaction Engine
4. Financial Engine
5. Capability Registry / Capability Engine
6. Widget System
7. Mini Apps
8. Memory & Context System
9. Event System
10. External/Web Integration Layer
11. Device/Physical World Integration Layer

These should be designed as one connected Guranda platform, not independent applications.

---

## 5. AI INTELLIGENCE LAYER

The AI should be responsible primarily for understanding.

It should:

* understand natural language
* understand voice
* understand intent
* understand context
* reason about ambiguity
* understand user preferences
* understand memory
* decide what the user is trying to accomplish
* communicate naturally
* determine when clarification is genuinely necessary

The AI should NOT be responsible for implementing every business rule.

It should NOT manually manage every widget.

It should NOT repeatedly rediscover Guranda capabilities.

It should NOT directly contain payment implementation.

It should NOT become the entire application.

The AI should use the system's structured capabilities, state, events, and engines.

---

## 6. THE ORCHESTRATOR

Create a thin orchestration layer.

This is not another giant engine.

Think of it as a conductor.

Its job is to coordinate the existing and future engines.

For example:

User
 ↓
AI Intelligence
 ↓
Orchestrator
 ↓
Capability Registry
 ↓
Correct Mini App / Engine
 ↓
Widget / Action
 ↓
Result
 ↓
AI + UI

The Orchestrator should:

* receive structured intent
* inspect current context
* identify the required capability
* select the appropriate engine
* coordinate multi-step workflows
* pass information between engines
* maintain workflow continuity
* listen for relevant events
* return results to the interaction layer

It should NOT contain the business logic of every engine.

---

## 7. INTERACTION ENGINE

The Interaction Engine is one of the most important parts of Guranda.

Its purpose is to make Guranda feel like an intelligent operating system rather than a chatbot.

It manages the relationship between:

* voice
* text
* touch
* widgets
* screen state
* conversation state
* mini apps
* user actions
* context
* memory
* events
* location
* proactive interactions

The Interaction Engine must understand:

What is the user saying?

What is currently on screen?

What widget is active?

What is selected?

What actions are available?

What did the user just do?

What does "this", "that", "next", "previous", "it", or "the second one" refer to?

---

## 8. VOICE + UI MUST WORK TOGETHER

Voice should NOT feel like a separate chatbot mode.

A user should be able to hold the voice control and say:

"Find me the cheapest MacBook M1."

A shopping widget appears.

Then:

"Show me the second one."

The second product becomes selected.

Then:

"Open the pictures."

The image viewer opens.

Then:

"Next."

The next image appears.

Then:

"Previous."

The previous image appears.

Then:

"Compare it with the first one."

The system opens the comparison experience.

The user can switch freely between:

* voice
* touch
* text

without losing context.

Voice and UI are not separate experiences.

They are two ways of controlling the same stateful system.

---

## 9. WIDGETS ARE INTERACTIVE SYSTEM COMPONENTS

Widgets are not just visual cards.

Every widget must expose an Interaction Contract.

A widget should declare:

Identity

* widget type
* version
* purpose

State

* current data
* selected item
* current page
* current image
* current mode
* loading state
* error state

Actions

For example:

* next
* previous
* select
* compare
* filter
* sort
* buy
* save
* share
* expand
* close
* play
* pause
* zoom
* navigate

Voice interactions

The widget should tell the Interaction Engine what natural actions it supports.

For example:

Shopping:

"next"
"previous"
"show the second one"
"compare these"
"show cheaper ones"
"open pictures"
"buy this"

Map:

"zoom in"
"zoom out"
"show me the route"
"take me home"
"drop a pin"

Video:

"pause"
"continue"
"rewind"
"next"

The AI should translate natural language into these structured widget actions.

---

## 10. MINI APPS ARE CAPABILITIES

Guranda already contains mini apps.

Do NOT assume that mini apps need to be rebuilt.

Instead, integrate the existing mini apps into the new architecture.

A mini app is a deep capability experience.

It should be possible to interact with its capabilities from anywhere in Guranda.

For example, the user does NOT need to manually open the car mini app if they are already talking to someone about cars.

The car capability can appear inside the current context.

Likewise:

* events
* jobs
* shopping
* travel
* payments
* maps
* media
* services
* fact checking

can appear where they are useful.

The user should not have to think:

"Which mini app do I open?"

They should think:

"I need this."

And Guranda should bring the capability to them.

---

## 11. CONTEXT PRESERVATION

This is a fundamental Guranda principle.

Capabilities should come to the user.

The user should not have to leave their current context.

Example:

Two people are talking about cars.

A car capability can appear directly inside the conversation.

The user can:

* search
* view
* compare
* select
* share
* purchase

without losing the conversation.

The same principle applies to every capability.

Call this:

CONTEXTUAL CAPABILITY INJECTION

---

## 12. CAPABILITY REGISTRY / CAPABILITY ENGINE

Guranda needs a capability registry.

This is important for:

* speed
* consistency
* scalability
* reduced AI reasoning
* reduced token usage
* lower operating cost

The AI should not constantly ask itself:

"Does Guranda have something that can do this?"

The registry should already know.

It should describe:

* capability name
* capability owner
* mini app
* engine
* actions
* inputs
* outputs
* widgets
* permissions
* authentication
* events
* dependencies
* external services

Example:

Capability:
Book a ride
Actions:
- get_current_location
- choose_destination
- estimate_price
- request_ride
- cancel_ride
Required inputs:
- pickup
- destination
- passenger
- payment method

The AI can then simply request:

"I need the ride capability."

The system knows how to execute it.

---

## 13. EXTERNAL WORLD FALLBACK

Guranda must NOT be limited to its own mini apps.

The system should use a capability hierarchy:

1. Guranda capabilities

First check what Guranda already provides.

2. Connected external services

Then check available external integrations.

3. Web

If the information or capability cannot be found internally, search the web.

The AI should transparently communicate the transition when appropriate:

"I couldn't find it inside Guranda, so I'm checking the web."

But the experience should remain inside Guranda.

External information should be:

1. retrieved
2. interpreted
3. normalized
4. converted into Guranda-compatible data
5. displayed using Guranda widgets
6. made interactive using the same Interaction Contracts

The user should not feel that they left Guranda.

---

## 14. FINANCIAL ENGINE

The Financial Engine is completely separate from the Interaction Engine.

Its responsibility is money.

It should handle concepts such as:

* Guranda balance
* deposits
* withdrawals
* sending
* receiving
* payments
* refunds
* payment requests
* settlement
* transaction history
* payment routing

Potential payment rails can include:

* XRPL
* PayShap
* cards
* bank APIs
* future payment networks

The user should not need to know which rail was used.

The user simply says:

"Pay this."

The Financial Engine decides how the transaction should be executed.

---

## 15. XRPL

XRPL can be one of Guranda's financial rails.

It is particularly interesting for fast, low-cost transactions and microtransactions.

However:

XRPL must remain an implementation detail of the Financial Engine.

Do not expose payment infrastructure unnecessarily to users.

The user thinks:

"Send 10 cents."

Not:

"Send XRP."

The architecture must also allow additional payment rails to be added later without changing the user experience.

---

## 16. MEMORY

Memory must not simply be a database of random statements.

The system should distinguish:

Memories

Important information worth remembering.

Tasks

Things the user wants done.

Long-running tasks

Tasks that continue over time.

Routines

Repeated behavior.

Goals

Long-term objectives.

Preferences

User preferences.

Relationships

People, places, organizations, and meaningful connections.

Example:

User says:

"I'm looking for an M1 MacBook."

Guranda may remember that task.

Later:

"Hey, how did it go with that laptop?"

The assistant can follow up naturally if appropriate.

Memory should be:

* contextual
* useful
* editable
* transparent
* user-controlled

Provide a "What my AI knows" experience where users can inspect and manage important stored context.

---

## 17. USER-SPECIFIC AI MEMORY

Because every user can have their own AI identity, memory should belong to the relationship between:

User
+
Their AI Companion
+
Their Guranda Context

The system should not treat every user as though they share one generic AI personality.

The underlying platform can be shared.

The relationship should be personal.

---

## 18. LOCATION INTELLIGENCE

With explicit permission, Guranda can use location context.

Potential capabilities:

* current location
* home
* work
* saved locations
* nearby events
* nearby services
* transportation
* travel context

For example:

The user says:

"Call me a ride home."

If Guranda knows the current location and the user's saved home location, it should not unnecessarily ask:

"Where are you?"

It already knows the pickup location.

It should use:

Current location → pickup
Saved home location → destination

If the user is somewhere unexpected, Guranda can clarify.

Location should feel helpful rather than creepy.

Users must always be able to:

* view
* edit
* disable
* delete
* override

location assumptions.

---

## 19. ROUTINES AND PHYSICAL WORLD

The long-term goal is for Guranda to interact with physical devices.

For example:

A user's morning routine might eventually involve:

04:00 → turn on geyser
05:00 → alarm
05:30 → morning routine
05:45 → transportation check
05:50 → ride request

The user could say:

"Give me five more minutes."

Guranda should understand the routine and adjust the appropriate action.

This creates a bridge between the digital Guranda world and physical devices.

---

## 20. EVENT SYSTEM

Guranda already has an existing Event Mini App.

It supports concepts such as:

* creating events
* discovering events
* events nearby
* searching
* filtering
* joining
* ticket sales
* ticket verification
* scanning
* payments
* event posters
* image creation/editing
* event management

Do NOT rebuild this from scratch.

Instead, make the existing Event Mini App compatible with the new architecture.

The Event Mini App remains the deep experience.

The Event capability becomes available throughout Guranda.

Example:

User:

"What's happening around me this weekend?"

The Event capability can return an Event Widget directly.

The user should not need to manually open the Event Mini App.

---

## 21. AMBIENT CAPABILITIES

Capabilities should sometimes appear because the context suggests they may help.

Example:

During a live discussion someone says:

"Who is the better rapper?"

Guranda may display:

Fact Check Available

This should be optional.

The user can:

* ignore it
* open it
* ask the AI to explain it
* listen to it

The capability should not interrupt the main experience.

Principle:

CAPABILITIES ARE AMBIENT, NOT INTRUSIVE.

---

## 22. EVENT-DRIVEN ARCHITECTURE

Events are fundamental to the architecture.

Use structured events to connect the system.

Examples:

USER_SPOKE
USER_MESSAGE_RECEIVED
WIDGET_OPENED
WIDGET_UPDATED
WIDGET_ACTION_REQUESTED
USER_SELECTED
CAPABILITY_REQUESTED
TASK_CREATED
TASK_COMPLETED
TASK_FAILED
LOCATION_CHANGED
MEMORY_CREATED
MEMORY_UPDATED
PAYMENT_REQUESTED
PAYMENT_COMPLETED
EVENT_CREATED
EVENT_JOINED
EVENT_STARTED
DEVICE_COMMAND_REQUESTED
DEVICE_COMMAND_COMPLETED

Use events and structured state wherever possible instead of asking an AI model to reconstruct everything repeatedly.

This improves:

* speed
* reliability
* cost
* observability
* automation
* context

---

## 23. PERFORMANCE AND TOKEN COST

One of the reasons for this architecture is to reduce unnecessary AI work.

Do not use an AI model for deterministic information already available to the system.

For example:

Do not ask AI:

"What can this widget do?"

The widget contract already knows.

Do not ask AI:

"What product is selected?"

The widget state knows.

Do not ask AI:

"What payment methods are available?"

The Financial Engine knows.

Do not ask AI:

"Which mini app handles events?"

The Capability Registry knows.

Use AI for:

* understanding
* reasoning
* natural language
* ambiguity
* personalization
* complex decisions

Use engines and structured systems for:

* execution
* state
* routing
* validation
* deterministic logic

This is critical for keeping Guranda fast and affordable.

---

## 24. ENGINE BOUNDARIES

Maintain clear boundaries.

AI

Understands the user.

Orchestrator

Coordinates workflows.

Interaction Engine

Manages interaction and UI state.

Financial Engine

Manages money.

Capability Engine

Knows what Guranda can do.

Mini Apps

Provide deep domain experiences.

Widgets

Provide dynamic interfaces.

Event System

Connects changes across the platform.

Memory System

Maintains useful continuity.

No component should become responsible for everything.

---

## 25. THREE IMPLEMENTATION PHASES

We want to build this as three major connected phases.

However, the entire architecture must be designed with all three phases in mind from the beginning.

Do not build Phase 1 in a way that makes Phase 2 or Phase 3 difficult.

PHASE 1 — INTERACTION ENGINE

Build/refactor:

* Interaction Engine
* Orchestrator foundation
* widget framework
* widget Interaction Contracts
* voice integration
* touch integration
* shared UI state
* context management
* event foundation
* Capability Registry foundation
* mini app integration
* external/web fallback
* external result normalization
* location context foundation
* memory integration foundation

Primary goal:

Make Guranda feel fundamentally different from a chatbot.

---

PHASE 2 — FINANCIAL ENGINE

Build/refactor:

* Guranda balance abstraction
* payments
* receiving
* sending
* deposits
* withdrawals
* refunds
* payment routing
* XRPL integration
* bank integrations
* PayShap
* cards
* financial events
* security
* auditability
* compliance architecture

Primary goal:

Make money movement feel like a native part of Guranda without exposing unnecessary financial complexity.

---

PHASE 3 — CAPABILITY ENGINE / PLATFORM

Expand the Capability Registry into a complete capability platform.

Every capability should expose:

* identity
* owner
* actions
* inputs
* outputs
* widgets
* interaction contracts
* voice interactions
* events
* permissions
* dependencies
* authentication
* integrations

Primary goal:

Make Guranda extensible so new mini apps, services, devices, and external capabilities can plug into the same system.

---

## 26. ALL THREE PHASES MUST CONNECT

This is extremely important.

Do NOT build:

Interaction Engine → finished

then later:

Financial Engine → bolt-on

then later:

Capability Engine → another bolt-on

Instead design:

```
                    AI COMPANION
                         │
                         ▼
                   ORCHESTRATOR
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
   INTERACTION       FINANCIAL      CAPABILITY
     ENGINE           ENGINE          ENGINE
          │              │              │
          └──────────────┼──────────────┘
                         │
                         ▼
                 EVENT / STATE LAYER
                         │
                         ▼
              MINI APPS / WIDGETS /
             EXTERNAL WORLD / DEVICES
```

The exact implementation can differ after inspecting the existing project.

The important requirement is that the architecture remains modular and connected.

---

## 27. EXISTING PROJECT REQUIREMENT

Before implementing anything:

STEP 1

Inspect the existing Guranda project.

STEP 2

Map the existing architecture.

STEP 3

Identify existing:

* AI system
* chat
* voice
* widgets
* mini apps
* event system
* Event Mini App
* wallet
* payments
* XRPL integration
* APIs
* state management
* authentication
* user system
* location functionality
* memory functionality
* external/web search
* existing automation

STEP 4

Determine what can be reused.

STEP 5

Determine what needs refactoring.

STEP 6

Determine what is missing.

STEP 7

Create the target architecture.

STEP 8

Create the migration plan.

Only then begin implementation.

---

## 28. DO NOT BREAK EXISTING FUNCTIONALITY

Existing functionality is valuable.

Before changing a system:

* understand it
* document it
* identify dependencies
* create tests where necessary
* preserve behavior unless intentionally changing it

Do not rewrite working systems simply to make the code look cleaner.

Prefer:

integrate → refactor → improve

over:

delete → rebuild

unless the existing implementation fundamentally prevents the target architecture.

---

## 29. WHAT NOT TO BUILD

Do NOT build another generic chatbot.

Do NOT make chat the primary interface.

Do NOT force users to navigate through mini apps.

Do NOT make every action require an LLM call.

Do NOT hard-code every widget's behavior into the AI.

Do NOT hard-code payment logic into mini apps.

Do NOT make every mini app an isolated ecosystem.

Do NOT create unnecessary engines.

Do NOT duplicate existing Guranda functionality.

Do NOT expose technical complexity to users unless necessary.

---

## 30. WHAT GURANDA SHOULD FEEL LIKE

The user should be able to say:

"Find me a MacBook."

And Guranda acts.

"Show me the second one."

And the widget changes.

"Compare it with the first."

And comparison appears.

"Buy it."

And the Financial Engine takes over.

"What's happening this weekend?"

Events appear.

"What's that person saying on the live? Is it true?"

Fact checking appears.

"Get me a ride home."

Current location and saved home location are used.

"Give me five more minutes."

The relevant routine adjusts.

The user should not have to think:

"Which app do I need?"

That is the core experience.

---

## 31. THE BIGGER VISION

Most modern apps are collections of separate features.

Guranda should behave differently.

The goal is not simply:

"Put everything in one app."

The goal is:

Make everything work together as one intelligent system.

Mini apps can exist everywhere.

Widgets can appear anywhere.

Capabilities can move into the user's current context.

Voice and touch can control the same state.

Memory creates continuity.

Events connect Guranda to the real world.

The Financial Engine connects Guranda to money.

The Capability Engine connects Guranda to services.

Device integrations connect Guranda to the physical world.

The AI companion understands the person.

The Orchestrator connects everything.

The user should experience this as one coherent product.

---

## 32. SUCCESS CRITERIA

Do not judge success by:

"How much AI did we add?"

Judge success by:

* How many unnecessary taps disappeared?
* How many menus became unnecessary?
* How often does the system understand context correctly?
* Can users switch naturally between voice and touch?
* Can widgets respond to natural language?
* Can capabilities appear where users need them?
* Can external information become a native Guranda experience?
* Can the system preserve context across actions?
* Can engines operate independently but cooperate?
* Can new capabilities plug into Guranda without reinventing the architecture?
* Are AI calls reduced where deterministic systems can handle the work?
* Does the product feel faster?
* Does it feel personal?
* Does it feel like one system?

The ultimate success test is:

"I didn't have to think about how to use Guranda. I just told it what I wanted."

---

## 33. YOUR FIRST TASK

Do NOT immediately start writing a large amount of new code.

First inspect the existing Guranda codebase.

Then return with:

1. Current architecture
2. Existing systems discovered
3. Existing functionality that can be reused
4. Existing functionality that needs refactoring
5. Missing components
6. Proposed Interaction Engine architecture
7. Proposed Financial Engine architecture
8. Proposed Capability Engine architecture
9. Orchestrator design
10. Widget Interaction Contract
11. Event architecture
12. Data/state relationships
13. Interfaces between engines
14. Security and permissions considerations
15. Migration plan
16. Phase 1 implementation plan
17. Risks and architectural tradeoffs

Do not pretend something exists if it does not.

Do not assume the current codebase matches this specification.

Inspect first.

Then design.

Then implement.

And throughout the entire process remember:

GURANDA IS NOT A CHATBOT.

GURANDA IS AN INTELLIGENT SYSTEM.

THE AI UNDERSTANDS.

THE ENGINES EXECUTE.

THE CAPABILITIES APPEAR WHERE THEY ARE NEEDED.

THE WIDGETS LET THE USER ACT.

AND EVERYTHING FEELS LIKE ONE CONNECTED WORLD.
