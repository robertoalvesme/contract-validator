import { getDb, contractsCol, ObjectId } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const db = await getDb()
  const result = await contractsCol(db).deleteOne({ _id: new ObjectId(id) })
  if (result.deletedCount === 0) throw createError({ statusCode: 404, statusMessage: 'Contract not found' })
  return { ok: true }
})
