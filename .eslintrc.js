module.exports = {
  'env': {
    'browser': true,
    'es6': true,
    'node': true,
  },
  'extends': [
    "airbnb-base",
  ],
  'parser': 'babel-eslint',
  'globals': {
    'config': false,
  },
  'rules': {
    'comma-dangle': ['error', 'always-multiline'],
    'semi': ['error', 'never'],
    'no-underscore-dangle': 'off',
    'consistent-return': 'off',
  },
  'settings': {
    'import/resolver': {
      'node': {
        'extensions': ['.js', '.jsx', '.es', '.coffee', '.cjsx'],
        'paths': [__dirname],
      },
    },
    'import/core-modules': [
      'bluebird',
      'electron',
      'react',
      'react-redux',
      'redux-observers',
      'reselect',
      'react-bootstrap',
      'react-fontawesome',
      'path-extra',
      'fs-extra',
      'lodash',
      'cson',
      'react-dom',
      'redux',
      'semver',
      'i18n-2',
      'glob',
    ],
  },
  overrides: [
    {
      files: ['scripts/*.js', 'update.js'],
      rules: {
        'import/no-extraneous-dependencies': ['error', { 'devDependencies': true }],
        'no-console': 'off',
      }
    }
  ],
}
