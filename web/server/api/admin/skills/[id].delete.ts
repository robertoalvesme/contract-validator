import { getDb, skillsCol, ObjectId } from '../../../utils/db'
import { invalidateSkillsCache } from '../../../utils/skills'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  if (!ObjectId.isValid(id)) throw createError({ statusCode: 400, message: 'invalid id' })

  const db = await getDb()
  const result = await skillsCol(db).deleteOne({ _id: new ObjectId(id) })

  if (result.deletedCount === 0) throw createError({ statusCode: 404, message: 'skill not found' })
  invalidateSkillsCache()
  return { ok: true }
})
