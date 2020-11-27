import chalk from 'chalk'
import detectNewline from 'detect-newline'
import { flow, map } from 'lodash'
import util from 'util'
import childProcess from 'child_process'

/**
 * prettify diff result
 * @param {string} diff diff result
 * @returns {string} prettified result
 */
const prettifyDiff = flow([
  (str) => str.split(detectNewline.graceful(str)),
  (lines) => map(lines, (line) => (/^\+{1}(?!\+)/.test(line) ? chalk.green(line) : line)),
  (lines) => map(lines, (line) => (/^-{1}(?!-)/.test(line) ? chalk.red(line) : line)),
  (lines) => lines.join('\n'),
])

const execAsync = util.promisify(childProcess.exec)

const gitCheck = async () => {
  const { stdout: gitStatus } = await execAsync('git status -s')
  console.log(gitStatus)
  if (gitStatus) {
    console.log(chalk.red('some files updated, please check and commit them'))
    const { stdout: gitDiff } = await execAsync(
      'git diff -- . ":!i18n/en-US.json" ":!package-lock.json"',
    )
    console.log(prettifyDiff(gitDiff))
    process.exitCode = 1
  }
}

export default gitCheck
