/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        spotify: {
          green: '#1db954',
          black: '#191414',
          dark: '#121212',
          gray: '#535353',
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      animation: {
        'blob': 'blob 7s infinite',
        'waveform': 'waveform 1s ease-in-out infinite alternate',
        'flowing-lyrics': 'flowRight 20s linear infinite',
      },
      keyframes: {
        blob: {
          '0%': {
            transform: 'translate(0px, 0px) scale(1)',
          },
          '33%': {
            transform: 'translate(30px, -50px) scale(1.1)',
          },
          '66%': {
            transform: 'translate(-20px, 20px) scale(0.9)',
          },
          '100%': {
            transform: 'translate(0px, 0px) scale(1)',
          },
        },
        waveform: {
          '0%': {
            height: '20%',
          },
          '100%': {
            height: '100%',
          },
        },
        flowRight: {
          'from': {
            transform: 'translateX(100vw)',
          },
          'to': {
            transform: 'translateX(-100%)',
          },
        },
      },
    },
  },
  plugins: [],
}