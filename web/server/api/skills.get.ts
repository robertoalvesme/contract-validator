import { skillsList, productsList } from '../utils/skills'

export default defineEventHandler(() => ({
  skills: skillsList,
  products: productsList,
}))
