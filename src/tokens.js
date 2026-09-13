/**
 * Design tokens — inline-style references to CSS custom properties.
 * CSS variables are defined in theme.css and toggled via .dark class on <html>.
 */
export const T = {
  bg:       "var(--color-bg)",
  surface:  "var(--color-surface)",
  card:     "var(--color-card)",
  border:   "var(--color-border)",
  borderHi: "var(--color-border-hi)",
  text:     "var(--color-text)",
  muted:    "var(--color-muted)",
  dim:      "var(--color-dim)",

  overlay1: "var(--color-overlay-1)",
  overlay2: "var(--color-overlay-2)",
  overlay3: "var(--color-overlay-3)",

  accent:   "var(--color-accent)",
  accentLo: "var(--color-accent-lo)",
  accentBd: "var(--color-accent-bd)",

  gold:     "var(--color-gold)",
  red:      "var(--color-red)",
  green:    "var(--color-green)",
  orange:   "var(--color-orange)",
  cyan:     "var(--color-cyan)",
  purple:   "var(--color-purple)",
};
