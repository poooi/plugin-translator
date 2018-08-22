/**
 * usage: node fetch.js [--all] [--concurrency <concurrency>]
 * Supported args:
 * all: if true, redownloads all pages
 * concurrency: number of concurrent connections during download
 */

import { outputJson, pathExists, readJson } from 'fs-extra'
import _, { filter, flatMap, isObject, each, merge, omit, values, keyBy, map, flow } from 'lodash'
import Promise, { promisifyAll } from 'bluebird'
import Bot from 'nodemw'
import path from 'path'
import filenamify from 'filenamify'
import fetch from 'node-fetch'
import ProgressBar from 'progress'
import yargsParser from 'yargs-parser'
import chalk from 'chalk'
import childProcess from 'child_process'
import detectNewline from 'detect-newline'
import util from 'util'

import luaToJson from './lua'
import config from './mw-config'

const args = yargsParser(process.argv.slice(2))

const concurrency = (args.concurrency && parseInt(args.concurrency, 10)) || 5

const bot = new Bot(config.bot)
promisifyAll(bot)

const fixApiYomi = string => string.replace(/\s?flagship/i, '').replace(/\s?elite/i, '')

const fixEnemySuffix = suffix => fixApiYomi(suffix).replace(/\s?[IVX][IVX]*/, '')

/**
 * extracts Japanese names and English ones from wikia module data
 * @param {Object} context Context for handling translation conflicts
 * @param {String} type Wikia module type
 * @param {Object} data Wikia module data
 */
const extractName = (context, type) => (data) => {
  // handle modules with multiple data parts
  if (!data._name) {
    if (isObject(data)) {
      return flatMap(data, extractName(context, type))
    }
    return []
  }
  // extract data from the module
  const {
    _name, _japanese_name: _jpName, _suffix, _api_id: _apiId, _id,
  } = data
  const isEnemy = type === 'ship-abyssal' || type === 'boss'
  const id = isEnemy && _apiId && _apiId < 1501 ? _apiId + 1000 : _apiId || _id
  const suffix = isEnemy ? _suffix && fixEnemySuffix(_suffix) : _suffix
  const name = suffix ? `${_name} ${suffix}` : _name
  const fullEnemyName = isEnemy && (_suffix ? `${_name} ${_suffix}` : _name)
  const jpName = isEnemy ? _jpName && fixApiYomi(_jpName) : _jpName
  // not sufficient data
  if (!jpName || (isEnemy && !id)) {
    return []
  }
  // incomplete module
  if (!id) {
    console.log(chalk.red(`no id for ${jpName}`))
    return [[jpName, name]]
  }
  // handle conflicts for this type
  const typeContext = context[type]
  if (typeContext[jpName] &&
    (typeContext[jpName].name !== name || typeContext[jpName].fullEnemyName !== fullEnemyName)) {
    // will need to fix first translation later, guaranteed to be the right one by
    // getPagesInCategoryAsync order and wikia naming conventions
    typeContext[jpName].fix = true
    return [[`${jpName}_${id}`, fullEnemyName || name]]
  }
  typeContext[jpName] = {
    id, name, fullEnemyName, type,
  }
  // warn about global conflicts
  const globalContext = context.global
  if (globalContext[jpName] && globalContext[jpName] !== name) {
    console.log(chalk.red(`global name conflict for ${jpName}`))
  }
  globalContext[jpName] = name
  // no conflicts
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

/**
 * prettify diff result
 * @param {string} diff diff result
 * @returns {string} prettified result
 */
const prettifyDiff = flow([
  str => str.split(detectNewline.graceful(str)),
  lines => map(lines, line => (/^\+{1}(?!\+)/.test(line) ? chalk.green(line) : line)),
  lines => map(lines, line => (/^-{1}(?!-)/.test(line) ? chalk.red(line) : line)),
  lines => lines.join('\n'),
])

const execAsync = util.promisify(childProcess.exec)

class ProgressBarCI {
  tick = () => {}
}

const update = async () => {
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
      concurrency,
    },
  )
  console.log(chalk.blue(`${total} pages to gather.`))

  const bar = new (process.env.CI ? ProgressBarCI : ProgressBar)(chalk.blue('gathering [:bar] :percent :etas'), {
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
          concurrency,
        },
      )
      return [name, articles]
    },
    {
      concurrency: 1,
    },
  )

  // context for translation conflicts
  const context = { global: {} }

  let result = _(db)
    .map(([type, articles]) => {
      context[type] = context[type] || {}
      const typeResult = _(articles)
        .flatMap(extractName(context, type))
        .fromPairs()
        .value()
      // update first matches for all conflicts
      _(context[type]).forEach(({
        id, name, fullEnemyName, fix,
      }, jpName) => {
        if (fix) {
          // support no context, currently only adding (?) for enemy equipment
          typeResult[jpName] = name + (type === 'slotitem-abyssal' ? ' (?)' : '')
          typeResult[`${jpName}_${id}`] = fullEnemyName || name
        }
      })
      return [type, typeResult]
    })
    .fromPairs()
    .value()

  // merge boss resources into ship-abyssal
  each(Object.keys(config.merge), (source) => {
    const dest = result[config.merge[source]]
    result[config.merge[source]] = merge({}, dest, result[source])
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
    name => outputJson(
      path.resolve(__dirname, `../i18n-source/${name}/en-US.json`),
      result[name],
      { spaces: 2, replacer: Object.keys(result[name]).sort() }
    ),
  )

  const final = merge({}, ...values(result))

  await outputJson(path.resolve(__dirname, '../i18n/en-US.json'), final, { replacer: Object.keys(final).sort() })

  const { stdout: gitStatus } = await execAsync('git status -s')
  console.log(gitStatus)
  if (gitStatus) {
    console.log(chalk.red('some files updated, please check and commit them'))
    const { stdout: gitDiff } = await execAsync('git diff -- . ":!i18n/en-US.json" ":!package-lock.json"')
    console.log(prettifyDiff(gitDiff))
    //  auto commit the changes or notify error in CI
    if (process.env.CI) {
      try {
        const {
          TRAVIS_EVENT_TYPE, TRAVIS_REPO_SLUG, TRAVIS_BRANCH, TRAVIS_PULL_REQUEST_BRANCH,
        } = process.env
        if (TRAVIS_EVENT_TYPE !== 'cron') { // we only auto commit when doing cron job
          throw new Error('Not in cron mode')
        }

        await execAsync(`git remote add target git@github.com:${TRAVIS_REPO_SLUG}.git`)
        await execAsync(`git commit -a --author "Llenn ちゃん <bot@kagami.me>" -m "chore: auto update ${Date.now()}"`)
        await execAsync(`git push target HEAD:${TRAVIS_PULL_REQUEST_BRANCH || TRAVIS_BRANCH}`)
      } catch (e) {
        console.error(e)
        process.exitCode = 1
      }
    }
  }
}

const main = async () => {
  try {
    await update()
  } catch (e) {
    console.error(e)
  }
}

main()
