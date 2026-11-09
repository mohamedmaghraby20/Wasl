// Tailwind v3 illustration: merge into your existing theme.extend after inspecting variable format.
module.exports = { theme: { extend: { colors: {
  background: 'var(--background)', foreground: 'var(--foreground)',
  primary: { DEFAULT: 'var(--primary)', foreground: 'var(--primary-foreground)' },
  secondary: { DEFAULT: 'var(--secondary)', foreground: 'var(--secondary-foreground)' },
  accent: { DEFAULT: 'var(--accent)', foreground: 'var(--accent-foreground)' },
  muted: { DEFAULT: 'var(--muted)', foreground: 'var(--muted-foreground)' },
  destructive: { DEFAULT: 'var(--destructive)', foreground: 'var(--destructive-foreground)' },
  border: 'var(--border)', input: 'var(--input)', ring: 'var(--ring)',
  card: { DEFAULT: 'var(--card)', foreground: 'var(--card-foreground)' }
}, borderRadius: { DEFAULT: 'var(--radius)' } } } };
