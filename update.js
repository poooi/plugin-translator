require('@babel/register')({
  presets: [
    [
      require.resolve('@babel/preset-env'),
      {
        targets: {
          node: 8,
        },
      },
    ],
  ],
  plugins: [
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-optional-chaining',
  ].map(require.resolve),
})

global.ROOT = __dirname

require('./scripts/update')
