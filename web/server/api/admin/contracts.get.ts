import { getDb, contractsCol, contractToDto } from '../../utils/db'

export default defineEventHandler(async () => {
  const db = await getDb()
  const docs = await contractsCol(db).find({}).sort({ name: 1 }).toArray()
  return docs.map(contractToDto)
})
