import {
  parseActiveLinks,
  parseEntitlementDirectMatches,
} from '../../utils/scraper'
import { getSkillsData, getSkillNamesByProduct, getContractsBySkills } from '../../utils/skills'

export default defineEventHandler(async (event) => {
  const body = await readBody(event) as {
    html: string
    pageUrl: string
    fl: string
    mode: 'Skill' | 'Product' | 'MaterialCode'
    term: string
  }
  const { html, pageUrl, fl, mode, term } = body

  const isMaterialCode = mode === 'MaterialCode'

  const { skillMap } = isMaterialCode ? { skillMap: {} as Record<string, string[]> } : await getSkillsData()
  const relatedSkills = mode === 'Skill' ? (skillMap[term] ?? [term]) : []

  const skillsForQuery = isMaterialCode
    ? []
    : mode === 'Skill' ? relatedSkills : await getSkillNamesByProduct(term)

  const { nameSet: contractNames, codeSet: contractCodes } = isMaterialCode
    ? { nameSet: new Set<string>(), codeSet: new Set<string>() }
    : await getContractsBySkills(skillsForQuery)

  const directTerm  = mode === 'Product' ? term.toUpperCase() : ''
  const matCodeTerm = isMaterialCode ? term.toUpperCase() : undefined
  const skillLabel  = term

  const links = parseActiveLinks(html, pageUrl)
  const directMatches = parseEntitlementDirectMatches(
    html, pageUrl, fl, contractNames, contractCodes, directTerm, skillLabel, matCodeTerm,
  )

  return {
    links,
    directMatches,
    relatedSkills,
    contractNames: [...contractNames],
    contractCodes: [...contractCodes],
  }
})
