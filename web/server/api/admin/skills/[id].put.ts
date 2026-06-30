import { getDb, skillsCol, toDto, ObjectId } from '../../../utils/db'
import { invalidateSkillsCache } from '../../../utils/skills'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  if (!ObjectId.isValid(id)) throw createError({ statusCode: 400, message: 'invalid id' })

  const body = await readBody(event)
  const name: string = (body.name ?? '').trim()
  if (!name) throw createError({ statusCode: 400, message: 'name is required' })

  const update = {
    name,
    relatedSkills: (body.relatedSkills ?? []) as string[],
    relatedMaterials: (body.relatedMaterials ?? []) as string[],
    updatedAt: new Date(),
  }

  const db = await getDb()
  const result = await skillsCol(db).findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: update },
    { returnDocument: 'after' },
  )

  if (!result) throw createError({ statusCode: 404, message: 'skill not found' })
  invalidateSkillsCache()
  return toDto(result)
})
