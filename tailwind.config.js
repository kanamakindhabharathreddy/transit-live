/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ticket: {
          bg: 'rgb(var(--ticket-bg) / <alpha-value>)',
          card: 'rgb(var(--ticket-card) / <alpha-value>)',
          surface: 'rgb(var(--ticket-surface) / <alpha-value>)',
          border: 'rgb(var(--ticket-border) / <alpha-value>)',
          coral: 'rgb(var(--ticket-coral) / <alpha-value>)',
          cream: 'rgb(var(--ticket-cream) / <alpha-value>)',
          muted: 'rgb(var(--ticket-muted) / <alpha-value>)',
        }
      },
      fontFamily: {
        fraunces: ['Fraunces', 'serif'],
        sans: ['"Work Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      }
    },
  },
  plugins: [],
}

