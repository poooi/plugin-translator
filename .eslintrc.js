module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  extends: ['airbnb-base', 'poi-plugin', 'prettier'],
  plugins: ['babel', 'prettier'],
  parser: 'babel-eslint',
  rules: {
    'no-underscore-dangle': 'off',
    'consistent-return': 'off',
    'camelcase': 'off',
    'babel/camelcase': 'error',
    'prettier/prettier': 'error',
  },
  overrides: [
    {
      files: ['scripts/**/*.js', 'update.js'],
      rules: {
        'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
        'no-console': 'off',
      },
    },
  ],
}
