import { outputJson } from 'fs-extra'
import _, { filter, flatMap, isObject } from 'lodash'
import Promise, { promisifyAll } from 'bluebird'
import Bot from 'nodemw'
import path from 'path'
import filenamify from 'filenamify'

import luaToJson from './lua'
import config from './mw-config'

const bot = new Bot(config.bot)
promisifyAll(bot)

const extractName = (data) => {
  if (!data._name) {
    if (isObject(data) && '' in data) {
      return flatMap(data, extractName)
    }
    return []
  }
  const { _name, _japanese_name: jpName, _suffix } = data
  if (!jpName) {
    return []
  }
  const name = _suffix ? `${_name} ${_suffix}` : _name

  return [[jpName, name]]
}

const main = async () => {
  const ns = await bot.getSiteInfoAsync(['namespaces'])
  const nsData = _(ns.namespaces)
    .map(n => ([n.canonical, n.id]))
    .fromPairs()
    .value()

  await outputJson(path.resolve(__dirname, './wikia-namespaces.json'), nsData, { spaces: 2 })

  const pages = await Promise.map(
    Object.keys(config.categories),
    async (name) => {
      const p = await bot.getPagesInCategoryAsync(config.categories[name])
      return [name, filter(p, q => q.title.startsWith('Module:'))]
    },
    {
      concurrency: 3,
    }
  )

  const db = await Promise.map(
    pages,
    async ([name, p]) => {
      const articles = await Promise.map(
        p,
        async ({ title }) => {
          const data = await bot.getArticleAsync(title)
          await outputJson(path.resolve(__dirname, `./articles/${name}/${filenamify(title.replace('Module:', ''))}.json`), luaToJson(data), { spaces: 2 })
          return luaToJson(data)
        },
        {
          concurrency: 5,
        },
      )
      return [name, articles]
    }
  )

  const result = _(db)
    .map(([name, articles]) => (
      [
        name,
        _(articles)
          .flatMap(extractName)
          .fromPairs()
          .value(),
      ]))
    .fromPairs()
    .value()

  await outputJson('./res.json', result, { spaces: 2 })
}

try {
  main()
} catch (e) {
  console.error(e)
}
