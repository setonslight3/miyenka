import type { Config } from 'tailwindcss';

/**
 * Miyenka foundation palette.
 * Cream/beige and black/white carry structure, gold carries luxury,
 * pink is an accent only, burgundy/red supplies controlled fashion accents.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#100D0B',
          soft: '#2A2422',
          muted: '#5C534E',
          faint: '#8C817A',
        },
        cream: {
          DEFAULT: '#FAF6F1',
          deep: '#F2EAE0',
          shell: '#E8DCCE',
        },
        gold: {
          DEFAULT: '#C9A227',
          light: '#E3C766',
          deep: '#9C7B18',
        },
        blush: {
          DEFAULT: '#EBC3C6',
          soft: '#F7E5E6',
          deep: '#D89AA0',
        },
        burgundy: {
          DEFAULT: '#7B1F2B',
          bright: '#C0242F',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Cormorant Garamond', 'Didot', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      letterSpacing: {
        luxe: '0.24em',
        wide: '0.12em',
      },
      maxWidth: {
        editorial: '86rem',
      },
      transitionTimingFunction: {
        silk: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        rise: {
          from: { opacity: '0', transform: 'translateY(18px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fade: { from: { opacity: '0' }, to: { opacity: '1' } },
      },
      animation: {
        rise: 'rise 0.9s cubic-bezier(0.22, 1, 0.36, 1) both',
        fade: 'fade 1.2s ease both',
      },
    },
  },
  plugins: [],
};

export default config;
