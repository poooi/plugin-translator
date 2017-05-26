import path from 'path'
import glob from 'glob'
import Translator from 'i18n-2'
import { isString, forEach } from 'lodash'

export const TRANSLATOR_VERSION = 'v0.2.3'


export const pluginDidLoad = () => {
  if (!window.i18n) {
    window.i18n = {}
  }

  window.i18n.translator = new Translator({
    locales: ['ko-KR', 'en-US', 'ja-JP', 'zh-CN', 'zh-TW'],
    defaultLocale: 'zh-CN',
    directory: path.join(__dirname, 'i18n', 'translator'),
    updateFiles: false,
    indent: '\t',
    extension: '.json',
    devMode: false,
  })
  window.i18n.translator.setLocale(window.language)

  const i18nFiles = glob.sync(path.join(__dirname, 'i18n', '*'))
  const resourceI18n = {}
  forEach(i18nFiles, (i18nFile) => {
    const namespace = path.basename(i18nFile)
    if (namespace !== 'translator') {
      resourceI18n[namespace] = new Translator({
        locales: ['ko-KR', 'en-US', 'ja-JP', 'zh-CN', 'zh-TW'],
        defaultLocale: 'zh-CN',
        directory: i18nFile,
        updateFiles: false,
        indent: '\t',
        extension: '.json',
        devMode: false,
      })
      resourceI18n[namespace].setLocale(window.language)
    }
  })
  window.i18n.resources.__ = (str, ...args) => {
    if (!isString(str)) {
      return String(str)
    }
    let result = str
    forEach(resourceI18n, (namespace) => {
      if (str !== namespace.__(str, ...args)) {
        result = namespace.__(str, ...args)
        return false // stop the iteration
      }
    })
    return result
  }
  window.i18n.resources.translate = (locale, str) => {
    let result = str
    forEach(resourceI18n, (namespace) => {
      if (str !== namespace.translate(locale, str)) {
        result = namespace.translate(locale, str)
        return false // stop the iteration
      }
    })
    return result
  }
  window.i18n.resources.setLocale = locale =>
    forEach(resourceI18n, namespace =>
      namespace.setLocale(locale)
    )
}

export const pluginWillUnload = () => {
  window.i18n.resources = {}
  window.i18n.resources.__ = str => str
  window.i18n.resources.translate = (locale, str) => str
  window.i18n.resources.setLocale = () => {}
}

export const show = false
