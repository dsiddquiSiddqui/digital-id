/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: '#0094e0',
        'brand-light': 'rgba(0,148,224,0.1)',
        'brand-hover': '#007bb8',
      },
    },
  },
  plugins: [],
}