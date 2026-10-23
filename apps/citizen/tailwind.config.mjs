/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0B111E',
        surface: {
          DEFAULT: '#141E33',
          card: '#18243D',
          hover: '#1F2E4D',
          border: '#2A3C63',
        },
        brand: {
          saffron: '#F97316',
          amber: '#F59E0B',
          gold: '#EAB308',
          teal: '#0D9488',
        },
        status: {
          available: '#10B981',
          reserved: '#F59E0B',
          occupied: '#EF4444',
          ev: '#06B6D4',
          disabled: '#8B5CF6'
        }
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Noto Sans Devanagari', 'sans-serif'],
        hindi: ['var(--font-noto-devanagari)', 'sans-serif']
      },
      boxShadow: {
        'glow-saffron': '0 0 20px -3px rgba(249, 115, 22, 0.4)',
        'glow-emerald': '0 0 20px -3px rgba(16, 185, 129, 0.4)',
        'glow-card': '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
      }
    },
  },
  plugins: [],
};
