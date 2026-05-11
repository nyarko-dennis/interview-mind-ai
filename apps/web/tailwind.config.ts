import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#0F0F1A',
        surface: '#16162A',
        border: '#2A2A45',
        accent: '#6C63FF',
        'accent-dim': '#4B44CC',
        muted: '#8888AA',
        success: '#4ADE80',
        warning: '#FACC15',
        danger: '#F87171',
      },
      fontFamily: {
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
