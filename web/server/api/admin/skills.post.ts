import { getDb, skillsCol, toDto } from '../../utils/db'
import { invalidateSkillsCache } from '../../utils/skills'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const name: string = (body.name ?? '').trim()
  if (!name) throw createError({ statusCode: 400, message: 'name is required' })

  const doc = {
    name,
    relatedSkills: (body.relatedSkills ?? []) as string[],
    relatedMaterials: (body.relatedMaterials ?? []) as string[],
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const db = await getDb()
  const result = await skillsCol(db).insertOne(doc)
  invalidateSkillsCache()

  return toDto({ _id: result.insertedId, ...doc })
})
