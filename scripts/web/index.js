import { JSDOM } from 'jsdom'
import { fromPairs, map } from 'lodash'
import { outputJson } from 'fs-extra'
import path from 'path'
import fetch from 'node-fetch'

const main = async () => {
  const resp = await fetch('http://kancolle.wikia.com/wiki/Quests')
  const html = await resp.text()
  const dom = new JSDOM(html)

  const rows = dom.window.document.querySelectorAll('tr[class*=quest]:not([class*=details])')
  const items = map(rows, row => [row.querySelector('span[lang=ja').textContent, row.querySelector('i').textContent])
  console.log(items)

  await outputJson(path.resolve(global.ROOT, './i18n-source/quest/en-US.json'), fromPairs(items), { spaces: 2 })
}

main()
