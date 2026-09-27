import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0a0e1a',
          900: '#0d1220',
          800: '#111827',
          700: '#1a2233',
          600: '#243147',
          500: '#3b4a66',
        },
        cyan: {
          DEFAULT: '#00e5ff',
          soft: '#00e5ff33',
        },
        amber: {
          DEFAULT: '#ffb020',
          soft: '#ffb02033',
        },
        crit: {
          DEFAULT: '#ff3b3b',
          soft: '#ff3b3b33',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 24px rgba(0, 229, 255, 0.35)',
        warn: '0 0 24px rgba(255, 176, 32, 0.35)',
        crit: '0 0 24px rgba(255, 59, 59, 0.35)',
      },
    },
  },
  plugins: [],
};
export default config;
