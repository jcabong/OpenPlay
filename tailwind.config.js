/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Clash Display"', 'system-ui', 'sans-serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        court: {
          50: '#f0fdf4',
          100: '#dcfce7',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
        },
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
        'slide-up':   'slideUp 0.4s cubic-bezier(0.16,1,0.3,1)',
        'fade-in':    'fadeIn 0.3s ease',
        'scale-in':   'scaleIn 0.2s cubic-bezier(0.16,1,0.3,1)',
        'pulse-slow': 'pulse 3s infinite',
      },
      keyframes: {
        slideUp:  { from: { transform: 'translateY(20px)', opacity: 0 }, to: { transform: 'translateY(0)', opacity: 1 } },
        fadeIn:   { from: { opacity: 0 }, to: { opacity: 1 } },
        scaleIn:  { from: { transform: 'scale(0.95)', opacity: 0 }, to: { transform: 'scale(1)', opacity: 1 } },
      },
    },
  },
  plugins: [],
}
