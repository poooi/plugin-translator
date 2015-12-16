path = require 'path'
Promise = require 'bluebird'
async = Promise.coroutine
TRANSLATOR_VERSION = 'v0.1.2'
i18n = new (require 'i18n-2')
  locales:['en-US', 'ja-JP', 'zh-CN', 'zh-TW'],
  defaultLocale: 'zh-CN',
  directory: path.join(__dirname, 'i18n'),
  updateFiles: false,
  indent: "\t",
  extension: '.json'
  devMode: false
i18n.setLocale(window.language)

if config.get('plugin.Translator.enable', true)
  window.translate = (str, locale) ->
    return i18n.translate "#{(if locale? then locale else window.language)}", str
  window.addEventListener 'initialize.complete', (e) ->
    for ship, index in window.$ships
      window.$ships[index]?.api_name = i18n.__ ship.api_name

    for shipType, index in window.$shipTypes
      window.$shipTypes[index]?.api_name = i18n.__ shipType.api_name

    for slotitem, index in window.$slotitems
      window.$slotitems[index]?.api_name = i18n.__ slotitem.api_name

    for slotitemType, index in window.$slotitemTypes
      window.$slotitemTypes[index]?.api_name = i18n.__ slotitemType.api_name

    for maparea, index in window.$mapareas
      window.$mapareas[index]?.api_name = i18n.__ maparea.api_name

    for map, index in window.$maps
      window.$maps[index]?.api_name = i18n.__ map.api_name

    for mission, index in window.$missions
      window.$missions[index]?.api_name = i18n.__ mission.api_name

    for useitem, index in window.$useitems
      window.$useitems[index]?.api_name = i18n.__ useitem.api_name


module.exports =
  name: i18n.__ 'Translator'
  link: "https://github.com/KochiyaOcean"
  author: 'KochiyaOcean'
  displayName: <span><FontAwesome key={0} name='language' /> {i18n.__ ('Translator')}</span>
  description: i18n.__ 'Translate ships\' \& equipments\' name into English'
  show: false
  version: TRANSLATOR_VERSION
