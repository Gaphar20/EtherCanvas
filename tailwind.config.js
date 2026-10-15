/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        coral: {
          DEFAULT: "#E84B55",
          50: "#FFF5F5",
          100: "#FEE2E2",
          200: "#FECACA",
          500: "#E84B55",
          600: "#D73843",
          700: "#B91C1C",
        },
        surface: {
          DEFAULT: "#FAFAF8",
          pure: "#FFFFFF",
          muted: "#F4F4F0",
          border: "#EAEAEA",
        },
        content: {
          primary: "#171717",
          secondary: "#737373",
          muted: "#A3A3A3",
        },
        canvas: {
          50: "#FFFFFF",
          100: "#FAFAF8",
          200: "#F5F5F3",
          300: "#EAEAEA",
          400: "#D4D4D4",
          500: "#A3A3A3",
          600: "#737373",
          700: "#525252",
          800: "#262626",
          850: "#1F1F1F",
          900: "#171717",
          950: "#0D0D0D",
        },
        violet: {
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["Space Mono", "monospace"],
      },
      boxShadow: {
        soft: "0 2px 10px rgba(0, 0, 0, 0.04)",
        card: "0 4px 20px -2px rgba(0, 0, 0, 0.05)",
        hover: "0 14px 34px -4px rgba(0, 0, 0, 0.09)",
        modal: "0 20px 40px -10px rgba(0, 0, 0, 0.12)",
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shimmer: "shimmer 2s infinite linear",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
