import { getDb, skillsCol, contractsCol } from './db'

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

export async function getSkillNamesByProduct(productTerm: string): Promise<string[]> {
  if (!productTerm) return []
  const db = await getDb()
  const termUpper = productTerm.toUpperCase()
  const docs = await skillsCol(db).find({}).toArray()
  const matched = docs
    .filter(s => s.relatedMaterials.some(m => m.toUpperCase().includes(termUpper)))
    .map(s => s.name)
  console.log(`[getSkillNamesByProduct] term="${productTerm}" → skills: ${JSON.stringify(matched)}`)
  return matched
}

export async function getContractsBySkills(skillNames: string[]): Promise<{ nameSet: Set<string>; codeSet: Set<string> }> {
  if (!skillNames.length) return { nameSet: new Set<string>(), codeSet: new Set<string>() }
  const db = await getDb()
  console.log(`[getContractsBySkills] query skills $in: ${JSON.stringify(skillNames)}`)
  const docs = await contractsCol(db).find({ skills: { $in: skillNames } }).toArray()
  console.log(`[getContractsBySkills] found ${docs.length} contract(s): ${JSON.stringify(docs.map(c => ({ name: c.name, code: c.code, skills: c.skills })))}`)
  return {
    nameSet: new Set(docs.map(c => c.name.toUpperCase())),
    codeSet: new Set(docs.filter(c => c.code).map(c => c.code.toUpperCase())),
  }
}
