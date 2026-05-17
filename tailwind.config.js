/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './*.html',
    './public/js/**/*.js',
    './assets/js/**/*.js',
    './components/**/*.{html,js}',
    './**/*.{html,js}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      colors: {
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c'
        }
      }
    }
  },
  safelist: [
    'hidden',
    'block',
    'flex',
    'grid',
    'inline-flex',
    {
      pattern: /(bg|text|border|ring|from|to|via)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|brand)-(50|100|200|300|400|500|600|700|800|900)/,
      variants: ['hover', 'focus', 'active', 'disabled', 'group-hover', 'sm', 'md', 'lg', 'xl']
    }
  ],
  plugins: []
};
