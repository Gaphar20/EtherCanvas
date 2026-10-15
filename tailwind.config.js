/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        canvas: {
          950: "#07060d",
          900: "#0d0b1a",
          850: "#131026",
          800: "#1b1735",
          700: "#27224d",
          600: "#3d3575",
        },
        violet: {
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
        },
        neon: {
          purple: "#c084fc",
          cyan: "#38bdf8",
          pink: "#f472b6",
          emerald: "#34d399",
        },
      },
      fontFamily: {
        sans: ["Outfit", "Inter", "sans-serif"],
        mono: ["Space Mono", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow-slow": "glow 3s ease-in-out infinite alternate",
        shimmer: "shimmer 2s infinite linear",
      },
      keyframes: {
        glow: {
          "0%": {
            boxShadow: "0 0 15px rgba(139, 92, 246, 0.3)",
          },
          "100%": {
            boxShadow: "0 0 30px rgba(168, 85, 247, 0.6)",
          },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
