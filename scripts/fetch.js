import { outputJson } from 'fs-extra'
import _, { filter, flatMap, isObject, each, merge, omit, values, keyBy } from 'lodash'
import Promise, { promisifyAll } from 'bluebird'
import Bot from 'nodemw'
import path from 'path'
import filenamify from 'filenamify'
import fetch from 'node-fetch'

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
  // const ns = await bot.getSiteInfoAsync(['namespaces'])
  // const nsData = _(ns.namespaces)
  //   .map(n => ([n.canonical, n.id]))
  //   .fromPairs()
  //   .value()

  // await outputJson(path.resolve(__dirname, './wikia-namespaces.json'), nsData, { spaces: 2 })

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
          const article = luaToJson(data)
          await outputJson(path.resolve(__dirname, `./articles/${name}/${filenamify(title.replace('Module:', ''))}.json`), article, { spaces: 2 })
          return article
        },
        {
          concurrency: 5,
        },
      )
      return [name, articles]
    }
  )

  let result = _(db)
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

  // merge boss resources into ship-abyssal
  each(Object.keys(config.merge), (source) => {
    const dest = result[config.merge[source]]
    result[config.merge[source]] = merge(dest, result[source])
    result = omit(result, source)
  })

  // processing misc data
  result = omit(result, 'misc')
  const resp = await fetch('http://api.kcwiki.moe/start2')
  const start2 = await resp.json()

  const itemTypes = keyBy(start2.api_mst_slotitem_equiptype, 'api_id')
  const shipTypes = keyBy(start2.api_mst_stype, 'api_id')

  const itemTypesWikia = luaToJson(await bot.getArticleAsync('Module:EquipmentTypes'))
  const shipTypesWikia = luaToJson(await bot.getArticleAsync('Module:ShipTypes'))

  result['slotitem-type'] = _(itemTypesWikia)
    .entries()
    .map(([id, name]) => ([itemTypes[id]?.api_name, name]))
    .fromPairs()
    .value()

  result['ship-type'] = _(shipTypesWikia)
    .entries()
    .map(([id, name]) => ([shipTypes[id]?.api_name, name]))
    .fromPairs()
    .value()

  await Promise.map(
    Object.keys(result),
    name => outputJson(path.resolve(__dirname, `../i18n-source/${name}/en-US.json`), result[name], { spaces: 2 }),
  )

  await outputJson(path.resolve(__dirname, '../i18n/en-US.json'), merge(values(result)))
}

try {
  main()
} catch (e) {
  console.error(e)
}
