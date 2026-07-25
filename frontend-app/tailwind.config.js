/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mesh: {
          dark: '#0B0F19',
          card: '#161C2D',
          accent: '#00F0FF',
          accentHover: '#00D1FF',
          muted: '#8A94A6'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
