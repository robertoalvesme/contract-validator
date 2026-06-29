import { getDb, skillsCol } from './db'

interface SkillsData {
  skillsList: string[]
  productsList: string[]
  skillMap: Record<string, string[]>
}

let _cache: { data: SkillsData; ts: number } | null = null
const TTL = 5 * 60 * 1000 // 5 minutes

export async function getSkillsData(): Promise<SkillsData> {
  if (_cache && Date.now() - _cache.ts < TTL) return _cache.data

  const db = await getDb()
  const all = await skillsCol(db).find({}).sort({ name: 1 }).toArray()

  const skillsList = all.map(s => s.name)

  const productsList = Array.from(
    new Set(all.flatMap(s => s.relatedMaterials.filter(Boolean))),
  ).sort()

  const skillMap = Object.fromEntries(
    all.map(s => [
      s.name,
      Array.from(new Set([s.name, ...s.relatedSkills.filter(Boolean)])),
    ]),
  )

  const data: SkillsData = { skillsList, productsList, skillMap }
  _cache = { data, ts: Date.now() }
  return data
}

export function invalidateSkillsCache() {
  _cache = null
}
