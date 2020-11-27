/* eslint-disable @typescript-eslint/no-explicit-any */

declare module 'lua-json' {
  const parse: (text: string) => any
}

declare namespace NodeJS {
  interface Global {
    ROOT: string
  }
}
