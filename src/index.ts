import { Hono } from 'hono'
import { extractCid } from './cidExtractor'
import { fetchFanzaItem, isValidApiKeys } from './fanzaApi'

type Bindings = {
  FANZA_API_ID: string
  FANZA_AFFILIATE_ID: string
  ASSETS: Fetcher
}

interface FileItem {
  filename: string
  cid: string
  label: string
  partNumber: number | null
}

interface RenameResult {
  filename: string
  cid: string
  label: string
  status: 'ok' | 'not_found' | 'error'
  title?: string
  actresses?: string[]
  newName?: string
  error?: string
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

const CONCURRENCY = 5
const DELAY_BETWEEN_BATCHES = 200
const VALID_FORMATS = new Set(['title_actress', 'actress_title'])

function buildNewName(
  label: string, title: string, actresses: string[],
  fmt: string, partNumber: number | null, showLabel: boolean
): string {
  const safeTitle = title.replace(/[\\/:*?"<>|]/g, '').trim()
  const safeActresses = actresses
    .map(a => a.replace(/[\\/:*?"<>|]/g, '').replace(/\.+$/, '').trim())
    .filter(a => a.length > 0)
    .join('_')

  const part = partNumber ? ` (${partNumber})` : ''
  const labelPart = showLabel ? `[${label}] ` : ''

  if (fmt === 'actress_title') {
    return safeActresses
      ? `${labelPart}${safeActresses} - ${safeTitle}${part}.dcv`
      : `${labelPart}${safeTitle}${part}.dcv`
  }
  return safeActresses
    ? `${labelPart}${safeTitle} - ${safeActresses}${part}.dcv`
    : `${labelPart}${safeTitle}${part}.dcv`
}

function getFallbackCids(cid: string): string[] {
  const seen = new Set<string>()
  const fallbacks: string[] = []

  const add = (v: string) => {
    if (v !== cid && !seen.has(v)) { seen.add(v); fallbacks.push(v) }
  }

  const m = cid.match(/^(\d*[a-z_]+)(0{2,})(\d+)$/i)
  if (m) {
    const [, prefix, zeros, num] = m
    for (let z = zeros.length - 1; z >= 0; z--) {
      add(prefix + '0'.repeat(z) + num)
    }
  }

  const m2 = cid.match(/^(\d+)([a-z_]+)(0*)(\d+)$/i)
  if (m2) {
    const [, , alpha, zeros, num] = m2
    add(alpha + zeros + num)
    for (let z = zeros.length - 1; z >= 0; z--) {
      add(alpha + '0'.repeat(z) + num)
    }
    add(alpha + num)
  }

  return fallbacks
}

async function processFile(
  file: FileItem, apiId: string, affiliateId: string,
  nameFormat: string, showLabel: boolean
): Promise<RenameResult> {
  const { filename, cid, label, partNumber } = file

  if (!cid || !/^[a-z0-9_]{2,50}$/.test(cid)) {
    return { filename, cid, label, status: 'not_found' }
  }

  try {
    let data = await fetchFanzaItem(cid, apiId, affiliateId)

    if (!data) {
      for (const fallbackCid of getFallbackCids(cid)) {
        data = await fetchFanzaItem(fallbackCid, apiId, affiliateId)
        if (data) break
      }
    }

    if (data) {
      const { title, actresses } = data
      const newName = buildNewName(label, title, actresses, nameFormat, partNumber, showLabel)
      return { filename, cid, label, status: 'ok', title, actresses, newName }
    }
    return { filename, cid, label, status: 'not_found' }
  } catch (e) {
    return { filename, cid, label, status: 'error', error: (e as Error).message }
  }
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/about', async (c) => {
  const url = new URL(c.req.url)
  url.pathname = '/about.html'
  return c.env.ASSETS.fetch(new Request(url.toString(), c.req.raw))
})

app.get('/source', async (c) => {
  const url = new URL(c.req.url)
  url.pathname = '/source.html'
  return c.env.ASSETS.fetch(new Request(url.toString(), c.req.raw))
})

app.get('/api/ranking', async (c) => {
  const type = c.req.query('type') ?? 'rank'
  const floor = c.req.query('floor') ?? 'videoa'
  const hits = Math.min(Number(c.req.query('hits') ?? '5'), 10)
  const sort = type === 'date' ? 'date' : 'rank'

  const url = new URL('https://api.dmm.com/affiliate/v3/ItemList')
  url.searchParams.set('api_id', c.env.FANZA_API_ID)
  url.searchParams.set('affiliate_id', c.env.FANZA_AFFILIATE_ID)
  url.searchParams.set('site', 'FANZA')
  url.searchParams.set('service', 'digital')
  url.searchParams.set('floor', floor)
  url.searchParams.set('hits', String(hits))
  url.searchParams.set('sort', sort)
  url.searchParams.set('output', 'json')

  try {
    const res = await fetch(url.toString(), { headers: { 'Accept': 'application/json' } })
    if (!res.ok) return c.json({ items: [] })

    const json = await res.json() as Record<string, unknown>
    const items = ((json as Record<string, Record<string, unknown>>)?.result?.items ?? []) as Array<Record<string, unknown>>

    const result = items.map(item => ({
      title: item.title as string,
      affiliateUrl: (item.affiliateURL as string) ?? '',
      imageUrl:
        (item.imageURL as Record<string, string>)?.small ||
        (item.imageURL as Record<string, string>)?.list ||
        (item.imageURL as Record<string, string>)?.large ||
        ((item.sampleImageURL as Record<string, string[]>)?.sample_s?.[0]) ||
        ((item.sampleImageURL as Record<string, string[]>)?.sample_l?.[0]) ||
        '',
      price: ((item.prices as Record<string, string>)?.price) ?? '',
    }))

    if (items.length > 0) {
      console.log('[ranking debug]', JSON.stringify({
        imageURL: items[0].imageURL,
        sampleURL: items[0].sampleImageURL,
        prices: items[0].prices,
      }))
    }
    return c.json({ items: result })
  } catch {
    return c.json({ items: [] })
  }
})

app.post('/api/rename', async (c) => {
  let body: { filenames?: unknown; nameFormat?: unknown; showLabel?: unknown }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'リクエストが不正です' }, 400)
  }

  const { filenames, showLabel = true } = body
  const nameFormat = VALID_FORMATS.has(String(body.nameFormat)) ? String(body.nameFormat) : 'title_actress'
  const apiId = c.env.FANZA_API_ID
  const affiliateId = c.env.FANZA_AFFILIATE_ID

  if (!Array.isArray(filenames) || filenames.length === 0) {
    return c.json({ error: 'filenamesが必要です' }, 400)
  }
  if (filenames.length > 50) {
    return c.json({ error: '一度に処理できるのは50件までです' }, 400)
  }
  if (filenames.some(f => typeof f !== 'string' || f.length > 500)) {
    return c.json({ error: 'ファイル名が無効です' }, 400)
  }
  if (!apiId || !affiliateId || !isValidApiKeys(apiId, affiliateId)) {
    return c.json({ error: 'サーバーのAPIキーが未設定です' }, 500)
  }

  const files: FileItem[] = (filenames as string[])
    .map(f => f.trim())
    .filter(f => f.length > 0)
    .map(filename => ({ filename, ...extractCid(filename) }))

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()

  const sendEvent = async (data: unknown) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
  }

  ;(async () => {
    const results: RenameResult[] = []
    let completed = 0

    for (let i = 0; i < files.length; i += CONCURRENCY) {
      const batch = files.slice(i, i + CONCURRENCY)

      const batchResults = await Promise.all(
        batch.map(file => processFile(file, apiId, affiliateId, nameFormat, Boolean(showLabel)))
      )

      for (const result of batchResults) {
        results.push(result)
        completed++
        await sendEvent({ type: 'progress', current: completed, total: files.length, result })
      }

      if (i + CONCURRENCY < files.length) {
        await sleep(DELAY_BETWEEN_BATCHES)
      }
    }

    const nameCount: Record<string, RenameResult[]> = {}
    for (const result of results) {
      if (result.status !== 'ok' || !result.newName) continue
      if (!nameCount[result.newName]) nameCount[result.newName] = []
      nameCount[result.newName].push(result)
    }
    for (const items of Object.values(nameCount)) {
      if (items.length <= 1) continue
      items.forEach((item, index) => {
        item.newName = item.newName!.replace(/\.dcv$/, ` (${index + 1}).dcv`)
      })
    }

    await sendEvent({ type: 'done', results })
    await writer.close()
  })().catch(async (err) => {
    try {
      await sendEvent({ type: 'error', error: (err as Error).message })
      await writer.close()
    } catch {
      await writer.abort(err)
    }
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
})

export default app
