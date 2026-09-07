/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: '#16213E', // primary text / sidebar background
        paper: '#EEF1F4', // app background — cool, not the cliché warm cream
        line: '#D9DFE5', // hairline borders
        brass: '#9C6B30', // primary accent / CTA
        'brass-dark': '#7C5424',
        compliant: '#1F7A4D',
        'compliant-bg': '#E7F4EC',
        noncompliant: '#A13D35',
        'noncompliant-bg': '#FBEAE8',
        review: '#9A6B00',
        'review-bg': '#FBF1DC',
        failed: '#5B6572',
        'failed-bg': '#EAECEF',
      },
    },
  },
  plugins: [],
};
