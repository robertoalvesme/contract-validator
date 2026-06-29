import { getSkillsData } from '../utils/skills'

export default defineEventHandler(async () => {
  const { skillsList, productsList } = await getSkillsData()
  return { skills: skillsList, products: productsList }
})
