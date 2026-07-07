import { getDb, contractsCol, contractToDto, ObjectId } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const { name, codes, skills } = body as { name: string; codes: string[]; skills: string[] }

  const cleanCodes = (codes ?? []).map(c => c.trim().toUpperCase()).filter(Boolean)
  if (!name?.trim() || cleanCodes.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'name and at least one code are required' })
  }

  const db = await getDb()
  const col = contractsCol(db)

  const existing = await col.findOne({
    codes: { $in: cleanCodes },
    _id: { $ne: new ObjectId(id) },
  })
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'A contract with one of these codes already exists' })
  }

  const doc = await col.findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        name: name.trim(),
        codes: cleanCodes,
        skills: (skills ?? []).filter(Boolean),
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' },
  )

  if (!doc) throw createError({ statusCode: 404, statusMessage: 'Contract not found' })
  return contractToDto(doc)
})
