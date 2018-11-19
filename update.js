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
    require.resolve('@babel/preset-stage-0'),
  ],
})

global.ROOT = __dirname

require('./scripts/mediawiki')

// require('./scripts/web')
