import { getCaseDetails } from '../utils/caseDetails'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const sr   = String(q.sr ?? '')
  const user = String(q.user ?? '')
  const pass = String(q.pass ?? '')

  if (!sr || !user || !pass) {
    throw createError({ statusCode: 400, message: 'Missing required parameters.' })
  }

  const details = await getCaseDetails(sr, user, pass)

  if (!details.fl) {
    throw createError({ statusCode: 404, message: `Site (FL) not found for SR ${sr}.` })
  }

  return details
})
