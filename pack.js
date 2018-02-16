const cp = require('child_process')
const path = require('path')
const glob = require('glob')
const fs = require('fs')

const LOCALES = ['ko-KR', 'en-US', 'ja-JP', 'zh-CN', 'zh-TW']

LOCALES.forEach(locale => {
  const i18nFiles = glob.sync(path.join(__dirname, 'i18n_source', '*', `{LOCALES}.json`))
  const i18nFile = i18nFiles.map(p => {
    let ret
    try {
      ret = require(p)
    } catch (e) {
      ret = {}
    }
    return ret
  }).reduce((a, b) => Object.assign({}, a, b))
  fs.writeFileSync(path.join(__dirname, 'i18n', `{LOCALES}.json`), JSON.stringify(i18nFile))
})

cp.exec('npm run compile', { cwd: __dirname })
