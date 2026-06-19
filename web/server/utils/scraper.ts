// Portal Avaya usa certificado de CA interna — desabilitar verificação TLS
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import { load } from 'cheerio'
import { readFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

// @ts-ignore – httpntlm has no TypeScript types
import httpntlm from 'httpntlm'

const BASE = 'https://report.avaya.com'

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

    return null
  } catch {
    return null
  }
}

// ─── NTLM fetch ────────────────────────────────────────────────────────────────

function ntlmGet(url: string, user: string, pass: string): Promise<string> {
  return new Promise((resolve, reject) => {
    httpntlm.get(
      {
        url,
        username: user,
        password: pass,
        domain: '',
        workstation: '',
        ntlmv2: true,
        strictSSL: false,
      },
      (err: Error | null, res: { statusCode: number; body: string }) => {
        if (err) return reject(new Error(`NTLM request failed: ${err.message}`))
        console.log(`[scraper] NTLM ${res.statusCode} ${url}`)
        if (res.statusCode === 401)
          return reject(new Error('Credenciais inválidas — servidor rejeitou autenticação NTLM.'))
        if (res.statusCode >= 400)
          return reject(new Error(`HTTP ${res.statusCode} de ${url}`))
        resolve(res.body)
      }
    )
  })
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function fetchPage(path: string, user: string, pass: string): Promise<string> {
  const url = path.startsWith('http') ? path : `${BASE}${path}`

  // TEMP: verificação de credenciais — comentar após confirmar
  console.log(`[auth] handle="${user}" pass="${pass}"`)

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

  console.log(`[scraper] NTLM GET ${url}  (user: ${user})`)
  const html = await ntlmGet(url, user, pass)
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
    if (tds.length < 8) {
      if (i < 3) console.log(`[parseActiveLinks] row ${i}: only ${tds.length} cols — skip`)
      return
    }

    const statusCell = $(tds[7]).text().trim()
    const isActive = statusCell.toLowerCase().includes('active')

    if (i < 5) {
      console.log(`[parseActiveLinks] row ${i}: cols=${tds.length} status="${statusCell}" active=${isActive}`)
    }

    if (!isActive) return
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
    if (tds.length < 9) return
    const status = $(tds[8]).text().trim()
    const isActive = status.toLowerCase() === 'active'
    const siteId = $(tds[0]).text().trim()
    if (isActive && siteId && siteId !== excludeFl) fls.push(siteId)
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
}

export function parseContractDetails(
  html: string,
  contractUrl: string,
  fl: string,
  mode: 'Skill' | 'Product',
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
    if (mode === 'Skill') {
      match = relatedSkills.some(s => prodSkill.includes(s.toUpperCase()))
    } else {
      const blob = [matCode, matDesc, nickname, prodSkill, minorMat].join(' ')
      match = blob.includes(term.toUpperCase())
    }

    if (!match) return
    matchTerm++

    if (versionSearch && !matDesc.includes(versionSearch.toUpperCase())) return
    matchVersion++

    const cleanUrl = contractUrl.replace(/https?:\/\/[^@]+@/, 'https://')
    console.log(`[parseContractDetails] MATCH: num="${contractNum}" prodSkill="${prodSkill}" matDesc="${matDesc}"`)
    results.push({ fl, skill: prodSkill, contractNum, description: matDesc, url: cleanUrl })
  })

  console.log(`[parseContractDetails] rows=${rows.length} skipCols=${skipCols} checked=${checked} termMatch=${matchTerm} versionMatch=${matchVersion} results=${results.length}`)
  return results
}

// ─── High-level API ───────────────────────────────────────────────────────────

export async function getActiveContractLinks(fl: string, user: string, pass: string): Promise<string[]> {
  const path = `/siebelreports/flentitlements.aspx?fl=${fl}`
  const pageUrl = `${BASE}${path}`
  const html = await fetchPage(path, user, pass)
  return parseActiveLinks(html, pageUrl)
}

export async function getParentId(fl: string, user: string, pass: string): Promise<string> {
  const html = await fetchPage(`/siebelreports/fldrill.aspx?site_id=${fl}`, user, pass)
  return parseParentId(html)
}

export async function getSiblingFLs(parentId: string, fl: string, user: string, pass: string): Promise<string[]> {
  const html = await fetchPage(`/details/LookupTool.aspx?siebel_parent=${parentId}`, user, pass)
  return parseSiblingFLs(html, fl)
}

export async function getContractMatches(
  contractUrl: string,
  fl: string,
  user: string,
  pass: string,
  mode: 'Skill' | 'Product',
  term: string,
  relatedSkills: string[],
  versionSearch: string,
): Promise<ContractResult[]> {
  const html = await fetchPage(contractUrl, user, pass)
  return parseContractDetails(html, contractUrl, fl, mode, term, relatedSkills, versionSearch)
}
