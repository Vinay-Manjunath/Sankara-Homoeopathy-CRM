/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tealBrand: {
          DEFAULT: '#208396',
          light: '#e6f4f6',
          dark: '#165c69'
        },
        purpleBrand: {
          DEFAULT: '#502479',
          light: '#f4edf9',
          dark: '#381755'
        },
        goldBrand: {
          DEFAULT: '#D4AF37',
          light: '#fbf7eb',
          accent: '#b89326'
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'sans-serif']
      }
    },
  },
  plugins: [],
}