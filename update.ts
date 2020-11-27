// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace NodeJS {
  interface Global {
    ROOT: string
  }
}

global.ROOT = __dirname

require('./scripts/update')
