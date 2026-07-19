import { parseContractDetails } from '../../utils/scraper'

export default defineEventHandler(async (event) => {
  const body = await readBody(event) as {
    html: string
    contractUrl: string
    fl: string
    mode: 'Skill' | 'Product' | 'MaterialCode'
    term: string
    relatedSkills: string[]
    version: string
  }
  const { html, contractUrl, fl, mode, term, relatedSkills, version } = body

  const versionSearch = version ? `R${version}` : ''
  const matches = parseContractDetails(html, contractUrl, fl, mode, term, relatedSkills, versionSearch)

  return { matches }
})
