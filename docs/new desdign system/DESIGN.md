# Wasl Design System — v0.1 candidate

Status: portable handoff, not a verified integration or final production system. Gumroad screenshots are the visual source of truth; the original Wasl HTML is a direction, not an exact Gumroad replica. Cacao & Terracotta is the selected starting palette. Existing Wasl components and behavior are unknown until the receiving agent inventories the repository. Preserve all existing components, variants and behavior while adopting this visual language.

## 1. Design intent
Warm, confident, clear and welcoming. Use a warm paper canvas, white cards, dark cacao text, fine outlines and dividers, compact readable labels, large direct headings, image-led cards and restrained terracotta accents. Gumroad is the primary visual reference for marketplace density, borders, card composition and product detail; MotherDuck is secondary for warmth and play. Do not copy logos, illustrations or product content. Arabic identity should arise from careful Arabic typography and original, restrained cultural detail, not generic ornament.

## 2. Sources of truth and maturity
`tokens.css` owns candidate values; `tailwind-v4.css` maps to Tailwind v4; `preview.html` demonstrates selected patterns; this document defines intent, usage and anatomy. `COMPONENTS.md` defines coverage and states. `MIGRATION.md` directs AI agents to reconcile all existing components without deletion. The selected four colors are user-selected; other tokens and sizes are proposals pending visual review and app integration. The preview does not prove accessibility or full implementation. No dark theme is approved; preserve the app's existing mode until explicitly designed.

## 3. Foundations
Primary `#402922`, accent `#9C4E3A`, subtle accent `#F6E7E0`, page `#F9F3EE`. Semantic aliases in CSS distinguish foreground, surfaces, input, border, focus, destructive and status colors. Use semantic roles instead of raw colors in UI; don't use the terracotta accent as the only means of conveying state. Verify each foreground/background combination, including hover, focus, disabled and user-supplied media.

Typography baseline: Arial/Tahoma/sans-serif; Arabic Tahoma/Arial. These are safe starting fallbacks, not a final commissioned bilingual type choice. Prefer readable Arabic with appropriate shaping; do not apply negative Latin letter spacing to Arabic. Use 16px body, 14px metadata, 12px label, 20–24px card/section headings and a responsive display heading; verify zoom and reflow. Use hierarchical font weights rather than uppercase for Arabic.

Spacing uses a 4px base, with 4/8/12/16/20/24/32/48/64px tokens. Group related information more tightly than unrelated sections. Max content width 1280px; use 20–36px page gutters according to viewport. Use grids that fit content; avoid fixed-width mobile cards.

Shape: controls and cards use restrained 4px candidate corners, badges and filters may be pill-shaped. Use 1px solid dark outlines, internal section dividers, and no default card shadow. A small hard offset shadow can communicate interactive hover; disable motion where reduced motion is requested. These are candidate choices, to be checked against screenshots and user preference.

## 4. Layout: components versus pages
A reusable component owns its internal anatomy, consistent alignment, spacing and variants. A page owns placement, number of columns, section order and content priority. Components must reflow with container width rather than depend on a specific homepage grid. Event and community cards are domain components composed of shared card, image, badge, metadata, avatar and button primitives; document their anatomy, don't reinvent each page.

Event card default order: cover (optional), date/time, title, venue or online, organizer, availability/price if applicable, and action or link. Metadata can wrap; card footer aligns at the bottom when grid cards share a row. Use the actual app's existing business data and avoid implying invented features. Community card: cover/avatar, name, short description, location or mode if available, member metadata if permitted, visibility/approval status where relevant, and action. Preserve all existing card variants and supported fields. Cards should have one clear primary link/action, avoid nested links, and offer visible focus.

## 5. Accessibility and internationalization
Target WCAG 2.2 AA; this is a target, not a compliance claim. Check normal text at 4.5:1 and large text at 3:1 where applicable, non-text UI indicators at 3:1, keyboard operation and visible unobscured focus, labels and messages, 200% text scaling and 320 CSS-pixel reflow. Respect reduced motion and verify RTL with real Arabic content. Do not identify status by color alone. Use logical properties and isolate mixed-direction dates and locations. Use language and direction attributes appropriately. Native semantic elements first; build accessible dialog/menu behaviors using existing shadcn primitives rather than hand-rolled static markup.

## 6. Components and behavior
See COMPONENTS.md. Cover core primitives, composed product patterns, data display, overlays, status, empty/loading/error states and responsive variants. Interactive controls need hover, focus-visible, disabled, selected and error states where applicable. A preview demonstration is not evidence that production functionality works. Use text labels with icons and sufficient hit areas.

## 7. AI and implementation rules
Read project instructions first; inspect installed Tailwind version, shadcn configuration, components, existing design kit, routes and token naming. Do not replace `components.json`, package dependencies, existing theme files or Tailwind config wholesale. Keep established public component APIs and capabilities; adapt every old item and record mapping, gaps and variants in a traceable matrix. Maintain actual app behavior, authentication, permissions, language, navigation, capacity and waitlist states. Do not invent implemented functionality. Use the repository's version-control/worktree rules; show the design library for review before broad app changes. Prefer logical CSS and existing accessible primitives. Include concrete examples and acceptance checks, not generic rules only.

## 8. References
- Original HTML `wasl-preview.html` and supplied Gumroad screenshots: actual visual sources.
- User-selected option 04 in `wasl-color-explorer.html`.
- shadcn theming: https://ui.shadcn.com/docs/theming ; Tailwind v4: https://ui.shadcn.com/docs/tailwind-v4
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
