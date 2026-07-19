import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { getDb, skillsCol } from '../utils/db'

export default defineNitroPlugin(async () => {
  try {
    const db = await getDb()
    const col = skillsCol(db)
    const count = await col.countDocuments()
    if (count > 0) return

    // Procura o JSON de seed nos locais padrão
    const candidates = [
      resolve('server/data/default_skills.json'),
      resolve('../default_skills.json'),
      resolve('default_skills.json'),
    ]

    for (const p of candidates) {
      if (!existsSync(p)) continue
      const raw: Array<{ skillName: string; relatedSkills: string[]; relatedMaterials: string[] }>
        = JSON.parse(readFileSync(p, 'utf8'))

      const docs = raw.map(s => ({
        name: s.skillName,
        relatedSkills: s.relatedSkills ?? [],
        relatedMaterials: s.relatedMaterials ?? [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }))

      await col.insertMany(docs)
      console.log(`[db] seeded ${docs.length} skills from ${p}`)
      return
    }

    console.warn('[db] seed file not found — collection will be empty')
  } catch (e: any) {
    console.error('[db] seed error:', e.message)
  }
})
