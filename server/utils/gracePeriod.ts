// Regras de "Grace Period": além dos contratos Active, atendemos:
// - Pending: a partir de 30 dias antes do Agree Start Date
// - Cancelled / Expired: até 60 dias após o Agree End Date

const PENDING_GRACE_DAYS = 30
const EXPIRED_GRACE_DAYS = 60
const DAY_MS = 24 * 60 * 60 * 1000

export interface GraceEvaluation {
  included: boolean
  isGracePeriod: boolean
}

export function parseAgreeDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim())
  if (!match) return null
  const [, y, m, d] = match
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)))
  return Number.isNaN(date.getTime()) ? null : date
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS)
}

function startOfDayUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

export function evaluateGracePeriod(
  status: string,
  agreeStart: string,
  agreeEnd: string,
  now: Date = new Date(),
): GraceEvaluation {
  const s = status.trim().toLowerCase()
  const today = startOfDayUTC(now)

  if (s.includes('active')) return { included: true, isGracePeriod: false }

  if (s.includes('pending')) {
    const start = parseAgreeDate(agreeStart)
    if (!start) return { included: false, isGracePeriod: false }
    const graceStart = addDays(start, -PENDING_GRACE_DAYS)
    const included = today >= graceStart
    return { included, isGracePeriod: included }
  }

  if (s.includes('cancel') || s.includes('expired')) {
    const end = parseAgreeDate(agreeEnd)
    if (!end) return { included: false, isGracePeriod: false }
    const graceEnd = addDays(end, EXPIRED_GRACE_DAYS)
    const included = today <= graceEnd
    return { included, isGracePeriod: included }
  }

  return { included: false, isGracePeriod: false }
}
