const path = require('path')
const glob = require('glob')
const fs = require('fs-extra')

const LOCALES = ['ko-KR', 'en-US', 'ja-JP', 'zh-CN', 'zh-TW']

LOCALES.forEach((locale) => {
  const i18nFiles = glob.sync(path.join(__dirname, 'i18n_source', '*', `${locale}.json`))
  const i18nContent = i18nFiles.map((p) => {
    let ret
    try {
      ret = fs.readJsonSync(p)
    } catch (e) {
      ret = {}
    }
    return ret
  }).reduce((a, b) => Object.assign({}, a, b))
  fs.writeFileSync(path.join(__dirname, 'i18n', `${locale}.json`), JSON.stringify(i18nContent))
})
