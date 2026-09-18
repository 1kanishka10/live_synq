/** @type {import('tailwindcss').Config} */

// Colours are RGB triplets in CSS variables so a single data-theme attribute can
// repaint the whole app. <alpha-value> keeps /opacity modifiers working.
const v = (name) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        canvas: v("--c-canvas"),
        surface: v("--c-surface"),
        sky: { DEFAULT: v("--c-sky"), 50: v("--c-sky-50") },
        ocean: {
          DEFAULT: v("--c-ocean"),
          light: v("--c-ocean-light"),
          dark: v("--c-ocean-dark"),
        },
        slate: { DEFAULT: v("--c-slate") },
        ink: v("--c-ink"),
        critical: v("--c-critical"),
        high: v("--c-high"),
        medium: v("--c-medium"),
      },
      fontFamily: {
        display: ["Manrope", "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      backdropBlur: { xs: "2px" },
      boxShadow: {
        panel: "var(--shadow-panel)",
        lift: "var(--shadow-lift)",
        glow: "0 10px 30px -12px rgba(47,95,224,0.85)",
      },
      borderRadius: { xl2: "20px" },
      letterSpacing: { tightest: "-0.028em" },
    },
  },
  plugins: [],
};
