import { MongoClient, ObjectId, type Db, type Collection } from 'mongodb'

let _client: MongoClient | null = null

export async function getDb(): Promise<Db> {
  if (!_client) {
    const uri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/contract_finder'
    _client = new MongoClient(uri)
    await _client.connect()
    console.log('[db] connected to MongoDB')
  }
  return _client.db()
}

export interface SkillDoc {
  _id?: ObjectId
  name: string
  relatedSkills: string[]
  relatedMaterials: string[]
  createdAt?: Date
  updatedAt?: Date
}

export interface SkillDto {
  id: string
  name: string
  relatedSkills: string[]
  relatedMaterials: string[]
}

export function skillsCol(db: Db): Collection<SkillDoc> {
  return db.collection<SkillDoc>('skills')
}

export function toDto(doc: SkillDoc): SkillDto {
  return {
    id: doc._id!.toString(),
    name: doc.name,
    relatedSkills: doc.relatedSkills ?? [],
    relatedMaterials: doc.relatedMaterials ?? [],
  }
}

// ─── Contracts ────────────────────────────────────────────────────────────────

export interface ContractDoc {
  _id?: ObjectId
  name: string
  code: string
  skills: string[]   // skill names (denormalized)
  createdAt?: Date
  updatedAt?: Date
}

export interface ContractDto {
  id: string
  name: string
  code: string
  skills: string[]
}

export function contractsCol(db: Db): Collection<ContractDoc> {
  return db.collection<ContractDoc>('contracts')
}

export function contractToDto(doc: ContractDoc): ContractDto {
  return {
    id: doc._id!.toString(),
    name: doc.name,
    code: doc.code,
    skills: doc.skills ?? [],
  }
}

export { ObjectId }
