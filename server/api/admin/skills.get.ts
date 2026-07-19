import { getDb, skillsCol, toDto } from '../../utils/db'

export default defineEventHandler(async () => {
  const db = await getDb()
  const docs = await skillsCol(db).find({}).sort({ name: 1 }).toArray()
  return docs.map(toDto)
})
