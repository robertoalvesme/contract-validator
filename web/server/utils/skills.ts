import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

interface SkillEntry {
  skillName: string
  relatedSkills: string[]
  relatedMaterials: string[]
}

function loadRaw(): SkillEntry[] {
  // Search for the JSON in order: bundled → sibling of server/ → project root
  const candidates = [
    resolve('server/data/default_skills.json'),
    resolve('../default_skills.json'),
    resolve('default_skills.json'),
  ]
  for (const p of candidates) {
    if (existsSync(p)) {
      try {
        const raw = JSON.parse(readFileSync(p, 'utf8'))
        // Support legacy dict format
        if (!Array.isArray(raw)) {
          return Object.entries(raw as Record<string, any>).map(([k, v]) => ({
            skillName: k,
            relatedSkills: v.relatedSkill ?? [],
            relatedMaterials: v.relatedMaterial ?? [],
          }))
        }
        return raw
      } catch {}
    }
  }
  console.warn('[skills] default_skills.json not found — skill map will be empty')
  return []
}

const _skills = loadRaw()

export const skillsList: string[] = _skills.map(s => s.skillName).sort()

export const productsList: string[] = Array.from(
  new Set(_skills.flatMap(s => s.relatedMaterials.filter(Boolean))),
).sort()

export const skillMap: Record<string, string[]> = Object.fromEntries(
  _skills.map(s => [
    s.skillName,
    Array.from(new Set([s.skillName, ...s.relatedSkills.filter(Boolean)])),
  ]),
)
