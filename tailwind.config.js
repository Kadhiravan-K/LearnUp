/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#7c3aed',
          hover: '#6d28d9',
          active: '#5b21b6',
          glow: '#a78bfa',
        },
        secondary: '#12121f',
        card: '#1a1a2e',
        accent: {
          DEFAULT: '#7c3aed',
          glow: '#a78bfa',
        },
        'bg-primary': '#0a0a14',
        'bg-secondary': '#12121f',
        'text-primary': '#f1f1f4',
        'text-secondary': '#9ca3af',
      },
      borderRadius: {
        card: '12px',
        btn: '8px',
      },
      boxShadow: {
        'ninja-glow': '0 0 20px rgba(124, 58, 237, 0.3)',
        'ninja-glow-hover': '0 0 30px rgba(124, 58, 237, 0.5)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
