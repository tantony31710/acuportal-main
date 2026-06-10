/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Space Grotesk', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
        arabic: ['Noto Naskh Arabic', 'Amiri', 'serif'],
      },
      colors: {
        primary: { DEFAULT: 'oklch(0.74 0.14 175)', foreground: 'oklch(0.16 0.025 200)' },
        secondary: { DEFAULT: 'oklch(0.28 0.04 200)', foreground: 'oklch(0.97 0.01 180)' },
        background: 'oklch(0.16 0.025 200)',
        foreground: 'oklch(0.97 0.01 180)',
        card: { DEFAULT: 'oklch(0.21 0.03 200)', foreground: 'oklch(0.97 0.01 180)' },
        muted: { DEFAULT: 'oklch(0.25 0.03 200)', foreground: 'oklch(0.7 0.02 190)' },
        border: 'oklch(0.3 0.03 200)',
        input: 'oklch(0.25 0.03 200)',
        destructive: { DEFAULT: 'oklch(0.65 0.22 25)', foreground: 'oklch(0.98 0 0)' },
        success: { DEFAULT: 'oklch(0.72 0.18 150)', foreground: 'oklch(0.16 0.025 200)' },
        warning: { DEFAULT: 'oklch(0.8 0.17 80)', foreground: 'oklch(0.16 0.025 200)' },
      },
    },
  },
  plugins: [],
}
