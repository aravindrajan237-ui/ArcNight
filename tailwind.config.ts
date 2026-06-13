import type { Config } from "tailwindcss";

/**
 * HarvestLink design tokens — "fintech-meets-fresh-produce": warm, honest,
 * high-trust. Semantic color names map to the palette in the design brief.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary harvest green
        primary: {
          DEFAULT: "#1F6B3B",
          50: "#EAF3EE",
          100: "#D2E7DA",
          200: "#A9D0B8",
          300: "#79B493",
          400: "#479467",
          500: "#1F6B3B",
          600: "#1A5B32",
          700: "#154A29",
          800: "#103A20",
          900: "#0B2916",
        },
        // Accent amber / terracotta — CTAs and prices
        accent: {
          DEFAULT: "#E07A2F",
          50: "#FDF3EA",
          100: "#FAE1CB",
          200: "#F3BE93",
          300: "#EC9C5C",
          400: "#E07A2F",
          500: "#E07A2F",
          600: "#C7641F",
          700: "#A04F18",
        },
        success: { DEFAULT: "#2E9E5B", 50: "#E8F6EE", 100: "#CDEBD9" },
        warning: { DEFAULT: "#E0A92F", 50: "#FBF1DA", 100: "#F6E2B0" },
        danger: { DEFAULT: "#D24A3D", 50: "#FBE9E7", 100: "#F5C9C3" },
        ink: "#1A1D1A",
        slate: { DEFAULT: "#5B635C", muted: "#828A82" },
        mist: "#EDF1EC",
        surface: "#F8FAF7",
        // Bridge alias so any not-yet-rebuilt screens stay on-palette.
        harvest: {
          50: "#EAF3EE",
          100: "#D2E7DA",
          200: "#A9D0B8",
          300: "#79B493",
          500: "#1F6B3B",
          600: "#1A5B32",
          700: "#154A29",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-jakarta)",
          "var(--font-inter)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      borderRadius: {
        card: "16px",
        pill: "999px",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(16,24,16,0.04), 0 4px 16px rgba(16,24,16,0.06)",
        card: "0 1px 3px rgba(16,24,16,0.05), 0 8px 24px rgba(16,24,16,0.07)",
        lifted: "0 10px 34px rgba(16,24,16,0.13)",
        focus: "0 0 0 4px rgba(31,107,59,0.18)",
        "accent-focus": "0 0 0 4px rgba(224,122,47,0.20)",
      },
      keyframes: {
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "pop-badge": {
          "0%": { transform: "scale(0.6)", opacity: "0" },
          "60%": { transform: "scale(1.08)", opacity: "1" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        "slide-up": "slide-up 0.28s cubic-bezier(0.16,1,0.3,1)",
        "scale-in": "scale-in 0.2s cubic-bezier(0.16,1,0.3,1)",
        "pop-badge": "pop-badge 0.4s cubic-bezier(0.16,1,0.3,1)",
      },
    },
  },
  plugins: [],
};

export default config;
