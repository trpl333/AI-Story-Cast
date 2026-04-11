/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        parchment: {
          50:  '#fdf8f0',
          100: '#f9efd8',
          200: '#f3ddb1',
          300: '#ebc680',
          400: '#e2a84f',
          500: '#d98d2e',
          600: '#c07524',
          700: '#9f5c1d',
          800: '#82491b',
          900: '#6b3c19',
        },
        ink: {
          DEFAULT: '#1a1208',
          light:   '#3d2c14',
        },
        story: {
          purple: '#6b46c1',
          blue:   '#2563eb',
          amber:  '#d97706',
        },
      },
      fontFamily: {
        serif:  ['Georgia', 'Cambria', '"Times New Roman"', 'serif'],
        sans:   ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':    'fadeIn 0.4s ease-in-out',
        'slide-up':   'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

