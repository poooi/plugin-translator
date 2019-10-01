import { JSDOM } from 'jsdom'
import { fromPairs, map, trim, keyBy, compact, padStart } from 'lodash'
import { outputJson } from 'fs-extra'
import path from 'path'
import fetch from 'node-fetch'

const getUpdateFromWikiaPage = async () => {
  const resp = await fetch('http://kancolle.wikia.com/wiki/Quests')
  const html = await resp.text()
  const dom = new JSDOM(html)

  const resp2 = await fetch('https://kcwikizh.github.io/kcdata/quest/poi.json')
  const questData = await resp2.json()
  const known = keyBy(questData, 'wiki_id')

  const resp3 = await fetch('https://poi.0u0.moe/dump/quests.csv')
  const listData = await resp3.text()
  const questList = fromPairs(
    map(listData.split('\n').slice(1), line => line.split(',').slice(0, 2)),
  )

  const rows = dom.window.document.querySelectorAll('tr[class*=q]:not([class*=details])')
  const items = compact(
    map(rows, row => {
      if (!row.querySelector('i') || !row.querySelector('td[rowspan="2"]')) {
        return null
      }
      // wikia id has no zero padding
      const id = trim(row.querySelector('td[rowspan="2"]').textContent).replace(/[0-9]+/, match =>
        padStart(match, 2, '0'),
      )

      const name = trim(row.querySelector('i').textContent)

      if (id in known) {
        return [`${questList[known[id].game_id]}_${known[id].game_id}`, name]
      }

      if (!row.querySelector('span')) {
        return null
      }
      const jaName = trim(row.querySelector('span').textContent)
      return [jaName, name]
    }),
  )

  const final = fromPairs(items)

  await outputJson(path.resolve(global.ROOT, './i18n-source/quest/en-US.json'), final, {
    spaces: 2,
  })
}

export default getUpdateFromWikiaPage
