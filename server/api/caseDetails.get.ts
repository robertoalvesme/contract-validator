import { getCaseDetails } from '../utils/caseDetails'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const sr = String(q.sr ?? '')

  if (!sr) {
    throw createError({ statusCode: 400, message: 'Missing required parameters.' })
  }

  const details = await getCaseDetails(sr)

  if (!details.fl) {
    throw createError({ statusCode: 404, message: `Site (FL) not found for SR ${sr}.` })
  }

  return details
})
