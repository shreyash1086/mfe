/**
 * Design Tokens — Single Source of Truth
 *
 * Used by:
 *   1. Tailwind configs: require('../../shared-design-system/src/tokens')
 *   2. React components: import { tokens } from 'sharedDesignSystem/tokens'
 *   3. CSS custom properties: generated in global.css
 */
const tokens = {
  colors: {
    // Background surfaces
    "brand-dark": "#000000", // Page background (dark mode) - Pure Black
    "brand-card": "#09090b", // Card / panel background - Zinc-950
    "brand-card-2": "#18181b", // Elevated card layer - Zinc-900
    // Borders
    "brand-border": "rgba(255,255,255,0.08)",
    "brand-border-strong": "rgba(255,255,255,0.15)",
    // Text
    "brand-text": "#f1f5f9", // Primary text
    "brand-muted": "#94a3b8", // Secondary / muted text
    // Accent / interactive
    "brand-accent": "#3563EB", // Primary accent (cyan)
    "brand-accent-hover": "#0891b2",
    "brand-success": "#22c55e",
    "brand-warning": "#f59e0b",
    "brand-error": "#ef4444",
    "brand-info": "#3b82f6",
  },
  fontFamily: {
    sans: ["Poppins", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
    mono: ["JetBrains Mono", "Fira Code", "ui-monospace", "monospace"],
  },
  borderRadius: {
    card: "16px",
    "card-lg": "24px",
    pill: "100px",
    button: "10px",
  },
  spacing: {
    // Module content padding
    "page-x": "1.5rem",
    "page-y": "1.5rem",
  },
  animation: {
    "fade-in": "fade-in 0.4s ease both",
    "slide-up": "slide-up 0.4s ease both",
    "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
  },
};

module.exports = tokens;
