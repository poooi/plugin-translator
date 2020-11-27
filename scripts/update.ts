import getUpdateFromMediaWiki from './mediawiki'
import mergeJson from './merge-json'
import gitCheck from './git-check'

const main = async (): Promise<void> => {
  try {
    await getUpdateFromMediaWiki()
    await mergeJson()
    // await gitCheck()
  } catch (e) {
    console.log(e)
    process.exitCode = 1
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main()
