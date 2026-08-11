import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  parseActiveLinks,
  parseContractDetails,
  parseEntitlementDirectMatches,
} from '../scraper'
import { detailRow, entitlementRow, tableHtml } from './htmlFixtures'

const NOW = new Date('2026-08-10T12:00:00Z')
const PAGE_URL = 'https://report.avaya.com/siebelreports/flentitlements.aspx?fl=0051969849'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('parseActiveLinks', () => {
  it('includes Active contracts', () => {
    const html = tableHtml([
      entitlementRow({ agreeNum: '1-active-1', agreeStatus: 'Active' }),
    ])
    const links = parseActiveLinks(html, PAGE_URL)
    expect(links).toHaveLength(1)
    expect(links[0]).toContain('agree_num=1-active-1')
  })

  it('includes Pending contracts within the 30-day grace window and excludes those outside it', () => {
    const html = tableHtml([
      entitlementRow({ agreeNum: '1-pending-in', agreeStatus: 'Pending', agreeStart: '2026-08-20' }),
      entitlementRow({ agreeNum: '1-pending-out', agreeStatus: 'Pending', agreeStart: '2026-09-10' }),
    ])
    const links = parseActiveLinks(html, PAGE_URL)
    expect(links).toHaveLength(1)
    expect(links[0]).toContain('agree_num=1-pending-in')
  })

  it('includes Expired/Cancelled contracts within the 60-day grace window and excludes those outside it', () => {
    const html = tableHtml([
      entitlementRow({ agreeNum: '1-expired-in', agreeStatus: 'Expired', agreeEnd: '2026-07-15' }),
      entitlementRow({ agreeNum: '1-expired-out', agreeStatus: 'Expired', agreeEnd: '2026-06-10' }),
      entitlementRow({ agreeNum: '1-cancelled-in', agreeStatus: 'Cancelled', agreeEnd: '2026-07-15' }),
    ])
    const links = parseActiveLinks(html, PAGE_URL)
    expect(links.map(l => l.includes('1-expired-in') || l.includes('1-cancelled-in'))).toEqual([true, true])
    expect(links.some(l => l.includes('1-expired-out'))).toBe(false)
  })

  it('excludes rows with no eligible status', () => {
    const html = tableHtml([
      entitlementRow({ agreeNum: '1-draft', agreeStatus: 'Draft' }),
    ])
    expect(parseActiveLinks(html, PAGE_URL)).toHaveLength(0)
  })
})

describe('parseContractDetails', () => {
  const url = 'https://user:pass@report.avaya.com/siebelreports/assetagree.aspx?fl=1&agree_num=1-00000000-1'

  it('matches by skill and includes material/date fields for Active rows', () => {
    const html = tableHtml([detailRow({ prodSkill: 'CM', agreeStatus: 'Active' })])
    const results = parseContractDetails(html, url, '0051969849', 'Skill', 'CM', ['CM'], '')
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      materialCode: '397134',
      agreeStart: '2020-01-01',
      agreeEnd: '2030-01-01',
      isGracePeriod: false,
      isSubscriptionPlan: false,
    })
    expect(results[0].url).not.toContain('user:pass@')
  })

  it('excludes a matching row when its Pending window has not opened yet', () => {
    const html = tableHtml([
      detailRow({ prodSkill: 'CM', agreeStatus: 'Pending', agreeStart: '2026-12-01' }),
    ])
    const results = parseContractDetails(html, url, '0051969849', 'Skill', 'CM', ['CM'], '')
    expect(results).toHaveLength(0)
  })

  it('includes a matching row within its Expired grace window and flags isGracePeriod', () => {
    const html = tableHtml([
      detailRow({ prodSkill: 'CM', agreeStatus: 'Expired', agreeEnd: '2026-07-15' }),
    ])
    const results = parseContractDetails(html, url, '0051969849', 'Skill', 'CM', ['CM'], '')
    expect(results).toHaveLength(1)
    expect(results[0].isGracePeriod).toBe(true)
  })

  it('still applies the version filter on top of the grace-period check', () => {
    const html = tableHtml([
      detailRow({ prodSkill: 'CM', matDesc: 'CM SUITE R9', agreeStatus: 'Active' }),
    ])
    const noMatch = parseContractDetails(html, url, '0051969849', 'Skill', 'CM', ['CM'], 'R10')
    expect(noMatch).toHaveLength(0)

    const match = parseContractDetails(html, url, '0051969849', 'Skill', 'CM', ['CM'], 'R9')
    expect(match).toHaveLength(1)
  })
})

describe('parseEntitlementDirectMatches', () => {
  it('flags a Subscription Plan match with its plan name and Svc Mat Desc', () => {
    const html = tableHtml([
      entitlementRow({ agreeNum: '1-plan-1', svcMatCode: 'PLANCODE', svcMatDesc: 'PLAN SERVICE DESC' }),
    ])
    const planNameByIdentifier = new Map([['PLANCODE', 'OPERATE STD VOICE AOS']])
    const results = parseEntitlementDirectMatches(
      html, PAGE_URL, '0051969849',
      new Set(), new Set(['PLANCODE']),
      '', 'CM', undefined, planNameByIdentifier,
    )
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      isSubscriptionPlan: true,
      subscriptionPlanName: 'OPERATE STD VOICE AOS',
      svcMatDesc: 'PLAN SERVICE DESC',
      materialCode: 'PLANCODE',
    })
  })

  it('matches by free-text product term without flagging a Subscription Plan', () => {
    const html = tableHtml([
      entitlementRow({ agreeNum: '1-term-1', svcMatDesc: 'SOME PRODUCT DESC' }),
    ])
    const results = parseEntitlementDirectMatches(
      html, PAGE_URL, '0051969849',
      new Set(), new Set(),
      'SOME PRODUCT', 'skill-label',
    )
    expect(results).toHaveLength(1)
    expect(results[0].isSubscriptionPlan).toBe(false)
    expect(results[0].subscriptionPlanName).toBeUndefined()
  })

  it('respects the grace period window for non-Active entitlement rows', () => {
    const html = tableHtml([
      entitlementRow({ agreeNum: '1-pending-in', agreeStatus: 'Pending', agreeStart: '2026-08-15', svcMatDesc: 'MATCH ME' }),
      entitlementRow({ agreeNum: '1-pending-out', agreeStatus: 'Pending', agreeStart: '2026-12-25', svcMatDesc: 'MATCH ME' }),
    ])
    const results = parseEntitlementDirectMatches(
      html, PAGE_URL, '0051969849',
      new Set(), new Set(),
      'MATCH ME', 'skill-label',
    )
    expect(results).toHaveLength(1)
    expect(results[0].contractNum).toBe('1-pending-in')
    expect(results[0].isGracePeriod).toBe(true)
  })

  it('deduplicates matches with the same agree number and material description', () => {
    const html = tableHtml([
      entitlementRow({ agreeNum: '1-dup-1', svcMatDesc: 'DUP DESC' }),
      entitlementRow({ agreeNum: '1-dup-1', svcMatDesc: 'DUP DESC' }),
    ])
    const results = parseEntitlementDirectMatches(
      html, PAGE_URL, '0051969849',
      new Set(), new Set(),
      'DUP DESC', 'skill-label',
    )
    expect(results).toHaveLength(1)
  })
})
