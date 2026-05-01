/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: '#111827',
        mist: '#f0f4f8',
        tealbrand: '#0f766e',
        coral: '#d34f3f',
        saffron: '#c98716'
      },
      boxShadow: {
        panel: '0 20px 50px rgba(17, 24, 39, 0.14)',
        card: '0 4px 24px rgba(17, 24, 39, 0.08)',
        'card-hover': '0 12px 40px rgba(15, 118, 110, 0.18)',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },
      backgroundImage: {
        'gradient-teal': 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
        'gradient-hero': 'linear-gradient(135deg, #0f172a 0%, #134e4a 100%)',
      }
    }
  },
  plugins: []
};
