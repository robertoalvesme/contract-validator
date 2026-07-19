const BASE = 'https://report.avaya.com'

export interface ContractResult {
  fl: string
  skill: string
  contractNum: string
  description: string
  url: string
}

export interface SearchParams {
  fl: string
  mode: 'Skill' | 'Product' | 'MaterialCode'
  term: string
  version: string
  searchParent: boolean
}

// Faz fetch direto do browser para o portal Avaya.
// credentials: 'include' → o browser usa o NTLM/Kerberos do Windows automaticamente.
async function avayaFetch(url: string): Promise<string> {
  const res = await fetch(url, {
    credentials: 'include',
    mode: 'cors',
  })
  // NTLM: o browser reexecuta automaticamente após 401 — o JS só vê o 200 final.
  if (!res.ok) throw new Error(`HTTP ${res.status} de ${url}`)
  return res.text()
}

export function useAvayaSearch() {
  const results     = ref<ContractResult[]>([])
  const logs        = ref<string[]>([])
  const isSearching = ref(false)
  const statusColor = ref<'gray' | 'orange' | 'green' | 'red'>('gray')

  let aborted = false

  function log(msg: string) { logs.value.push(msg) }

  async function startSearch(params: SearchParams) {
    aborted       = false
    isSearching.value  = true
    statusColor.value  = 'orange'
    results.value      = []
    logs.value         = ['Connecting…']

    try {
      const flList: string[] = [params.fl]

      // ── Busca FLs irmãos se necessário ────────────────────────────────────
      if (params.searchParent) {
        log('Looking up Siebel Parent…')
        try {
          const drillUrl  = `${BASE}/siebelreports/fldrill.aspx?site_id=${params.fl}`
          const drillHtml = await avayaFetch(drillUrl)

          const lookupUrl  = `${BASE}/details/LookupTool.aspx?siebel_parent=PLACEHOLDER`
          // Precisamos do parentId antes de montar a URL — o server extrai do HTML
          const parentResp = await $fetch('/api/search/parse-parent', {
            method: 'POST',
            body: { drillHtml, lookupHtml: '', fl: params.fl },
          }) as { parentId: string; siblings: string[] }

          if (parentResp.parentId) {
            log(`Parent found: ${parentResp.parentId}. Getting siblings…`)
            const lookupHtml = await avayaFetch(
              `${BASE}/details/LookupTool.aspx?siebel_parent=${parentResp.parentId}`,
            )
            const sibResp = await $fetch('/api/search/parse-parent', {
              method: 'POST',
              body: { drillHtml, lookupHtml, fl: params.fl },
            }) as { parentId: string; siblings: string[] }

            flList.push(...sibResp.siblings)
            log(`${sibResp.siblings.length} sibling FL(s) found. Reading contracts…`)
          } else {
            log('No parent found for this FL.')
          }
        } catch (e: any) {
          log(`Parent lookup skipped: ${e.message}`)
        }
      }

      // ── Processa cada FL ──────────────────────────────────────────────────
      let found = 0

      for (const currentFl of flList) {
        if (aborted) break
        log(`Reading active contracts for FL ${currentFl}…`)

        try {
          const pageUrl = `${BASE}/siebelreports/flentitlements.aspx?fl=${currentFl}`
          const html    = await avayaFetch(pageUrl)

          const parsed = await $fetch('/api/search/parse-entitlements', {
            method: 'POST',
            body: { html, pageUrl, fl: currentFl, mode: params.mode, term: params.term },
          }) as {
            links: string[]
            directMatches: ContractResult[]
            relatedSkills: string[]
            contractNames: string[]
            contractCodes: string[]
          }

          for (const m of parsed.directMatches) {
            results.value.push(m)
            found++
          }

          log(`FL ${currentFl}: ${parsed.links.length} active contract(s) found.`)

          // ── Verifica cada contrato ──────────────────────────────────────
          for (const [i, link] of parsed.links.entries()) {
            if (aborted) break
            log(`FL ${currentFl}: checking contract ${i + 1} / ${parsed.links.length}…`)

            try {
              const contractHtml = await avayaFetch(link)

              const contractResp = await $fetch('/api/search/parse-contract', {
                method: 'POST',
                body: {
                  html: contractHtml,
                  contractUrl: link,
                  fl: currentFl,
                  mode: params.mode,
                  term: params.term,
                  relatedSkills: parsed.relatedSkills,
                  version: params.version,
                },
              }) as { matches: ContractResult[] }

              for (const m of contractResp.matches) {
                results.value.push(m)
                found++
              }
            } catch (e: any) {
              log(`Contract error: ${e.message}`)
            }
          }
        } catch (e: any) {
          const isCors = e.message?.includes('Failed to fetch') || e.message?.includes('NetworkError')
          if (isCors) {
            log(`FL ${currentFl} skipped: CORS bloqueou o acesso ao portal Avaya.`)
            log('Dica: acesse report.avaya.com antes de pesquisar para criar sessão no browser.')
          } else {
            log(`FL ${currentFl} skipped: ${e.message}`)
          }
        }
      }

      log(`Done — ${found} contract${found !== 1 ? 's' : ''} found`)
      statusColor.value = found > 0 ? 'green' : 'gray'
    } catch (e: any) {
      log(`Error: ${e.message}`)
      statusColor.value = 'red'
    } finally {
      isSearching.value = false
    }
  }

  function stopSearch() {
    aborted = true
    isSearching.value = false
    log('Search stopped by user.')
    statusColor.value = 'red'
  }

  function clearResults() {
    results.value     = []
    logs.value        = []
    statusColor.value = 'gray'
  }

  return { results, logs, isSearching, statusColor, startSearch, stopSearch, clearResults }
}
