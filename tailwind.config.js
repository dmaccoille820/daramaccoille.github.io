/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        jeopardy: {
          dark: '#020617',
          deep: '#03082a',
          navy: '#050c77',
          board: '#060ce9',
          card: '#0c169c',
          cardHover: '#1322c4',
          accent: '#2563eb',
          gold: '#fbbf24',
          goldLight: '#fde047',
          goldDark: '#d97706',
          emerald: '#10b981',
          danger: '#ef4444'
        }
      },
      fontFamily: {
        jeopardy: ['Impact', 'Arial Black', 'sans-serif'],
        clue: ['Korinna', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'jeopardy-glow': '0 0 25px rgba(37, 99, 235, 0.45)',
        'gold-glow': '0 0 20px rgba(251, 191, 36, 0.55)',
        'card-inset': 'inset 0 2px 4px rgba(255, 255, 255, 0.15), inset 0 -2px 4px rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.25s ease-out',
        'pop-in': 'popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        popIn: {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        }
      }
    },
  },
  plugins: [],
}
