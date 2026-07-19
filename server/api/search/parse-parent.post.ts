import { parseParentId, parseSiblingFLs } from '../../utils/scraper'

export default defineEventHandler(async (event) => {
  const body = await readBody(event) as {
    drillHtml: string
    lookupHtml: string
    fl: string
  }
  const { drillHtml, lookupHtml, fl } = body

  const parentId  = parseParentId(drillHtml)
  const siblings  = parentId ? parseSiblingFLs(lookupHtml, fl) : []

  return { parentId, siblings }
})
