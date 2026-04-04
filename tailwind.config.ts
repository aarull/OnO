import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0a0a0f',
          2: '#111118',
          3: '#16161f',
          4: '#1c1c28',
        },
        border: {
          DEFAULT: 'rgba(255, 255, 255, 0.07)',
          2: 'rgba(255, 255, 255, 0.12)',
        },
        text: {
          DEFAULT: '#f0f0f5',
          2: '#9090a8',
          3: '#55556a',
        },
        accent: {
          DEFAULT: '#7c6ef7',
          2: '#9d93ff',
          bg: 'rgba(124, 110, 247, 0.12)',
          border: 'rgba(124, 110, 247, 0.3)',
        },
        green: {
          DEFAULT: '#34d399',
          bg: 'rgba(52, 211, 153, 0.1)',
        },
        amber: {
          DEFAULT: '#fbbf24',
          bg: 'rgba(251, 191, 36, 0.1)',
        },
        red: {
          DEFAULT: '#f87171',
          bg: 'rgba(248, 113, 113, 0.1)',
        },
        blue: {
          DEFAULT: '#60a5fa',
          bg: 'rgba(96, 165, 250, 0.1)',
        },
      },
      borderRadius: {
        r: '10px',
        'r-2': '14px',
        'r-3': '20px',
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        serif: ['DM Serif Display', 'serif'],
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out both',
        'fade-in': 'fade-in 0.3s ease-out both',
        'slide-in': 'slide-in 0.3s ease-out both',
        shimmer: 'shimmer 2s linear infinite',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-in': {
          from: { opacity: '0', transform: 'translateX(-12px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
