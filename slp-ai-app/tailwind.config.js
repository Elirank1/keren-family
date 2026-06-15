/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Heebo"', '"Assistant"', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Lavi — Sound Arena (cool, tactical, energetic)
        arena: {
          bg: '#0f172a',
          surface: '#1e293b',
          accent: '#6366f1',
          glow: '#22d3ee',
          energy: '#f59e0b',
        },
        // Niv — Animal Sound Garden (warm, soft, playful)
        garden: {
          bg: '#fef9f0',
          surface: '#ffffff',
          accent: '#34d399',
          sun: '#fbbf24',
          petal: '#fb7185',
        },
        sound: {
          s: '#22d3ee',
          sh: '#a78bfa',
          ts: '#f59e0b',
          ch: '#fb7185',
        },
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
    },
  },
  plugins: [],
};
