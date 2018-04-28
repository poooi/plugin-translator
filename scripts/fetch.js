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
 * @param {Object} data Wikia module data
 */
const extractName = type => (data) => {
  if (!data._name) {
    if (isObject(data)) {
      return flatMap(data, extractName(type))
    }
    return []
  }
  const {
    _name, _japanese_name: _jpName, _suffix, _api_id: apiId,
  } = data
  const isEnemy = type === 'ship-abyssal' || type === 'boss'
  if (!_jpName || (isEnemy && !apiId)) {
    return []
  }
  const suffix = isEnemy ? _suffix && fixEnemySuffix(_suffix) : _suffix
  const name = suffix ? `${_name} ${suffix}` : _name
  const jpName = isEnemy ? fixApiYomi(_jpName) : _jpName
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

  let result = _(db)
    .map(([name, articles]) => (
      [
        name,
        _(articles)
          .flatMap(extractName(name))
          .fromPairs()
          .value(),
      ]))
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
    const { stdout: gitDiff } = await execAsync('git diff')
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
