import { sync } from 'glob'
import path from 'path'
import { outputJson, readJson } from 'fs-extra'
import Bluebird from 'bluebird'
import { merge } from 'lodash'

const mergeJson = async (): Promise<void> => {
  const files = sync(path.resolve(global.ROOT, './i18n-source/**/en-US.json'))
  const data: Record<string, string>[] = await Bluebird.map<string, Record<string, string>>(
    files,
    (file) => readJson(file),
  )
  const final = merge({}, ...data) as Record<string, string>

  await outputJson(path.resolve(global.ROOT, './i18n/en-US.json'), final, {
    replacer: Object.keys(final).sort(),
  })
}

export default mergeJson
