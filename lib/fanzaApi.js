import https from 'https'

const API_ID_RE = /^[a-zA-Z0-9_\-\.]+$/
const AFFILIATE_ID_RE = /^[a-zA-Z0-9_\-\.@]+$/

export function isValidApiKeys(apiId, affiliateId) {
  return (
    typeof apiId === 'string' && apiId.length > 0 && apiId.length <= 200 && API_ID_RE.test(apiId) &&
    typeof affiliateId === 'string' && affiliateId.length > 0 && affiliateId.length <= 200 && AFFILIATE_ID_RE.test(affiliateId)
  )
}

/**
 * FANZA affiliate API v3 でcidから商品情報を取得
 * @returns {{ title: string, actresses: string[] } | null}
 */
export function fetchFanzaItem(cid, apiId, affiliateId) {
  const url = new URL('https://api.dmm.com/affiliate/v3/ItemList')
  url.searchParams.set('api_id', apiId)
  url.searchParams.set('affiliate_id', affiliateId)
  url.searchParams.set('site', 'FANZA')
  url.searchParams.set('service', 'digital')
  url.searchParams.set('floor', 'videoa')
  url.searchParams.set('cid', cid)
  url.searchParams.set('hits', '1')
  url.searchParams.set('output', 'json')

  return new Promise((resolve) => {
    const req = https.get(url.toString(), {
      headers: { 'Accept': 'application/json' },
      timeout: 10000,
    }, (res) => {
      const MAX_SIZE = 1 * 1024 * 1024 // 1MB
      let totalSize = 0
      const chunks = []
      res.on('data', c => {
        totalSize += c.length
        if (totalSize > MAX_SIZE) { req.destroy(); resolve(null); return }
        chunks.push(c)
      })
      res.on('end', () => {
        if (totalSize > MAX_SIZE) return
        try {
          const json = JSON.parse(Buffer.concat(chunks).toString())
          const items = json?.result?.items
          if (!Array.isArray(items) || items.length === 0) { resolve(null); return }
          const item = items[0]
          const title = item.title || null
          if (!title) { resolve(null); return }
          const actresses = [...new Set(
            (item.iteminfo?.actress ?? []).map(a => a.name).filter(Boolean)
          )]
          resolve({ title, actresses })
        } catch {
          resolve(null)
        }
      })
    })
    req.on('error', () => resolve(null))
    req.on('timeout', () => { req.destroy(); resolve(null) })
  })
}
