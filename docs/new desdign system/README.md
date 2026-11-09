# Integration notes

This is a portable candidate, not a replacement for your app. Start with DESIGN.md and MIGRATION.md. `tokens.css` uses complete CSS color values. Keep it readable by ordinary CSS and avoid duplicating token values in components.

Tailwind v4 example (merge into the current CSS entry after checking existing setup):

```css
@import "tailwindcss";
@import "./tokens.css";
/* Merge the contents of tailwind-v4.css into the existing @theme inline block. */
```

For Tailwind v3, `tailwind-v3.example.cjs` is a small mapping illustration; merge it into the existing `theme.extend` and account for existing variable syntax, plugins and opacity requirements. Do not overwrite configuration. Confirm actual shadcn token conventions and generated component code before mapping.

Open `preview.html` next to `tokens.css` to view examples; it does not require a build. The HTML catalog is a design specimen, not a production component library or exhaustive application inventory. It has no backend and uses sample content. Compare its component anatomy with existing source and screenshots. No code from it should be assumed production-ready without adaptation and testing.
