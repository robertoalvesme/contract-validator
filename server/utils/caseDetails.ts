import { load } from 'cheerio'
import { fetchPage } from './scraper'

export interface CaseDetails {
  fl: string
  skill: string
}

// Site é a FL da busca por FL (primeiro <a> dentro de #lFLCode — os demais são links
// auxiliares como "Assets by Product", "Agreements", "Contacts"). Operational Skill
// equivale ao campo Skill da busca por FL.
export function parseCaseDetails(html: string): CaseDetails {
  const $ = load(html)
  const fl = $('#lFLCode a').first().text().trim()
  const skill = $('#lOpSkill').text().trim()

  console.log(`[parseCaseDetails] fl="${fl}" skill="${skill}"`)
  return { fl, skill }
}

export async function getCaseDetails(sr: string): Promise<CaseDetails> {
  const html = await fetchPage(`/siebelreports/casedetails.aspx?case_id=${sr}`)
  return parseCaseDetails(html)
}
