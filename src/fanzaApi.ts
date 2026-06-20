const API_ID_RE = /^[a-zA-Z0-9_\-.]+$/
const AFFILIATE_ID_RE = /^[a-zA-Z0-9_\-.@]+$/

export function isValidApiKeys(apiId: string, affiliateId: string): boolean {
  return (
    typeof apiId === 'string' && apiId.length > 0 && apiId.length <= 200 && API_ID_RE.test(apiId) &&
    typeof affiliateId === 'string' && affiliateId.length > 0 && affiliateId.length <= 200 && AFFILIATE_ID_RE.test(affiliateId)
  )
}

export interface FanzaItem {
  title: string
  actresses: string[]
  imageUrl: string
}

interface CacheEntry { value: FanzaItem; expiresAt: number }
const cache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 10 * 60 * 1000
const CACHE_MAX = 500

function cacheGet(cid: string): FanzaItem | undefined {
  const entry = cache.get(cid)
  if (!entry) return undefined
  if (Date.now() > entry.expiresAt) { cache.delete(cid); return undefined }
  return entry.value
}

function cacheSet(cid: string, value: FanzaItem) {
  if (cache.size >= CACHE_MAX) {
    const firstKey = cache.keys().next().value
    if (firstKey !== undefined) cache.delete(firstKey)
  }
  cache.set(cid, { value, expiresAt: Date.now() + CACHE_TTL_MS })
}

async function fetchFromApi(params: Record<string, string>): Promise<FanzaItem | null> {
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

    const json = await res.json() as Record<string, unknown>
    const result = (json as Record<string, Record<string, unknown>>)?.result
    const items = result?.items as Array<Record<string, unknown>> | undefined
    if (!Array.isArray(items) || items.length === 0) return null

    const item = items[0]
    const title = item.title as string | undefined
    if (!title) return null

    const iteminfo = item.iteminfo as Record<string, Array<{ name?: string }>> | undefined
    const actressNames = (iteminfo?.actress ?? []).map(a => a.name).filter(Boolean) as string[]
    const actorNames = (iteminfo?.actor ?? []).map(a => a.name).filter(Boolean) as string[]
    const actresses = [...new Set([...actressNames, ...actorNames])]

    const imageUrl =
      (item.imageURL as Record<string, string>)?.small ||
      (item.imageURL as Record<string, string>)?.list ||
      ''

    return { title, actresses, imageUrl }
  } catch {
    return null
  }
}

export async function fetchFanzaItem(cid: string, apiId: string, affiliateId: string): Promise<FanzaItem | null> {
  const cached = cacheGet(cid)
  if (cached !== undefined) return cached

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
      cacheSet(cid, result)
      return result
    }
  }

  // null は非キャッシュ: 次回リクエストで再試行可能
  return null
}
