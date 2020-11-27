module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  extends: [
    'airbnb-base',
    'poi-plugin',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier',
    'prettier/@typescript-eslint',
    'plugin:import/typescript',
  ],
  plugins: ['prettier', '@typescript-eslint'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
  },
  rules: {
    'no-underscore-dangle': 'off',
    'consistent-return': 'off',
    camelcase: 'off',
    'prettier/prettier': 'error',
    'no-shadow': 'off',
  },
  overrides: [
    {
      files: ['scripts/**/*.ts', 'update.ts'],
      rules: {
        'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
        'no-console': 'off',
        'import/extensions': 'off',
      },
    },
  ],
}
