/** @type {import('postcss-load-config').Config} */
export default {
  plugins: {
    'postcss-import': {},
    'tailwindcss/nesting': {},
    'tailwindcss': {},
    'autoprefixer': {},
    'postcss-preset-env': {
      features: { 'nesting-rules': false },
      stage: 3,
      autoprefixer: { flexbox: 'no-2009' }
    }
  }
}