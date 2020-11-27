import getUpdateFromMediaWiki from './mediawiki'
import mergeJson from './merge-json'
import gitCheck from './git-check'

const main = async () => {
  try {
    await getUpdateFromMediaWiki()
    await mergeJson()
    await gitCheck()
  } catch (e) {
    console.log(e)
  }
}

main()
