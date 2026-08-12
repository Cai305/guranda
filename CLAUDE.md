# Guranda — repo-wide context

Monorepo: `apps/api` (NestJS), `apps/mobile` (Expo/React Native), `website` (Next.js marketing site), `packages/types` (shared types, requires a build step — see `apps/mobile/CLAUDE.md`).

## Product direction — read before any product/UX work

This app is being evolved toward a specific product vision, not redesigned from a blank slate on each session.

- **`docs/16_Product_Vision_Master.md`** — the full north-star product vision (verbatim from the product owner). Treat as the single source of truth for product direction. Core principle: the user is the hero, AI is the amplifier; one ecosystem, many experiences; preserve existing functionality, don't delete features just because this doc doesn't mention them.
- **`docs/17_Product_Audit_And_Mapping.md`** — grounded audit of what already exists in this codebase against that vision, with file:line citations, and explicit **alignment** (already matches, don't rebuild) / **gap** (safe to build) / **conflict** (needs a product-owner decision before changing) callouts. Read this before assuming something is missing — several vision pieces (adaptive Live-per-category, the business dashboard, achievements substrate, Social/Trending separation) already substantially exist.

Do not start large product-direction work (profile redesign, reputation/rank/badge systems, Discovery content-model changes, wallet currency-display changes, Entertainment licensed-media work) without checking `17_Product_Audit_And_Mapping.md` first — it flags which of those need an explicit product decision rather than an engineering judgment call.

Other docs in `docs/` (`01_PRD.md` through `15_MVP_vs_Enterprise.md`) describe the original "MXit 2.0" architecture; `16`/`17` supersede them where they conflict.

## Deployment

Render.com, deploys on push to `main`. Local dev DB: Postgres on `localhost:5433`.
