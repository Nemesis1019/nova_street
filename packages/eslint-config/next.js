const base = require('./index');

module.exports = [
  ...base,
  {
    rules: {
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
];
