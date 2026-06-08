import https from 'https'

const ALLOWED_HOSTS = new Set(['www.dmm.co.jp', 'www.fanza.com'])

function isAllowedUrl(urlStr) {
  try {
    const parsed = new URL(urlStr)
    return parsed.protocol === 'https:' && ALLOWED_HOSTS.has(parsed.hostname)
  } catch {
    return false
  }
}

/**
 * DMMの商品ページをスクレイピングしてタイトル・女優名を返す
 * Next.js API Routes（サーバーサイド）から呼ぶこと
 */
export function fetchPage(url, redirectCount = 0) {
  if (!isAllowedUrl(url)) return Promise.resolve(null)
  if (redirectCount > 5) return Promise.resolve(null)

  return new Promise((resolve) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ja,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 10000,
    }
    const req = https.get(url, options, (res) => {
      // リダイレクト対応（DMMドメイン内のみ許可）
      if (res.statusCode === 301 || res.statusCode === 302) {
        res.resume()
        const location = res.headers.location
        if (!location) { resolve(null); return }
        const next = location.startsWith('http') ? location : new URL(location, url).href
        if (!isAllowedUrl(next)) { resolve(null); return }
        resolve(fetchPage(next, redirectCount + 1))
        return
      }
      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
    })
    req.on('error', () => resolve(null))
    req.on('timeout', () => { req.destroy(); resolve(null) })
  })
}

/**
 * cidからタイトル・女優名を取得
 * @returns {{ title: string, actresses: string[] } | null}
 */
export async function scrapeItem(cid) {
  const url = `https://www.dmm.co.jp/digital/videoa/-/detail/=/cid=${cid}/`
  const html = await fetchPage(url)
  if (!html) return null

  // タイトル取得
  const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/)
  const title = titleMatch
    ? titleMatch[1].replace(/\s*-\s*FANZA.*$/, '').trim()
    : null
  if (!title) return null

  // 女優名取得（複数対応）パターン1
  const actressMatches = [
    ...html.matchAll(/\/mono\/actress\/\d+\/-\/"><span[^>]*>([^<]+)<\/span>/g)
  ]
  let actresses = actressMatches.map(m => m[1].trim())

  // パターン2（代替）
  if (actresses.length === 0) {
    const alt = [...html.matchAll(/itemprop="name">([^<]{2,20})<\/span>/g)]
    actresses = alt.map(m => m[1].trim()).filter(n => n.length > 1)
  }

  return { title, actresses }
}
