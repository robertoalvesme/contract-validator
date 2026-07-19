import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { getDb, skillsCol, contractsCol } from '../utils/db'

export default defineNitroPlugin(async () => {
  try {
    const db = await getDb()
    await seedSkills(db)
    await seedContracts(db)
  } catch (e: any) {
    console.error('[db] seed error:', e.message)
  }
})

async function seedSkills(db: Awaited<ReturnType<typeof getDb>>) {
  const col = skillsCol(db)
  if (await col.countDocuments() > 0) return

  const candidates = [
    resolve('server/data/default_skills.json'),
    resolve('../default_skills.json'),
    resolve('default_skills.json'),
  ]

  for (const p of candidates) {
    if (!existsSync(p)) continue
    const raw: Array<{ skillName: string; relatedSkills: string[]; relatedMaterials: string[] }>
      = JSON.parse(readFileSync(p, 'utf8'))

    const now = new Date()
    await col.insertMany(raw.map(s => ({
      name: s.skillName,
      relatedSkills: s.relatedSkills ?? [],
      relatedMaterials: s.relatedMaterials ?? [],
      createdAt: now,
      updatedAt: now,
    })))
    console.log(`[db] seeded ${raw.length} skills from ${p}`)
    return
  }

  console.warn('[db] skills seed file not found — collection will be empty')
}

async function seedContracts(db: Awaited<ReturnType<typeof getDb>>) {
  const col = contractsCol(db)
  if (await col.countDocuments() > 0) return

  const candidates = [
    resolve('server/data/default_contracts.json'),
    resolve('../default_contracts.json'),
    resolve('default_contracts.json'),
  ]

  for (const p of candidates) {
    if (!existsSync(p)) continue
    const raw: Array<{ name: string; codes: string[]; skills: string[] }>
      = JSON.parse(readFileSync(p, 'utf8'))

    const now = new Date()
    await col.insertMany(raw.map(c => ({
      name: c.name,
      codes: (c.codes ?? []).map(code => code.trim().toUpperCase()).filter(Boolean),
      skills: c.skills ?? [],
      createdAt: now,
      updatedAt: now,
    })))
    console.log(`[db] seeded ${raw.length} contracts from ${p}`)
    return
  }

  console.warn('[db] contracts seed file not found — collection will be empty')
}
