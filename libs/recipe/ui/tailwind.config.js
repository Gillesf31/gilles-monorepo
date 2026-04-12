const { join } = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    join(__dirname, 'src/**/!(*.stories|*.spec).{ts,html}'),
    join(__dirname, 'src/**/*.stories.{ts,tsx}'),
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
