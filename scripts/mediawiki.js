import { outputJson } from 'fs-extra'
import _, { flatMap, isObject, values } from 'lodash'
import Promise from 'bluebird'
import path from 'path'
import fetch from 'node-fetch'
import chalk from 'chalk'
import { parse } from 'lua-json'

const categories = {
  ship: 'Ship',
  slotitem: 'Equipment',
  useitem: 'Item',
  'ship-abyssal': 'Enemy',
  'slotitem-abyssal': 'EnemyEquipment',
}

const getLuaData = async (title) =>
  parse(await (await fetch(`https://kancolle.fandom.com/wiki/${title}?action=raw`)).text())

const getLuaDataInCategory = async (category) => {
  const pages = []
  const loop = async (cont) => {
    const params = {
      action: 'query',
      format: 'json',
      generator: 'allpages',
      gaplimit: 50,
      gapnamespace: 828, // Module
      gapfilterredir: 'nonredirects',
      gapprefix: `Data/${category}/`,
      prop: 'revisions',
      rvprop: 'content',
    }
    if (cont) {
      params.gapcontinue = cont
    }
    const url = `https://kancolle.fandom.com/api.php?${_(params)
      .toPairs()
      .map(([k, v]) => `${k}=${v}`)
      .join('&')}`
    const data = await (await fetch(url)).json()
    const morePages = values(data.query.pages)
      .filter((e) => !e.title.includes('Vita:') && !e.title.includes('Mist:'))
      .map((e) => parse(e.revisions[0]['*']))
    morePages.forEach((e) => pages.push(e))
    return data.continue ? loop(data.continue.gapcontinue) : pages
  }
  return loop()
}

const fixApiYomi = (string) => string.replace(/\s?flagship/i, '').replace(/\s?elite/i, '')

const fixEnemySuffix = (suffix) => fixApiYomi(suffix).replace(/\s?[IVX][IVX]*/, '')

const extractName = (context, type) => (data) => {
  // handle modules with multiple data parts
  if (!data._name) {
    if (isObject(data)) {
      return flatMap(data, extractName(context, type))
    }
    return []
  }
  // extract data from the module
  const { _name, _japanese_name: _jpName, _suffix, _api_id: _apiId, _id } = data
  const isEnemy = type === 'ship-abyssal'
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
  if (
    typeContext[jpName] &&
    (typeContext[jpName].name !== name || typeContext[jpName].fullEnemyName !== fullEnemyName)
  ) {
    // will need to fix first translation later, guaranteed to be the right one by
    // getLuaDataInCategory order and wikia naming conventions
    typeContext[jpName].fix = true
    return [[`${jpName}_${id}`, fullEnemyName || name]]
  }
  typeContext[jpName] = {
    id,
    name,
    fullEnemyName,
    type,
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

const getUpdateFromMediaWiki = async () => {
  const db = await Promise.map(Object.keys(categories), async (name) => [
    name,
    await getLuaDataInCategory(categories[name]),
  ])

  // context for translation conflicts
  const context = { global: {} }

  const result = _(db)
    .map(([type, articles]) => {
      context[type] = context[type] || {}
      const typeResult = _(articles).flatMap(extractName(context, type)).fromPairs().value()
      // update first matches for all conflicts
      _(context[type]).forEach(({ id, name, fullEnemyName, fix }, jpName) => {
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

  result['slotitem-type'] = await getLuaData('Module:Data/EquipmentTypeNames')
  result['ship-type'] = await getLuaData('Module:Data/ShipTypeNames')

  return Promise.map(Object.keys(result), (name) =>
    outputJson(path.resolve(global.ROOT, `./i18n-source/${name}/en-US.json`), result[name], {
      spaces: 2,
      replacer: Object.keys(result[name]).sort(),
    }),
  )
}

export default getUpdateFromMediaWiki
