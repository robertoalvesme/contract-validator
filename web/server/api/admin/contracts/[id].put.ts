import { getDb, contractsCol, contractToDto, ObjectId } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const { name, code, skills } = body as { name: string; code: string; skills: string[] }

  if (!name?.trim() || !code?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'name and code are required' })
  }

  const db = await getDb()
  const col = contractsCol(db)

  const existing = await col.findOne({
    code: code.trim().toUpperCase(),
    _id: { $ne: new ObjectId(id) },
  })
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'A contract with this code already exists' })
  }

  const doc = await col.findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        skills: (skills ?? []).filter(Boolean),
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' },
  )

  if (!doc) throw createError({ statusCode: 404, statusMessage: 'Contract not found' })
  return contractToDto(doc)
})
