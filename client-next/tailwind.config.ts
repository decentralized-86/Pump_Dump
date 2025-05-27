import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#4ADE80',
        'primary-dark': '#3BCB6D',
        secondary: '#FF4B4B',
        background: '#1A1B1E',
        surface: '#25262B',
        text: '#FFFFFF',
        'text-secondary': '#A1A1AA',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Titan One', 'cursive'],
      },
      boxShadow: {
        'neon': '0 0 20px rgba(74, 222, 128, 0.5)',
        'neon-strong': '0 0 30px rgba(74, 222, 128, 0.8)',
      },
    },
  },
  plugins: [],
}
export default config 