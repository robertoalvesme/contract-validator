import { load } from 'cheerio'
import { Agent, fetch as undiciFetch } from 'undici'

const BASE = 'https://report.avaya.com'

// Shared insecure agent (SSL bypass — Avaya portal certs)
const agent = new Agent({ connect: { rejectUnauthorized: false } })

// ─── HTTP helper ─────────────────────────────────────────────────────────────

async function fetchPage(path: string, user: string, pass: string): Promise<string> {
  const url = path.startsWith('http') ? path : `${BASE}${path}`
  const creds = Buffer.from(`${user}:${pass}`).toString('base64')

  const res = await undiciFetch(url, {
    headers: {
      Authorization: `Basic ${creds}`,
      'User-Agent': 'Mozilla/5.0 (compatible; ContractFinder/2.0)',
      Accept: 'text/html,application/xhtml+xml',
    },
    dispatcher: agent,
    redirect: 'follow',
  } as any)

  if (res.status === 401) throw new Error('Invalid credentials — check your username and password.')
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`)

  return res.text()
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
  const links: string[] = []

  $('table.tableBorder tr').each((_, row) => {
    const tds = $(row).find('td')
    if (tds.length < 8) return
    if (!$(tds[7]).text().trim().includes('Active')) return
    const href = $(tds[2]).find('a').attr('href')
    if (href) links.push(resolveHref(href, pageUrl))
  })

  return links
}

export function parseParentId(html: string): string {
  return load(html)('#lblParentId').text().trim()
}

export function parseSiblingFLs(html: string, excludeFl: string): string[] {
  const $ = load(html)
  const fls: string[] = []

  $('table.tableBorder tr').each((_, row) => {
    const tds = $(row).find('td')
    if (tds.length < 9) return
    if ($(tds[8]).text().trim().toLowerCase() !== 'active') return
    const siteId = $(tds[0]).text().trim()
    if (siteId && siteId !== excludeFl) fls.push(siteId)
  })

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
  const results: ContractResult[] = []

  $('table.tableBorder tr').each((_, row) => {
    const tds = $(row).find('td')
    if (tds.length < 20) return

    const matCode   = $(tds[8]).text().trim().toUpperCase()
    const matDesc   = $(tds[9]).text().trim().toUpperCase()
    const nickname  = $(tds[12]).text().trim().toUpperCase()
    const prodSkill = $(tds[19]).text().trim().toUpperCase()
    const minorMat  = tds.length > 20 ? $(tds[20]).text().trim().toUpperCase() : ''
    const contractNum = $(tds[6]).text().trim()

    let match = false
    if (mode === 'Skill') {
      match = relatedSkills.some(s => prodSkill.includes(s.toUpperCase()))
    } else {
      const blob = [matCode, matDesc, nickname, prodSkill, minorMat].join(' ')
      match = blob.includes(term.toUpperCase())
    }

    if (!match) return
    if (versionSearch && !matDesc.includes(versionSearch.toUpperCase())) return

    // Strip embedded credentials from URL before returning to client
    const cleanUrl = contractUrl.replace(/https?:\/\/[^@]+@/, 'https://')

    results.push({ fl, skill: prodSkill, contractNum, description: matDesc, url: cleanUrl })
  })

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
