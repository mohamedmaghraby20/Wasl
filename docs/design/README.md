# Wasl Design System — Preview v1

A standalone HTML/CSS preview and starter token contract for Wasl. It uses **Manrope** for English and **Tajawal** for Arabic, with a soft gray foundation and a brighter lime accent. The accent `#8CC63E` is a provisional starting point.

## Files

- `index.html` — interactive design-system preview with real UI component examples.
- `tokens.css` — base, semantic, and theme-specific CSS tokens; includes Wasl, Ocean, and Plum demo presets in light and dark modes.
- `shadcn-variables.css` — shadcn/ui semantic variable bridge, mapped to the same token contract.
- `tailwind-theme.css` — Tailwind CSS v4 theme integration example.
- `theme-controller.js` — preview controls for brand theme, light/dark mode, and density.
- `tokens.json` — portable token inventory for future build scripts or design-token tooling.

## Preview controls

- **Theme:** Wasl Lime is the intended direction. Ocean and Plum are demo presets to prove the theme contract can support future alternatives; they are not proposed Wasl brand decisions.
- **Mode:** switch light/dark without changing components.
- **Density:** switch comfortable/compact spacing and control sizing.

The preview is intentionally a local static page. Open `index.html` in a browser; Google Fonts require an internet connection. No build step is required for the preview.

## Multi-theme contract

Components must consume semantic tokens (`--color-primary`, `--color-surface`, `--color-text`, `--radius-card`, `--control-height-md`, `--shadow-card`, etc.) rather than embed theme values. Add a theme by defining the token overrides for `[data-theme="name"][data-mode="light"]` and `[data-theme="name"][data-mode="dark"]`; the components remain unchanged. Density is independently controlled with `data-density`.

The token contract covers:

- semantic colors and status colors
- font families, size scale, weights, line-height and letter spacing
- spacing, component heights, icon and avatar sizing
- border width, radii, shadows and opacity
- motion duration/easing and z-index layers
- layout/container widths and density presets

Breakpoints are centralized in `tailwind-theme.css` as Tailwind build-time tokens. The preview media queries mirror `sm` (40rem), `md` (48rem), and `lg` (64rem); standard CSS media queries cannot directly consume CSS custom properties as breakpoint values, so keep these build-time values synchronized.

## Tailwind CSS v4 + shadcn/ui

Use `tailwind-theme.css` as the basis of the app stylesheet after installing Tailwind v4. The `--background`, `--foreground`, `--primary`, `--border`, `--ring`, `--radius`, and related shadcn variables map back to semantic tokens, so shadcn components inherit the active theme. Keep component-level styles token-based and avoid hard-coded hex values, spacing, radii, and shadows.

## Figma note

The Figma file includes Foundations, Components, and Light/Dark Theme Preview pages. The current Figma Starter workspace allows one mode per variable collection, so light and dark semantic colors are represented as separate collections. The web token architecture switches light/dark at runtime. If the team later uses a Figma plan that supports multiple modes per collection, the two semantic color sets can be consolidated into a single collection with Light and Dark modes.

## Production notes

- Keep theme state in one app-level provider or root `data-theme` / `data-mode` attributes; persist user preference only when the product's settings model is decided.
- Load Manrope and Tajawal with `font-display: swap` in production; consider self-hosting optimized subsets if performance or availability warrants it.
- Use CSS logical properties (`margin-inline`, `padding-inline`, `inset-inline-start`) and test mixed Arabic/English text, numerals, URLs, and icons in RTL.
- Validate contrast for every theme, especially accent/foreground pairs and focus rings. The sample presets are demonstration values and should receive contrast review before production.
- Respect `prefers-reduced-motion`; the CSS token layer reduces non-essential transitions automatically.
- Keep breakpoints, route layout, and component variants centralized rather than scattered through feature styles.

## React app integration

The application uses the production token contract copied to `client/src/styles/tokens.css`, `client/src/styles/shadcn-variables.css`, and `client/src/styles/tailwind-theme.css`. Update those copies when this approved source changes. The React build imports the local copies and does not depend on this preview folder.
