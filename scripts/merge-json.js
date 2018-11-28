import glob from 'glob'
import path from 'path'
import { outputJson, readJson } from 'fs-extra'
import Promise from 'bluebird'
import { merge } from 'lodash'

const mergeJson = async () => {
  const files = glob.sync(path.resolve(global.ROOT, './i18n-source/**/en-US.json'))
  const data = await Promise.map(files, file => readJson(file))
  const final = merge({}, ...data)

  await outputJson(path.resolve(global.ROOT, './i18n/en-US.json'), final, {
    replacer: Object.keys(final).sort(),
  })
}

export default mergeJson
