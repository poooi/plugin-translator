import i18next, { TFunction } from 'i18next'
import path from 'path'
import _ from 'lodash'
import { readJsonSync } from 'fs-extra'

export const TRANSLATOR_VERSION = '2018.2.3'
export const show = false

const i18n = i18next.createInstance()

interface PoiI18nResources {
  fixedT?: TFunction
  __?: TFunction
  __n?: TFunction
  setLocale?: () => void
}

declare global {
  interface Window {
    language: string
    isMain: boolean
    i18n: {
      resources?: PoiI18nResources
      translator?: PoiI18nResources
    }
  }
}

const readOrIgnoreJsonSync = (p: string): Record<string, string> => {
  try {
    return readJsonSync(p) as Record<string, string>
  } catch (e) {
    return {}
  }
}

export const pluginDidLoad = async (): Promise<void> => {
  if (window.isMain) {
    return
  }
  if (!window.i18n) {
    window.i18n = {}
  }

  const resourceI18n = _(['ko-KR', 'en-US', 'ja-JP', 'zh-CN', 'zh-TW'])
    .map((locale) => [
      locale,
      {
        translator: readOrIgnoreJsonSync(path.join(__dirname, 'i18n', `${locale}.json`)),
      },
    ])
    .fromPairs()
    .value()

  try {
    await i18n.init({
      fallbackLng: false,
      resources: resourceI18n,
      keySeparator: false,
    })

    window.i18n.resources = {
      fixedT: i18n.getFixedT(window.language, 'translator'),
    }

    window.i18n.resources.__ = window.i18n.resources.fixedT
    window.i18n.resources.__n = window.i18n.resources.fixedT
    window.i18n.resources.setLocale = () => {} // eslint-disable-line @typescript-eslint/no-empty-function

    window.i18n.translator = window.i18n.resources
  } catch (e) {
    console.error(e)
  }
}
