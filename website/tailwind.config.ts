import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#7c3aed',
        secondary: '#06b6d4',
        accent: '#ec4899',
      },
      animation: {
        fade: 'fadeIn 0.6s ease-in-out',
        slideUp: 'slideUp 0.6s ease-out',
        glow: 'glow 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: {
            opacity: '0',
            transform: 'translateY(20px)',
          },
          to: {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        glow: {
          '0%, 100%': {
            boxShadow: '0 0 20px rgba(124, 58, 237, 0.3)',
          },
          '50%': {
            boxShadow: '0 0 40px rgba(124, 58, 237, 0.6)',
          },
        },
      },
      backdropBlur: {
        xl: '24px',
      },
    },
  },
  plugins: [],
}
export default config
