/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f3effe',
          100: '#e3d5fc',
          200: '#c9aff9',
          300: '#a87cf3',
          400: '#8b52ec',
          500: '#6C3AB7',  // primary deep purple
          600: '#5b2fa0',
          700: '#4a238a',
          800: '#3a1a72',
          900: '#2a1155',
        },
        gold: {
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#F0A500',  // accent gold
          600: '#d97706',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'scan-line': 'scanLine 2s linear infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'shake': 'shake 0.4s ease-in-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'shimmer': 'shimmer 1.5s infinite linear',
        'bounce-once': 'bounceOnce 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
      keyframes: {
        scanLine: {
          '0%':   { top: '10%' },
          '50%':  { top: '85%' },
          '100%': { top: '10%' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-8px)' },
          '40%': { transform: 'translateX(8px)' },
          '60%': { transform: 'translateX(-6px)' },
          '80%': { transform: 'translateX(6px)' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.85)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        bounceOnce: {
          '0%':   { transform: 'scale(0.6)', opacity: '0' },
          '60%':  { transform: 'scale(1.15)' },
          '80%':  { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      boxShadow: {
        'brand': '0 4px 24px rgba(108, 58, 183, 0.25)',
        'brand-lg': '0 8px 40px rgba(108, 58, 183, 0.35)',
        'gold': '0 4px 20px rgba(240, 165, 0, 0.3)',
      },
    },
  },
  plugins: [],
};
