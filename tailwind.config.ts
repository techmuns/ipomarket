import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Semantic accents on top of Tailwind slate.
        accent: {
          live: '#34d399',     // emerald-400
          awaiting: '#fbbf24', // amber-400
          manual: '#a78bfa',   // violet-400
          unavailable: '#fb7185', // rose-400
          analyst: '#818cf8',  // indigo-400
        },
      },
      boxShadow: {
        'card': '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 1px 3px 0 rgba(0,0,0,0.5)',
        'glow-live': '0 0 0 1px rgba(52,211,153,0.3), 0 4px 18px -2px rgba(52,211,153,0.15)',
      },
      keyframes: {
        pulse_soft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
      animation: {
        'pulse-soft': 'pulse_soft 2.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
