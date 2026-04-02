/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Clash Display"', 'system-ui', 'sans-serif'],
        body:    ['"DM Sans"',       'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"','monospace'],
      },
      colors: {
        ink: {
          900: '#0a0a0a',
          800: '#111111',
          700: '#1a1a1a',
          600: '#222222',
          500: '#333333',
          400: '#555555',
          300: '#888888',
          200: '#aaaaaa',
          100: '#dddddd',
          50:  '#f5f5f5',
        },
        accent: '#C8FF00',
        spark:  '#FF4D00',
      },
      animation: {
        'slide-up':   'slideUp 0.35s cubic-bezier(0.16,1,0.3,1)',
        'fade-in':    'fadeIn 0.3s ease',
        'pulse-slow': 'pulse 3s infinite',
      },
      keyframes: {
        slideUp: { from: { transform: 'translateY(16px)', opacity: 0 }, to: { transform: 'translateY(0)', opacity: 1 } },
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
      },
    },
  },
  plugins: [],
}
