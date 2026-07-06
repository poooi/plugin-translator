import { outputJson, readJson } from 'fs-extra'
import _ from 'lodash'
import Bluebird from 'bluebird'
import path from 'path'
import fetch from 'node-fetch'
import chalk from 'chalk'

/**
 * Translation data comes from the KC3改 translation project (MIT License,
 * Copyright (c) KC3改), https://github.com/KC3Kai/kc3-translations
 * Game master data (id/name lists) comes from https://github.com/Tibowl/api_start2
 */
const KC3_BASE = 'https://raw.githubusercontent.com/KC3Kai/kc3-translations/master/data/en'
const START2_URL = 'https://raw.githubusercontent.com/Tibowl/api_start2/master/start2.json'

// in-game ids below this are player ships/equipment, above are abyssal
const ABYSSAL_SHIP_MIN_ID = 1501
const ABYSSAL_SLOTITEM_MIN_ID = 501

interface Start2Entry {
  api_id: number
  api_name: string
  api_yomi: string
}

interface Start2 {
  api_mst_ship: Start2Entry[]
  api_mst_slotitem: Start2Entry[]
  api_mst_useitem: Start2Entry[]
  api_mst_stype: Start2Entry[]
  api_mst_slotitem_equiptype: Start2Entry[]
}

interface ShipAffix {
  suffixes: Record<string, string>
  prefixes: Record<string, string>
  yomi: Record<string, string>
  byId: Record<string, string>
}

const fetchJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`${url} failed with HTTP ${response.status}`)
  }
  return (await response.json()) as T
}

const readExisting = async (name: string): Promise<Record<string, string>> => {
  try {
    return (await readJson(
      path.resolve(global.ROOT, `./i18n-source/${name}/en-US.json`),
    )) as Record<string, string>
  } catch (e) {
    return {}
  }
}

/**
 * Removes KC3 optional-separator templates like `{ -}?` from affix translations,
 * they only matter when KC3 parses names, we always join with a space
 */
const cleanAffix = (text: string): string => text.replace(/\{[^}]*\}\?/g, ' ')

const normalize = (name: string): string => name.replace(/\s+/g, ' ').trim()

/**
 * Builds a translator that decomposes a full Japanese ship name into
 * a base name from KC3 ships.json plus a chain of suffix tokens
 * (e.g. 夕張改二特 = 夕張 + 改二 + 特 -> Yuubari Kai Ni Toku)
 */
const createNameTranslator = (
  baseNames: Record<string, string>,
  suffixes: Record<string, string>,
) => {
  const bases = Object.keys(baseNames).sort((a, b) => b.length - a.length)
  const suffixKeys = Object.keys(suffixes).sort((a, b) => b.length - a.length)

  const translateSuffix = (rest: string): string | undefined => {
    if (!rest) {
      return ''
    }
    return suffixKeys.reduce<string | undefined>((found, key) => {
      if (found !== undefined || !rest.startsWith(key)) {
        return found
      }
      const tail = translateSuffix(rest.slice(key.length))
      return tail === undefined ? undefined : cleanAffix(suffixes[key]) + tail
    }, undefined)
  }

  return (jpName: string): string | undefined =>
    bases.reduce<string | undefined>((found, base) => {
      if (found !== undefined || !jpName.startsWith(base)) {
        return found
      }
      const tail = translateSuffix(jpName.slice(base.length))
      return tail === undefined ? undefined : normalize(baseNames[base] + tail)
    }, undefined)
}

/**
 * Player ships: one entry per full name, ships sharing one name
 * (e.g. the 3 Souya forms) additionally get name_id entries.
 * Existing translations always win so that upstream renames don't churn
 * established names, KC3 only fills in new content
 */
const getShips = (
  start2: Start2,
  kc3Ships: Record<string, string>,
  affix: ShipAffix,
  existing: Record<string, string>,
): Record<string, string> => {
  const translate = createNameTranslator(kc3Ships, affix.suffixes)
  const result: Record<string, string> = {}
  const players = start2.api_mst_ship.filter((ship) => ship.api_id < ABYSSAL_SHIP_MIN_ID)
  _(players)
    .groupBy('api_name')
    .forEach((group, jpName) => {
      const baseName =
        affix.byId[group[0].api_id] && group.length === 1
          ? affix.byId[group[0].api_id]
          : kc3Ships[jpName] || translate(jpName)
      if (!baseName) {
        if (!existing[jpName]) {
          console.log(chalk.yellow(`no translation for ship ${jpName}`))
        }
        return
      }
      result[jpName] = baseName
      if (group.length > 1) {
        group.forEach(({ api_id: id }) => {
          result[`${jpName}_${id}`] = affix.byId[id] || baseName
        })
      }
    })
  return { ...result, ...existing }
}

/**
 * Abyssal ships: base names plus per-id entries with Elite/Flagship
 * from api_yomi, existing translations win to preserve manual fixes
 * (e.g. roman numerals distinguishing same-named variants)
 */
