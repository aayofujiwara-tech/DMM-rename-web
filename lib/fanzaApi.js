const API_ID_RE = /^[a-zA-Z0-9_\-\.]+$/
const AFFILIATE_ID_RE = /^[a-zA-Z0-9_\-\.@]+$/

export function isValidApiKeys(apiId, affiliateId) {
  return (
    typeof apiId === 'string' && apiId.length > 0 && apiId.length <= 200 && API_ID_RE.test(apiId) &&
    typeof affiliateId === 'string' && affiliateId.length > 0 && affiliateId.length <= 200 && AFFILIATE_ID_RE.test(affiliateId)
  )
}

const cache = new Map()

async function fetchFromApi(params) {
  const url = new URL('https://api.dmm.com/affiliate/v3/ItemList')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const res = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!res.ok) return null

    const json = await res.json()
    const items = json?.result?.items
    if (!Array.isArray(items) || items.length === 0) return null

    const item = items[0]
    const title = item.title || null
    if (!title) return null

    const actresses = [...new Set([
      ...(item.iteminfo?.actress ?? []).map(a => a.name).filter(Boolean),
      ...(item.iteminfo?.actor ?? []).map(a => a.name).filter(Boolean),
    ])]

    return { title, actresses }
  } catch {
    return null
  }
}

/**
 * FANZA affiliate API v3 でcidから商品情報を取得
 * videoa → videoc の順でフロアを試す
 * @returns {{ title: string, actresses: string[] } | null}
 */
export async function fetchFanzaItem(cid, apiId, affiliateId) {
  const cacheKey = `${cid}:${apiId}`
  if (cache.has(cacheKey)) return cache.get(cacheKey)

  const floors = ['videoa', 'videoc']

  for (const floor of floors) {
    const result = await fetchFromApi({
      api_id: apiId,
      affiliate_id: affiliateId,
      site: 'FANZA',
      service: 'digital',
      floor,
      cid,
      hits: '1',
      output: 'json',
    })
    if (result) {
      cache.set(cacheKey, result)
      return result
    }
  }

  cache.set(cacheKey, null)
  return null
}
