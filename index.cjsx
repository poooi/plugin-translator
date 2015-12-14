i18n = require 'i18n'
{__} = i18n
path = require 'path'
Promise = require 'bluebird'
async = Promise.coroutine
TRANSLATOR_VERSION = 'v0.0.2'
i18n.configure
  locales:['en-US', 'ja-JP', 'zh-CN', 'zh-TW'],
  defaultLocale: 'zh-CN',
  directory: path.join(__dirname, 'i18n'),
  updateFiles: false,
  indent: "\t",
  extension: '.json'
i18n.setLocale(window.language)

if config.get('plugin.Translator.enable', true)
  window.addEventListener 'initialize.complete', (e) ->
    for ship, index in window.$ships
      window.$ships[index]?.api_name = __ ship.api_name

    for shipType, index in window.$shipTypes
      window.$shipTypes[index]?.api_name = __ shipType.api_name

    for slotitem, index in window.$slotitems
      window.$slotitems[index]?.api_name = __ slotitem.api_name

    for slotitemType, index in window.$slotitemTypes
      window.$slotitemTypes[index]?.api_name = __ slotitemType.api_name

    for maparea, index in window.$mapareas
      window.$mapareas[index]?.api_name = __ maparea.api_name

    for map, index in window.$maps
      window.$maps[index]?.api_name = __ map.api_name

    for mission, index in window.$missions
      window.$missions[index]?.api_name = __ mission.api_name

    for useitem, index in window.$useitems
      window.$useitems[index]?.api_name = __ useitem.api_name
module.exports =
  name: __ 'Translator'
  link: "https://github.com/KochiyaOcean"
  author: 'KochiyaOcean'
  displayName: <span><FontAwesome key={0} name='language' /> {__ ('Translator')}</span>
  description: __ 'Translate ships\' \& equipments\' name into English'
  show: false
  version: TRANSLATOR_VERSION
