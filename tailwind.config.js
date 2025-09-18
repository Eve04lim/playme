/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Playme Design System Colors
        playme: {
          // Primary: Spotify Green
          primary: '#1db954',
          'primary-hover': '#1ed760',
          'primary-light': '#1db95440',
          'primary-dark': '#1aa34a',
          
          // Secondary: Deep Black
          secondary: '#191414',
          'secondary-light': '#282828',
          'secondary-dark': '#000000',
          
          // Accent: Coral Red
          accent: '#ff6b6b',
          'accent-light': '#ff8787',
          'accent-dark': '#ff5252',
          
          // Background: Dark Gray
          background: '#121212',
          'background-light': '#1a1a1a',
          'background-elevated': '#242424',
          
          // Text Colors
          text: '#ffffff',
          'text-muted': '#b3b3b3',
          'text-secondary': '#ffffff80',
          
          // Functional Colors
          success: '#1db954',
          warning: '#ffa726',
          error: '#f44336',
          info: '#2196f3',
        },
        
        // Legacy Spotify colors (for backwards compatibility)
        spotify: {
          green: '#1db954',
          black: '#191414',
          dark: '#121212',
          gray: '#535353',
        }
      },
      fontFamily: {
        // Design System Typography
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif'],
      },
      
      fontSize: {
        // Header Typography (24-32px)
        'header-sm': ['24px', { lineHeight: '32px', fontWeight: '700' }],
        'header-md': ['28px', { lineHeight: '36px', fontWeight: '700' }],
        'header-lg': ['32px', { lineHeight: '40px', fontWeight: '700' }],
        
        // Body Typography (14-16px)
        'body-sm': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        
        // Caption (12px)
        'caption': ['12px', { lineHeight: '16px', fontWeight: '300' }],
      },
      
      spacing: {
        // 8px Grid System
        '18': '72px',  // 9 * 8px
        '20': '80px',  // 10 * 8px
      },
      animation: {
        // Existing animations
        'blob': 'blob 7s infinite',
        'waveform': 'waveform 1s ease-in-out infinite alternate',
        'flowing-lyrics': 'flowRight 20s linear infinite',
        
        // New dashboard animations
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'card-float': 'cardFloat 3s ease-in-out infinite',
        'card-hover': 'cardHover 0.2s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'wave-bars': 'waveBars 1.5s ease-in-out infinite',
        'lyrics-flow': 'lyricsFlow 25s linear infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        // Existing keyframes
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        waveform: {
          '0%': { height: '20%' },
          '100%': { height: '100%' },
        },
        flowRight: {
          'from': { transform: 'translateX(100vw)' },
          'to': { transform: 'translateX(-100%)' },
        },
        
        // New dashboard keyframes
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        cardFloat: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-5px) rotate(1deg)' },
        },
        cardHover: {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(1.05)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        waveBars: {
          '0%, 100%': { transform: 'scaleY(1)' },
          '25%': { transform: 'scaleY(0.3)' },
          '50%': { transform: 'scaleY(0.8)' },
          '75%': { transform: 'scaleY(0.6)' },
        },
        lyricsFlow: {
          '0%': { transform: 'translateX(200px)', opacity: '0' },
          '10%': { opacity: '0.2' },
          '90%': { opacity: '0.2' },
          '100%': { transform: 'translateX(-200px)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}