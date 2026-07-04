/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          deep: '#0F172A',
          card: '#1E293B',
        },
        cyan: {
          accent: '#06B6D4',
        },
        triage: {
          red: '#EF4444',
          orange: '#F97316',
          yellow: '#EAB308',
          green: '#10B981',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
