import { createEventStream } from 'h3'
import { getSkillsData, getContractsBySkills, getSkillNamesByProduct } from '../utils/skills'
import {
  getEntitlementsPageData,
  parseEntitlementDirectMatches,
  getParentId,
  getSiblingFLs,
  getContractMatches,
} from '../utils/scraper'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const fl           = String(q.fl ?? '')
  const mode         = String(q.mode ?? 'Skill') as 'Skill' | 'Product'
  const term         = String(q.term ?? '')
  const version      = String(q.version ?? '')
  const searchParent = q.searchParent === '1'
  const user         = String(q.user ?? '')
  const pass         = String(q.pass ?? '')

  if (!fl || !term || !user || !pass) {
    throw createError({ statusCode: 400, message: 'Missing required parameters.' })
  }

  const stream = createEventStream(event)
  const versionSearch = version ? `R${version}` : ''
  const { skillMap } = await getSkillsData()
  const relatedSkills = mode === 'Skill' ? (skillMap[term] ?? [term]) : []

  const push = (eventName: string, data: unknown) =>
    stream.push({ event: eventName, data: JSON.stringify(data) })

  ;(async () => {
    try {
      // ── Build FL list ────────────────────────────────────────────────────
      const flList: string[] = [fl]

      if (searchParent) {
        await push('status', { message: 'Looking up Siebel Parent…' })
        try {
          const parentId = await getParentId(fl, user, pass)
          if (parentId) {
            await push('status', { message: `Parent found: ${parentId}. Getting siblings…` })
            const siblings = await getSiblingFLs(parentId, fl, user, pass)
            flList.push(...siblings)
            await push('status', {
              message: `${siblings.length} sibling FL(s) found. Reading contracts…`,
            })
          } else {
            await push('status', { message: 'No parent found for this FL.' })
          }
        } catch (e: any) {
          await push('status', { message: `Parent lookup skipped: ${e.message}` })
        }
      }

      // ── Load contracts from DB for direct entitlement matching ──────────
      const skillsForQuery = mode === 'Skill'
        ? relatedSkills
        : await getSkillNamesByProduct(term)

      const { nameSet: contractNames, codeSet: contractCodes } =
        await getContractsBySkills(skillsForQuery)

      const directTerm = mode === 'Product' ? term.toUpperCase() : ''

      console.log(`[search] mode=${mode} term="${term}" contractNames=${contractNames.size} contractCodes=${contractCodes.size} directTerm="${directTerm}"`)

      // ── Collect active contract links for every FL ────────────────────────
      type LinkEntry = { fl: string; url: string }
      const allLinks: LinkEntry[] = []
      let found = 0

      for (const currentFl of flList) {
        await push('status', { message: `Reading active contracts for FL ${currentFl}…` })
        try {
          const { links, html, pageUrl } = await getEntitlementsPageData(currentFl, user, pass)

          // Direct matches on Svc Mat Desc / Svc Mat Code in the entitlements page
          const directMatches = parseEntitlementDirectMatches(
            html, pageUrl, currentFl, contractNames, contractCodes, directTerm, term,
          )
          for (const m of directMatches) {
            await push('result', m)
            found++
          }

          for (const url of links) allLinks.push({ fl: currentFl, url })
          await push('status', {
            message: `FL ${currentFl}: ${links.length} active contract(s) found.`,
          })
        } catch (e: any) {
          await push('status', { message: `FL ${currentFl} skipped: ${e.message}` })
        }
      }

      // ── Check each contract for matching items ────────────────────────────

      for (const [i, { fl: contractFl, url }] of allLinks.entries()) {
        await push('status', {
          message: `FL ${contractFl}: checking contract ${i + 1} / ${allLinks.length}…`,
        })

        try {
          const matches = await getContractMatches(
            url, contractFl, user, pass, mode, term, relatedSkills, versionSearch,
          )
          for (const m of matches) {
            await push('result', m)
            found++
          }
        } catch (e: any) {
          console.error(`[search] contract error: ${e.message}`)
        }
      }

      await push('done', { total: found })
    } catch (e: any) {
      await push('error', { message: e.message })
    } finally {
      await stream.close()
    }
  })()

  return stream.send()
})
