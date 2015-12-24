path = require 'path'
Promise = require 'bluebird'
async = Promise.coroutine
glob = require 'glob'
TRANSLATOR_VERSION = 'v0.2.2'

if !window.i18n?
  window.i18n = {}

window.i18n.translator = new (require 'i18n-2')
  locales:['en-US', 'ja-JP', 'zh-CN', 'zh-TW'],
  defaultLocale: 'zh-CN',
  directory: path.join(__dirname, 'i18n', 'translator'),
  updateFiles: false,
  indent: "\t",
  extension: '.json'
  devMode: false
window.i18n.translator.setLocale(window.language)

if config.get('plugin.Translator.enable', true)
  i18nFiles = glob.sync(path.join(__dirname, 'i18n', '*'))
  resourceI18n = {}
  for i18nFile in i18nFiles
    namespace = path.basename i18nFile
    if namespace != 'translator'
      resourceI18n[namespace] = new (require 'i18n-2')
        locales:['en-US', 'ja-JP', 'zh-CN', 'zh-TW'],
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
module.exports =
  name: 'Translator'
  link: "https://github.com/KochiyaOcean"
  author: 'KochiyaOcean'
  displayName: <span><FontAwesome key={0} name='language' /> {window.i18n.translator.__ ('Translator')}</span>
  description: window.i18n.translator.__ 'Translate ships\' \& equipments\' name into English'
  show: false
  version: TRANSLATOR_VERSION
