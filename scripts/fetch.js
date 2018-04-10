/**
 * usage: node fetch.js [--all]
 * Supported args:
 * all: if true, redownloads all pages
 */

import { outputJson, pathExists, readJson } from 'fs-extra'
import _, { filter, flatMap, isObject, each, merge, omit, values, keyBy } from 'lodash'
import Promise, { promisifyAll } from 'bluebird'
import Bot from 'nodemw'
import path from 'path'
import filenamify from 'filenamify'
import fetch from 'node-fetch'
import ProgressBar from 'progress'
import yargsParser from 'yargs-parser'
import chalk from 'chalk'

import luaToJson from './lua'
import config from './mw-config'

const args = yargsParser(process.argv.slice(2))

const bot = new Bot(config.bot)
promisifyAll(bot)

/**
 * extracts Japanese names and English ones from wikia module data
 * @param {Object} data Wikia module data
 */
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

/**
 * fetch an wikia article from disk or Internet, controlled by node args
 * @param {String} cat Category
 * @param {String} title Page title
 */
const fetchArticle = async (cat, title) => {
  const file = path.resolve(__dirname, `./articles/${cat}/${filenamify(title.replace('Module:', ''))}.json`)
  const exist = await pathExists(file)
  if (args.all || !exist) {
    const data = await bot.getArticleAsync(title)
    const article = luaToJson(data)
    await outputJson(file, article, { spaces: 2 })
    return article
  }
  return readJson(file)
}

const main = async () => {
  // const ns = await bot.getSiteInfoAsync(['namespaces'])
  // const nsData = _(ns.namespaces)
  //   .map(n => ([n.canonical, n.id]))
  //   .fromPairs()
  //   .value()

  // await outputJson(path.resolve(__dirname, './wikia-namespaces.json'), nsData, { spaces: 2 })

  let total = 0

  const pages = await Promise.map(
    Object.keys(config.categories),
    async (name) => {
      const p = await bot.getPagesInCategoryAsync(config.categories[name])
      const modules = filter(p, q => q.title.startsWith('Module:'))
      total += modules.length
      return [name, modules]
    },
    {
      concurrency: 5,
    },
  )
  console.log(chalk.blue(`${total} pages to gather.`))

  const bar = new ProgressBar(chalk.blue('gathering [:bar] :percent :etas'), {
    complete: '=',
    incomplete: ' ',
    width: 40,
    total,
  })

  const db = await Promise.map(
    pages,
    async ([name, p]) => {
      const articles = await Promise.map(
        p,
        async ({ title }) => {
          const article = await fetchArticle(name, title)
          bar.tick(1)
          return article
        },
        {
          concurrency: 1,
        },
      )
      return [name, articles]
    },
    {
      concurrency: 5,
    },
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
  console.log(chalk.blue('downloaded start2 data.'))

  const itemTypes = keyBy(start2.api_mst_slotitem_equiptype, 'api_id')
  const shipTypes = keyBy(start2.api_mst_stype, 'api_id')

  const itemTypesWikia = await fetchArticle('misc', 'Module:EquipmentTypes')
  const shipTypesWikia = await fetchArticle('misc', 'Module:ShipTypes')
  console.log(chalk.blue('gathered types data.'))

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
