/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'cyber-cyan': '#00e5ff',
        'cyber-green': '#00ff88',
        'bg-base': '#0a0e1a',
        'bg-surface': '#111827',
        'bg-elevated': '#1e2d3d',
        'border-dim': '#1e3a5f',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
