module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  extends: ['airbnb-base', 'poi-plugin'],
  parser: 'babel-eslint',
  rules: {
    'comma-dangle': ['error', 'always-multiline'],
    semi: ['error', 'never'],
    'no-underscore-dangle': 'off',
    'consistent-return': 'off',
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
