i18n = require 'i18n'
{__} = i18n
path = require 'path'
Promise = require 'bluebird'
async = Promise.coroutine
TRANSLATOR_VERSION = 'v0.0.1'
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
module.exports =
  name: 'Translator'
  author: [<a key={0} href="https://github.com/KochiyaOcean">KochiyaOcean</a>]
  displayName: <span><FontAwesome key={0} name='language' /> {__ ('Translator')}</span>
  description: '汇报建造数据、海域掉落数据、开发数据'
  show: false
  version: TRANSLATOR_VERSION
