import getUpdateFromMediaWiki from './mediawiki'
import getUpdateFromWikiaPage from './web'
import mergeJson from './merge-json'
import gitCheck from './git-check'

const main = async () => {
  await getUpdateFromWikiaPage()
  try {
    await Promise.all([getUpdateFromMediaWiki(), getUpdateFromWikiaPage()])
    await mergeJson()
    await gitCheck()
  } catch (e) {
    console.log(e)
  }
}

main()
