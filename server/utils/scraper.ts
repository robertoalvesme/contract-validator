// Portal Avaya usa certificado de CA interna — desabilitar verificação TLS
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import { load } from 'cheerio'
import { readFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { evaluateGracePeriod } from './gracePeriod'

const BASE = 'https://report.avaya.com'

// Proxy interno que resolve a autenticação SSO e devolve o HTML do relatório —
// substitui o login NTLM manual que a aplicação fazia antes.
const REPORT_PROXY = 'https://sdtools2.avaya.com/utility/get_report_html'

// ─── Mock mode (NUXT_MOCK=1 → lê arquivos de .tests/ em vez de bater no portal) ──

const MOCK_DIR = resolve(process.cwd(), '../.tests')
const USE_MOCK = process.env.NUXT_MOCK === '1' && existsSync(MOCK_DIR)

if (USE_MOCK) {
  console.log(`[scraper] MOCK MODE active — reading from ${MOCK_DIR}`)
}

function getMockFile(url: string): string | null {
  try {
    const u = new URL(url)
    const p = u.pathname

    if (p.endsWith('flentitlements.aspx'))
      return join(MOCK_DIR, `flentitlements_fl_${u.searchParams.get('fl')}.html`)

    if (p.endsWith('fldrill.aspx'))
      return join(MOCK_DIR, `fldrill-site_id-${u.searchParams.get('site_id')}.html`)

    if (p.endsWith('LookupTool.aspx'))
      return join(MOCK_DIR, `LookupTool-siebel_parent-${u.searchParams.get('siebel_parent')}.html`)

    if (p.endsWith('assetagree.aspx'))
      return join(MOCK_DIR, `assetagree-fl-${u.searchParams.get('fl')}_agree_num_${u.searchParams.get('agree_num')}.html`)

    if (p.endsWith('casedetails.aspx'))
      return join(MOCK_DIR, `casedetails_case_id_${u.searchParams.get('case_id')}.html`)

    return null
  } catch {
    return null
  }
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

export async function fetchPage(path: string): Promise<string> {
  const url = path.startsWith('http') ? path : `${BASE}${path}`

  if (USE_MOCK) {
    const mockFile = getMockFile(url)
    if (mockFile && existsSync(mockFile)) {
      console.log(`[scraper] MOCK  ${url}\n          → ${mockFile}`)
      return readFileSync(mockFile, 'utf8')
    }
    const err = `Mock file not found for: ${url}`
    console.warn(`[scraper] ${err}`)
    throw new Error(err)
  }

  const proxyUrl = `${REPORT_PROXY}?server_url=${encodeURIComponent(url)}`
  console.log(`[scraper] GET ${proxyUrl}`)
  const res = await fetch(proxyUrl)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} de ${proxyUrl}`)
  }
  const html = await res.text()
  const tableCount = (html.match(/<table/gi) ?? []).length
  console.log(`[scraper] body ${html.length} chars, ${tableCount} table(s)`)
  return html
}

// ─── Resolve relative hrefs ───────────────────────────────────────────────────

function resolveHref(href: string, base: string): string {
  try {
    return new URL(href, base).toString()
  } catch {
    return href
  }
}

// ─── Parsers ──────────────────────────────────────────────────────────────────

export function parseActiveLinks(html: string, pageUrl: string): string[] {
  const $ = load(html)
  const rows = $('table.tableBorder tr')
  console.log(`[parseActiveLinks] table.tableBorder rows: ${rows.length}`)

  const links: string[] = []
  let activeCount = 0
  let noLinkCount = 0

  rows.each((i, row) => {
    const tds = $(row).find('td')
    if (tds.length < 10) {
      if (i < 3) console.log(`[parseActiveLinks] row ${i}: only ${tds.length} cols — skip`)
      return
    }

    const statusCell = $(tds[7]).text().trim()
    const startCell = $(tds[8]).text().trim()
    const endCell = $(tds[9]).text().trim()
    const { included } = evaluateGracePeriod(statusCell, startCell, endCell)

    if (i < 5) {
      console.log(`[parseActiveLinks] row ${i}: cols=${tds.length} status="${statusCell}" included=${included}`)
    }

    if (!included) return
    activeCount++

    const href = $(tds[2]).find('a').attr('href')
    if (!href) { noLinkCount++; return }
    links.push(resolveHref(href, pageUrl))
  })

  console.log(`[parseActiveLinks] active=${activeCount} with-link=${links.length} no-link=${noLinkCount}`)
  return links
}

export function parseParentId(html: string): string {
  const id = load(html)('#lblParentId').text().trim()
  console.log(`[parseParentId] lblParentId="${id}"`)
  return id
}

export function parseSiblingFLs(html: string, excludeFl: string): string[] {
  const $ = load(html)
  const rows = $('table.tableBorder tr')
  console.log(`[parseSiblingFLs] rows=${rows.length} excludeFl=${excludeFl}`)

  const fls: string[] = []

  rows.each((_, row) => {
    const tds = $(row).find('td')
    if (tds.length < 10) return
    const status = $(tds[8]).text().trim()
    const isActive = status.toLowerCase() === 'active'
    const hasAgreement = $(tds[9]).find('a').length > 0 || $(tds[9]).text().trim() !== ''
    const siteId = $(tds[0]).text().trim()
    if (isActive && hasAgreement && siteId && siteId !== excludeFl) fls.push(siteId)
  })

  console.log(`[parseSiblingFLs] sibling FLs: ${JSON.stringify(fls)}`)
  return fls
}

export interface ContractResult {
  fl: string
  skill: string
  contractNum: string
  description: string
  url: string
  materialCode: string
  status: string
  agreeStart: string
  agreeEnd: string
  isGracePeriod: boolean
  isSubscriptionPlan: boolean
  subscriptionPlanName?: string
  svcMatDesc?: string
}

export function parseContractDetails(
  html: string,
  contractUrl: string,
  fl: string,
  mode: 'Skill' | 'Product' | 'MaterialCode',
  term: string,
  relatedSkills: string[],
  versionSearch: string,
): ContractResult[] {
  const $ = load(html)
  const rows = $('table.tableBorder tr')

  console.log(`[parseContractDetails] FL=${fl} mode=${mode} term="${term}" relatedSkills=${JSON.stringify(relatedSkills)} version="${versionSearch}"`)
  console.log(`[parseContractDetails] total rows: ${rows.length}`)

  const results: ContractResult[] = []
  let skipCols = 0
  let checked = 0
  let matchTerm = 0
  let matchVersion = 0

  rows.each((i, row) => {
    const tds = $(row).find('td')
    if (tds.length < 20) { skipCols++; return }
    checked++

    const rowStatus   = $(tds[3]).text().trim()
    const rowStart    = $(tds[4]).text().trim()
    const rowEnd      = $(tds[5]).text().trim()
    const contractNum = $(tds[6]).text().trim()
    const matCode     = $(tds[8]).text().trim().toUpperCase()
    const matDesc     = $(tds[9]).text().trim().toUpperCase()
    const nickname    = $(tds[12]).text().trim().toUpperCase()
    const prodSkill   = $(tds[19]).text().trim().toUpperCase()
    const minorMat    = tds.length > 20 ? $(tds[20]).text().trim().toUpperCase() : ''

    if (checked <= 3) {
      console.log(`[parseContractDetails] row ${i}: num="${contractNum}" matCode="${matCode}" matDesc="${matDesc}" prodSkill="${prodSkill}"`)
    }

    let match = false
    if (mode === 'MaterialCode') {
      match = matCode.includes(term.toUpperCase())
    } else if (mode === 'Skill' || relatedSkills.length > 0) {
      // Skill mode always matches on Prod Skill. Product mode does the same whenever the
      // product term is registered to a Skill (relatedMaterials in the skills DB) — e.g.
      // product "AMS" is registered under Prod Skill "CM Services" — so the row's Prod
      // Skill column ("CM Services") is what must match, not the free-text term "AMS"
      // itself (which doesn't appear in the Material Desc for that row).
      match = relatedSkills.some(s => prodSkill.includes(s.toUpperCase()))
    } else {
      // Product mode with no registered Skill (e.g. a custom/free-text product name):
      // fall back to a free-text search across the identifying fields.
      const blob = [matCode, matDesc, nickname, prodSkill, minorMat].join(' ')
      match = blob.includes(term.toUpperCase())
    }

    if (!match) return
    matchTerm++

    if (versionSearch && !matDesc.includes(versionSearch.toUpperCase())) return
    matchVersion++

    const { included, isGracePeriod } = evaluateGracePeriod(rowStatus, rowStart, rowEnd)
    if (!included) return

    const cleanUrl = contractUrl.replace(/https?:\/\/[^@]+@/, 'https://')
    const skillLabel = mode === 'MaterialCode' ? matCode : prodSkill
    console.log(`[parseContractDetails] MATCH: num="${contractNum}" matCode="${matCode}" matDesc="${matDesc}" grace=${isGracePeriod}`)
    results.push({
      fl,
      skill: skillLabel,
      contractNum,
      description: matDesc,
      url: cleanUrl,
      materialCode: matCode,
      status: rowStatus,
      agreeStart: rowStart,
      agreeEnd: rowEnd,
      isGracePeriod,
      isSubscriptionPlan: false,
    })
  })

  console.log(`[parseContractDetails] rows=${rows.length} skipCols=${skipCols} checked=${checked} termMatch=${matchTerm} versionMatch=${matchVersion} results=${results.length}`)
  return results
}

export function parseEntitlementDirectMatches(
  html: string,
  pageUrl: string,
  fl: string,
  contractNames: Set<string>,
  contractCodes: Set<string>,
  directTerm: string,
  skillLabel: string,
  matCodeTerm?: string,
  planNameByIdentifier: Map<string, string> = new Map(),
): ContractResult[] {
  const $ = load(html)
  const rows = $('table.tableBorder tr')
  const results: ContractResult[] = []
  const seen = new Set<string>()

  console.log(`[parseEntitlementDirectMatches] FL=${fl} contractNames=${contractNames.size} contractCodes=${contractCodes.size} directTerm="${directTerm}" matCodeTerm="${matCodeTerm ?? ''}"`)

  rows.each((_, row) => {
    const tds = $(row).find('td')
    if (tds.length < 14) return

    const statusCell = $(tds[7]).text().trim()
    const startCell = $(tds[8]).text().trim()
    const endCell = $(tds[9]).text().trim()
    const { included, isGracePeriod } = evaluateGracePeriod(statusCell, startCell, endCell)
    if (!included) return

    const agreeNum = $(tds[2]).text().trim()
    const svcMatCode = $(tds[12]).text().trim().toUpperCase()
    const svcMatDesc = $(tds[13]).text().trim().toUpperCase()

    const allIdentifiers = new Set([...contractNames, ...contractCodes])
    const isSubscriptionPlan = allIdentifiers.size > 0 && (allIdentifiers.has(svcMatDesc) || allIdentifiers.has(svcMatCode))
    const termMatch = directTerm.length > 0 && svcMatDesc.includes(directTerm)
    const codeMatch = matCodeTerm ? svcMatCode.includes(matCodeTerm.toUpperCase()) : false
    const matched = isSubscriptionPlan || termMatch || codeMatch

    if (!matched || !agreeNum) return

    const key = `${agreeNum}|${svcMatDesc}`
    if (seen.has(key)) return
    seen.add(key)

    const label = matCodeTerm ? svcMatCode : skillLabel
    const subscriptionPlanName = isSubscriptionPlan
      ? (planNameByIdentifier.get(svcMatDesc) ?? planNameByIdentifier.get(svcMatCode))
      : undefined
    console.log(`[parseEntitlementDirectMatches] MATCH: agreeNum="${agreeNum}" svcMatCode="${svcMatCode}" svcMatDesc="${svcMatDesc}" plan=${isSubscriptionPlan} grace=${isGracePeriod}`)
    results.push({
      fl,
      skill: label,
      contractNum: agreeNum,
      description: svcMatDesc,
      url: pageUrl,
      materialCode: svcMatCode,
      status: statusCell,
      agreeStart: startCell,
      agreeEnd: endCell,
      isGracePeriod,
      isSubscriptionPlan,
      subscriptionPlanName,
      svcMatDesc: isSubscriptionPlan ? svcMatDesc : undefined,
    })
  })

  console.log(`[parseEntitlementDirectMatches] FL=${fl} directMatches=${results.length}`)
  return results
}

// ─── High-level API ───────────────────────────────────────────────────────────

export async function getEntitlementsPageData(
  fl: string,
): Promise<{ links: string[]; html: string; pageUrl: string }> {
  const path = `/siebelreports/flentitlements.aspx?fl=${fl}`
  const pageUrl = `${BASE}${path}`
  const html = await fetchPage(path)
  const links = parseActiveLinks(html, pageUrl)
  return { links, html, pageUrl }
}

export async function getActiveContractLinks(fl: string): Promise<string[]> {
  const { links } = await getEntitlementsPageData(fl)
  return links
}

export async function getParentId(fl: string): Promise<string> {
  const html = await fetchPage(`/siebelreports/fldrill.aspx?site_id=${fl}`)
  return parseParentId(html)
}

export async function getSiblingFLs(parentId: string, fl: string): Promise<string[]> {
  const html = await fetchPage(`/details/LookupTool.aspx?siebel_parent=${parentId}`)
  return parseSiblingFLs(html, fl)
}

export async function getContractMatches(
  contractUrl: string,
  fl: string,
  mode: 'Skill' | 'Product' | 'MaterialCode',
  term: string,
  relatedSkills: string[],
  versionSearch: string,
): Promise<ContractResult[]> {
  const html = await fetchPage(contractUrl)
  return parseContractDetails(html, contractUrl, fl, mode, term, relatedSkills, versionSearch)
}
