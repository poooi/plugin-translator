path = require 'path'
Promise = require 'bluebird'
async = Promise.coroutine
glob = require 'glob'
TRANSLATOR_VERSION = 'v0.2.3'

module.exports =
  pluginDidLoad: (e) ->

    if !window.i18n?
      window.i18n = {}

    window.i18n.translator = new (require 'i18n-2')
      locales:['ko-KR', 'en-US', 'ja-JP', 'zh-CN', 'zh-TW'],
      defaultLocale: 'zh-CN',
      directory: path.join(__dirname, 'i18n', 'translator'),
      updateFiles: false,
      indent: "\t",
      extension: '.json'
      devMode: false
    window.i18n.translator.setLocale(window.language)
    i18nFiles = glob.sync(path.join(__dirname, 'i18n', '*'))
    resourceI18n = {}
    for i18nFile in i18nFiles
      namespace = path.basename i18nFile
      if namespace != 'translator'
        resourceI18n[namespace] = new (require 'i18n-2')
          locales:['ko-KR', 'en-US', 'ja-JP', 'zh-CN', 'zh-TW'],
          defaultLocale: 'zh-CN',
          directory: i18nFile,
          updateFiles: false,
          indent: "\t",
          extension: '.json'
          devMode: false
        resourceI18n[namespace].setLocale(window.language)
    window.i18n.resources.__ = (str) =>
      for namespace of resourceI18n
        if str != resourceI18n[namespace].__ str
          return resourceI18n[namespace].__ str
      return str
    window.i18n.resources.translate = (locale, str) =>
      for namespace of resourceI18n
        if str != resourceI18n[namespace].translate locale, str
          return resourceI18n[namespace].translate locale, str
      return str
    window.i18n.resources.setLocale = (locale) =>
      for namespace of resourceI18n
        resourceI18n[namespace].setLocale locale
  pluginWillUnload: (e) ->
    window.i18n.resources = {}
    window.i18n.resources.__ = (str) -> return str
    window.i18n.resources.translate = (locale, str) -> return str
    window.i18n.resources.setLocale = (str) -> return
  show: false
