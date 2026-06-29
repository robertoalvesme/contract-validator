import { getDb, contractsCol, contractToDto } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { name, code, skills } = body as { name: string; code: string; skills: string[] }

  if (!name?.trim() || !code?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'name and code are required' })
  }

  const db = await getDb()
  const col = contractsCol(db)

  const existing = await col.findOne({ code: code.trim().toUpperCase() })
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'A contract with this code already exists' })
  }

  const now = new Date()
  const result = await col.insertOne({
    name: name.trim(),
    code: code.trim().toUpperCase(),
    skills: (skills ?? []).filter(Boolean),
    createdAt: now,
    updatedAt: now,
  })

  const doc = await col.findOne({ _id: result.insertedId })
  return contractToDto(doc!)
})
