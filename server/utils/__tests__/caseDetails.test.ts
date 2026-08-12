import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseCaseDetails } from '../caseDetails'

function loadFixture(name: string): string {
  return readFileSync(resolve(__dirname, '../../../.tests', name), 'utf8')
}

describe('parseCaseDetails', () => {
  it('extracts the Site (FL) and Operational Skill from case_id 1-23759529231', () => {
    const html = loadFixture('casedetails_case_id_1-23759529231.html')
    expect(parseCaseDetails(html)).toEqual({ fl: '0052084920', skill: 'IP Office' })
  })

  it('extracts the Site (FL) and Operational Skill from case_id 1-23647154562', () => {
    const html = loadFixture('casedetails_case_id_1-23647154562.html')
    expect(parseCaseDetails(html)).toEqual({ fl: '0052016424', skill: 'Workforce Management' })
  })

  it('takes the first link in #lFLCode, ignoring the other action links', () => {
    const html = `
      <span id="lFLCode" class="blacktext">
        <a href="/siebelreports/fldrill.aspx?site_id=0050094464">0050094464</a><br />
        <a href="/siebelreports/flassets.aspx?fl=0050094464">Assets by Product</a>
      </span>
      <span id="lOpSkill" class="blacktext">IP Office</span>
    `
    expect(parseCaseDetails(html)).toEqual({ fl: '0050094464', skill: 'IP Office' })
  })

  it('returns empty strings when the expected elements are missing', () => {
    expect(parseCaseDetails('<html><body>no data here</body></html>')).toEqual({ fl: '', skill: '' })
  })
})
