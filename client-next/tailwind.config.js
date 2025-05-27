/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#4ADE80',
        secondary: '#8C8E92',
        background: '#0A0B0E',
        surface: '#25262B',
      },
    },
  },
  plugins: [],
} 