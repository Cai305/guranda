1. Good design is innovative — Score: 1/3
   Evidence: 01-evidence.md Structural §5 — `SC` palette is a direct token-for-token adoption of shadcn/ui's public default dark theme, not a novel pattern; the underlying flow (balance/deposit/send/scan) is unchanged from the app's own prior screen.
   Justification: Imitates an existing, extremely widespread design system with minor local variation — not a wholesale flow copy (0), but no refresh or improvement is introduced either (would need 2).

2. Good design is useful — Score: 1/3
   Evidence: 01-evidence.md Copy & Honesty §5 and Structural §3 — 2 of the 4 primary action buttons (Request :95, Scan :99) have no `onPress` at all; Deposit/Send work.
   Justification: The core task (view balance, deposit, send) is directly supported, so this isn't a 0, but half the offered primary actions are decoys a user cannot complete — worse than "adjacent surface adds steps," so it doesn't reach 2.

3. Good design is aesthetic — Score: 1/3
   Evidence: 01-evidence.md Visual §1-3 — spacing scale of 8 values with no consistent base unit, type scale of 8 values including a fractional 13.5px step with no evident system, plus a declared-but-unused `destructive` token and two redundant token aliases (`primary`=`foreground`, `primaryForeground`=`background`).
   Justification: Four distinct system violations (spacing, type scale, dead token, redundant aliases) puts this in the "3-5 inconsistencies" band, not the "≤2 minor" band — even though color usage itself and border/radius treatment are consistent.

4. Good design is understandable — Score: 1/3
   Evidence: 01-evidence.md Copy & Honesty §4 and Accessibility §3 — unexplained "MSH" currency code, raw uppercase enum shown as label (e.g. "RECEIVE"), and Request/Scan rendered identically to working controls with no cue they're inert.
   Justification: 2-3 controls/labels are genuinely unclear (currency code, enum labels, indistinguishable dead buttons) — matches the "jargon present" band, not the single-tooltip band above it.

5. Good design is unobtrusive — Score: 2/3
   Evidence: 01-evidence.md Visual (INFERRED) — no gradients/glow/animation, hairline 10%-opacity borders, flat neutral backgrounds throughout.
   Justification: Chrome is quiet and restrained, but every single element (buttons, rows, icon wells) is individually bordered — chrome is present everywhere even if muted, short of fully receding into content-as-figure.

6. Good design is honest — Score: 0/3
   Evidence: 01-evidence.md Copy & Honesty §5, Accessibility §3 — Request (:95-98) and Scan (:99-102) are visually and programmatically indistinguishable from working buttons (same style, same fallback accessibility announcement) yet perform no action on activation, for both sighted and screen-reader users.
   Justification: Presenting two fully-styled, unmarked controls as functional when they silently no-op is a false affordance indistinguishable from deception at the point of use — not a copy inflation but an active claim ("this button does something") the design doesn't honor.

7. Good design is long-lasting — Score: 2/3
   Evidence: 00-scope.md — shadcn's neutral dark-mode grayscale token set, applied verbatim.
   Justification: The style avoids skeuomorphic/neumorphic fads and is restrained on its own terms, but it is also the current default look of a huge wave of 2025-2026 AI-wrapper and dashboard apps — one dated marker (unmistakably "of this moment" rather than distinctive), not several.

8. Good design is thorough down to the last detail — Score: 0/3
   Evidence: 01-evidence.md Visual §5 — of 6 states checked, only Loading (:73-75) is present; Empty, Error, Success, Focus, and Disabled are all missing (Empty silently substitutes fake mock data instead, :33-37, :77).
   Justification: 5 of 6 states missing is well past the "4+ states missing" floor for a 0 — this is the single sparsest area of the whole audit.

9. Good design is environmentally friendly — Score: 3/3
   Evidence: 01-evidence.md Weight & Friction §1-5 — 1 network request on mount, 0 animations, 0 auto-firing modals/notifications, no new dependencies beyond already-shared app libraries.
   Justification: Meets every top-band signal available to inspect statically (minimal requests, no idle motion, no autoplay); nothing in evidence suggests otherwise.

10. Good design is as little design as possible — Score: 2/3
    Evidence: 01-evidence.md Structural §3 and Copy & Honesty §5 — Request and Scan contribute no working functionality, i.e. they are removable today without breaking any task the screen currently performs.
    Justification: Exactly two elements are provably removable (or need to earn their place via real implementation) with no other decorative excess found — matches "≤2 removable elements," not zero.

**Total: 13/30**
