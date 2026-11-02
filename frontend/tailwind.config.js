/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        fintech: {
          dark: '#0A0F1D',
          card: '#111827',
          border: '#1F2937',
          accent: '#4F46E5',
          green: '#10B981',
        },
        bkash: {
          DEFAULT: '#E2136E',
          hover: '#C20C5B',
          light: '#FDE8F2',
        },
        nagad: {
          DEFAULT: '#F7941D',
          hover: '#DF7B09',
          light: '#FFF4E6',
        },
        rocket: {
          DEFAULT: '#8C3494',
          hover: '#73267B',
          light: '#F6EBF7',
        },
        upay: {
          DEFAULT: '#0081C9',
          hover: '#00649B',
          light: '#E6F4FB',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Hind Siliguri', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
