import { getDb, contractsCol } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { content } = body as { content: string }

  if (!content?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'TSV content is required' })
  }

  const lines = content.split('\n').map(l => l.trimEnd())
  // Skip header row
  const dataLines = lines.slice(1).filter(l => l.trim())

  const db = await getDb()
  const col = contractsCol(db)

  let created = 0
  let updated = 0
  const errors: string[] = []

  for (const line of dataLines) {
    const cols = line.split('\t')
    const name = cols[0]?.trim()
    // col[1] (Covered Products) is ignored
    const codesRaw = cols[2]?.trim() ?? ''

    if (!name) continue

    const codes = codesRaw
      .split(',')
      .map(c => c.trim().toUpperCase())
      .filter(Boolean)

    if (codes.length === 0) {
      errors.push(`"${name}": nenhum código encontrado, ignorado`)
      continue
    }

    try {
      const existing = await col.findOne({ name })
      if (existing) {
        await col.updateOne(
          { _id: existing._id },
          { $set: { codes, updatedAt: new Date() } },
        )
        updated++
      } else {
        await col.insertOne({
          name,
          codes,
          skills: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        created++
      }
    } catch (e: any) {
      errors.push(`"${name}": ${e.message}`)
    }
  }

  return { created, updated, errors }
})
