import { JSDOM } from 'jsdom'
import { fromPairs, map, trim } from 'lodash'
import { outputJson } from 'fs-extra'
import path from 'path'
import fetch from 'node-fetch'

const fullWidth = fromPairs(map(['０', '１', '２', '３', '４', '５', '６', '７', '８', '９'], (n, i) => [i, n]))

const getUpdateFromWikiaPage = async () => {
  const resp = await fetch('http://kancolle.wikia.com/wiki/Quests')
  const html = await resp.text()
  const dom = new JSDOM(html)

  const rows = dom.window.document.querySelectorAll('tr[class*=quest]:not([class*=details])')
  const items = map(rows, row =>
    [
      trim(row.querySelector('span[lang=ja').textContent).replace(/!/g, '！').replace(/[0-9]/g, match => fullWidth[match]),
      trim(row.querySelector('i').textContent),
    ])

  await outputJson(path.resolve(global.ROOT, './i18n-source/quest/en-US.json'), fromPairs(items), { spaces: 2 })
}

export default getUpdateFromWikiaPage
