[![npm package][npm-badge]][npm]

# Poi-Plugin-Translate

Translate ships and items in game into English.

## Data

English translation data make use of:

- [KC3 改 translation project](https://github.com/KC3Kai/kc3-translations)'s content under the MIT License, Copyright (c) 2015-2021 KC3 改 (see [licenses/KC3Kai-kc3-translations.LICENSE](licenses/KC3Kai-kc3-translations.LICENSE))
- [Kantai Collection English Wiki](https://en.kancollewiki.net/)'s content under CC BY-NC license (historical data imported before 2026)
- [api_start2 archive](https://github.com/Tibowl/api_start2) for the game's master id/name lists

## Updating data

node.js >= 8 is required.

```sh
npm i
npx ts-node update.ts
```

[npm-badge]: https://img.shields.io/npm/v/poi-plugin-translator.svg?style=flat-square
[npm]: https://www.npmjs.org/package/poi-plugin-translator