const getAbyssalShips = (
  start2: Start2,
  kc3Ships: Record<string, string>,
  affix: ShipAffix,
  existing: Record<string, string>,
): Record<string, string> => {
  const translate = createNameTranslator(kc3Ships, affix.suffixes)
  const result: Record<string, string> = {}
  const abyssals = start2.api_mst_ship.filter((ship) => ship.api_id >= ABYSSAL_SHIP_MIN_ID)
  _(abyssals)
    .groupBy('api_name')
    .forEach((group, jpName) => {
      const baseName = translate(jpName)
      if (!baseName) {
        if (!existing[jpName]) {
          console.log(chalk.yellow(`no translation for abyssal ship ${jpName}`))
        }
        return
      }
      result[jpName] = baseName
      if (group.length > 1) {
        group.forEach(({ api_id: id, api_yomi: yomi }) => {
          const suffix = affix.yomi[yomi] ? cleanAffix(affix.yomi[yomi]) : ''
          result[`${jpName}_${id}`] = normalize(baseName + suffix)
        })
      }
    })
  return { ...result, ...existing }
}

const getSlotitems = (
  start2: Start2,
  kc3Items: Record<string, string>,
  existing: Record<string, string>,
  abyssal: boolean,
): Record<string, string> => {
  const result: Record<string, string> = {}
  const items = start2.api_mst_slotitem.filter((item) =>
    abyssal ? item.api_id >= ABYSSAL_SLOTITEM_MIN_ID : item.api_id < ABYSSAL_SLOTITEM_MIN_ID,
  )
  items.forEach(({ api_name: jpName }) => {
    if (!jpName) {
      return
    }
    const name = kc3Items[jpName] || kc3Items[jpName.trim()]
    if (name) {
      result[jpName] = name
    } else if (!existing[jpName]) {
      console.log(chalk.yellow(`no translation for ${abyssal ? 'abyssal ' : ''}item ${jpName}`))
    }
  })
  // existing translations win to preserve manual fixes like (?) disambiguations
  return { ...result, ...existing }
}

const getUseitems = (
  start2: Start2,
  kc3Useitems: string[],
  existing: Record<string, string>,
): Record<string, string> => {
  const result: Record<string, string> = {}
  start2.api_mst_useitem.forEach(({ api_id: id, api_name: jpName }) => {
    if (!jpName) {
      return
    }
    const name = kc3Useitems[id]
    if (name) {
      result[jpName] = name
    } else if (!existing[jpName]) {
      console.log(chalk.yellow(`no translation for useitem ${jpName}`))
    }
  })
  return { ...result, ...existing }
}

/**
 * Ship types and equipment types use full English names that KC3 does not
 * provide (it only has abbreviations), the files are kept as they are,
 * this only warns about new types that need a manual translation
 */
const warnMissingTypes = async (start2: Start2): Promise<void> => {
  const shipTypes = await readExisting('ship-type')
  start2.api_mst_stype.forEach(({ api_name: jpName }) => {
    if (!shipTypes[jpName]) {
      console.log(chalk.red(`new ship type needs manual translation: ${jpName}`))
    }
  })
  const slotitemTypes = await readExisting('slotitem-type')
  start2.api_mst_slotitem_equiptype.forEach(({ api_name: jpName }) => {
    if (!slotitemTypes[jpName]) {
      console.log(chalk.red(`new equipment type needs manual translation: ${jpName}`))
    }
  })
}

/**
 * Downloads data from KC3 translations and api_start2
 */
const getUpdateFromKC3 = async (): Promise<void[]> => {
  const [start2, kc3Ships, affix, kc3Items, kc3Useitems] = await Promise.all([
    fetchJson<Start2>(START2_URL),
    fetchJson<Record<string, string>>(`${KC3_BASE}/ships.json`),
    fetchJson<ShipAffix>(`${KC3_BASE}/ship_affix.json`),
    fetchJson<Record<string, string>>(`${KC3_BASE}/items.json`),
    fetchJson<string[]>(`${KC3_BASE}/useitems.json`),
  ])

  const result: Record<string, Record<string, string>> = {
    ship: getShips(start2, kc3Ships, affix, await readExisting('ship')),
    'ship-abyssal': getAbyssalShips(start2, kc3Ships, affix, await readExisting('ship-abyssal')),
    slotitem: getSlotitems(start2, kc3Items, await readExisting('slotitem'), false),
    'slotitem-abyssal': getSlotitems(
      start2,
      kc3Items,
      await readExisting('slotitem-abyssal'),
      true,
    ),
    useitem: getUseitems(start2, kc3Useitems, await readExisting('useitem')),
  }

  await warnMissingTypes(start2)

  return Bluebird.map(Object.keys(result), (name) =>
    outputJson(path.resolve(global.ROOT, `./i18n-source/${name}/en-US.json`), result[name], {
      spaces: 2,
      replacer: Object.keys(result[name]).sort(),
    }),
  )
}

export default getUpdateFromKC3
