import { getDb, contractsCol, contractToDto } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { name, codes, skills } = body as { name: string; codes: string[]; skills: string[] }

  const cleanCodes = (codes ?? []).map(c => c.trim().toUpperCase()).filter(Boolean)
  if (!name?.trim() || cleanCodes.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'name and at least one code are required' })
  }

  const db = await getDb()
  const col = contractsCol(db)

  const existing = await col.findOne({ codes: { $in: cleanCodes } })
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'A contract with one of these codes already exists' })
  }

  const now = new Date()
  const result = await col.insertOne({
    name: name.trim(),
    codes: cleanCodes,
    skills: (skills ?? []).filter(Boolean),
    createdAt: now,
    updatedAt: now,
  })

  const doc = await col.findOne({ _id: result.insertedId })
  return contractToDto(doc!)
})
