import { describe, expect, it } from 'vitest'
import { evaluateGracePeriod, parseAgreeDate } from '../gracePeriod'

const NOW = new Date('2026-08-10T12:00:00Z')

describe('parseAgreeDate', () => {
  it('parses an ISO yyyy-mm-dd date', () => {
    expect(parseAgreeDate('2026-08-10')?.toISOString()).toBe('2026-08-10T00:00:00.000Z')
  })

  it('returns null for empty or malformed values', () => {
    expect(parseAgreeDate('')).toBeNull()
    expect(parseAgreeDate('not-a-date')).toBeNull()
  })
})

describe('evaluateGracePeriod — Active', () => {
  it('always includes Active contracts, never flagged as grace period', () => {
    expect(evaluateGracePeriod('Active', '2020-01-01', '2020-01-01', NOW))
      .toEqual({ included: true, isGracePeriod: false })
  })
})

describe('evaluateGracePeriod — Pending', () => {
  it('excludes a Pending contract more than 30 days before its start date', () => {
    // now = 2026-08-10, start 31 days out
    const result = evaluateGracePeriod('Pending', '2026-09-10', '', NOW)
    expect(result).toEqual({ included: false, isGracePeriod: false })
  })

  it('includes a Pending contract exactly 30 days before its start date', () => {
    const result = evaluateGracePeriod('Pending', '2026-09-09', '', NOW)
    expect(result).toEqual({ included: true, isGracePeriod: true })
  })

  it('includes a Pending contract within the 30-day window', () => {
    const result = evaluateGracePeriod('Pending', '2026-08-20', '', NOW)
    expect(result).toEqual({ included: true, isGracePeriod: true })
  })

  it('includes a Pending contract whose start date has already passed', () => {
    const result = evaluateGracePeriod('Pending', '2026-08-01', '', NOW)
    expect(result).toEqual({ included: true, isGracePeriod: true })
  })

  it('excludes a Pending contract with no parseable start date', () => {
    expect(evaluateGracePeriod('Pending', '', '', NOW)).toEqual({ included: false, isGracePeriod: false })
  })
})

describe('evaluateGracePeriod — Expired / Cancelled', () => {
  it('includes an Expired contract within 60 days of its end date', () => {
    const result = evaluateGracePeriod('Expired', '2020-01-01', '2026-07-15', NOW)
    expect(result).toEqual({ included: true, isGracePeriod: true })
  })

  it('includes an Expired contract exactly 60 days after its end date', () => {
    const result = evaluateGracePeriod('Expired', '2020-01-01', '2026-06-11', NOW)
    expect(result).toEqual({ included: true, isGracePeriod: true })
  })

  it('excludes an Expired contract more than 60 days after its end date', () => {
    const result = evaluateGracePeriod('Expired', '2020-01-01', '2026-06-10', NOW)
    expect(result).toEqual({ included: false, isGracePeriod: false })
  })

  it('includes a Cancelled contract within the 60-day grace window', () => {
    const result = evaluateGracePeriod('Cancelled', '2020-01-01', '2026-07-15', NOW)
    expect(result).toEqual({ included: true, isGracePeriod: true })
  })

  it('excludes a Cancelled contract past the 60-day grace window', () => {
    const result = evaluateGracePeriod('Cancelled', '2020-01-01', '2026-01-01', NOW)
    expect(result).toEqual({ included: false, isGracePeriod: false })
  })

  it('excludes an Expired contract with no parseable end date', () => {
    expect(evaluateGracePeriod('Expired', '', '', NOW)).toEqual({ included: false, isGracePeriod: false })
  })
})

describe('evaluateGracePeriod — other statuses', () => {
  it('excludes unknown/blank statuses', () => {
    expect(evaluateGracePeriod('', '2026-01-01', '2026-01-01', NOW)).toEqual({ included: false, isGracePeriod: false })
    expect(evaluateGracePeriod('Draft', '2026-01-01', '2026-01-01', NOW)).toEqual({ included: false, isGracePeriod: false })
  })
})
