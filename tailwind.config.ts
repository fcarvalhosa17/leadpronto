import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#ffffff",
        surface:    "#f5f5f5",
        border:     "#e5e5e5",
        primary:    "#ea580c",
        "primary-hover": "#c2410c",
        "orange-50":  "#fff7ed",
        "orange-600": "#ea580c",
        "orange-700": "#c2410c",
        success: "#22c55e",
        warning: "#f59e0b",
        danger:  "#ef4444",
        "neutral-400": "#a1a1a1",
        "neutral-500": "#737373",
        "neutral-950": "#0a0a0a",
      },
      fontFamily: {
        sans: ["Geist", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        DEFAULT: "0.625rem",
        sm: "0.375rem",
        md: "0.5rem",
        lg: "0.625rem",
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
      boxShadow: {
        xs: "0 1px 2px 0 oklch(0.145 0 0 / 0.05)",
        sm: "0 1px 3px 0 oklch(0.145 0 0 / 0.08), 0 1px 2px -1px oklch(0.145 0 0 / 0.06)",
        md: "0 4px 8px -2px oklch(0.145 0 0 / 0.10), 0 2px 4px -2px oklch(0.145 0 0 / 0.06)",
        lg: "0 12px 24px -6px oklch(0.145 0 0 / 0.12), 0 4px 8px -4px oklch(0.145 0 0 / 0.08)",
        hairline: "0 0 0 1px oklch(0.145 0 0 / 0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
