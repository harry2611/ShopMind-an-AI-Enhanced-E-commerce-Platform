/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#111827',
        mist: '#f5f7fb',
        tealbrand: '#0f766e',
        coral: '#d34f3f',
        saffron: '#c98716'
      },
      boxShadow: {
        panel: '0 20px 50px rgba(17, 24, 39, 0.14)'
      }
    }
  },
  plugins: []
};
