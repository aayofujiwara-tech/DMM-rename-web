import { extractCid } from '../../../lib/cidExtractor'
import { fetchFanzaItem, isValidApiKeys } from '../../../lib/fanzaApi'

export const runtime = 'edge'

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

const CONCURRENCY = 5
const DELAY_BETWEEN_BATCHES = 200
const VALID_FORMATS = new Set(['title_actress', 'actress_title'])

function buildNewName(label, title, actresses, fmt, partNumber, showLabel) {
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

function getFallbackCids(cid) {
  const seen = new Set()
  const fallbacks = []

  const add = (v) => { if (v !== cid && !seen.has(v)) { seen.add(v); fallbacks.push(v) } }

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

async function processFile(file, apiId, affiliateId, nameFormat, showLabel) {
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
    return { filename, cid, label, status: 'error', error: e.message }
  }
}

export async function POST(request) {
  const body = await request.json().catch(() => null)
  if (!body) {
    return new Response(JSON.stringify({ error: 'リクエストが不正です' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { filenames, showLabel = true } = body
  const nameFormat = VALID_FORMATS.has(body.nameFormat) ? body.nameFormat : 'title_actress'
  const apiId = process.env.FANZA_API_ID
  const affiliateId = process.env.FANZA_AFFILIATE_ID

  if (!Array.isArray(filenames) || filenames.length === 0) {
    return new Response(JSON.stringify({ error: 'filenamesが必要です' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  if (filenames.length > 50) {
    return new Response(JSON.stringify({ error: '一度に処理できるのは50件までです' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  if (filenames.some(f => typeof f !== 'string' || f.length > 500)) {
    return new Response(JSON.stringify({ error: 'ファイル名が無効です' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  if (!apiId || !affiliateId || !isValidApiKeys(apiId, affiliateId)) {
    return new Response(JSON.stringify({ error: 'サーバーのAPIキーが未設定です' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const files = filenames
    .map(f => f.trim())
    .filter(f => f.length > 0)
    .map(filename => ({ filename, ...extractCid(filename) }))

  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()

  const sendEvent = async (data) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
  }

  ;(async () => {
    const results = []
    let completed = 0
    let rateLimitHit = false

    for (let i = 0; i < files.length; i += CONCURRENCY) {
      const batch = files.slice(i, i + CONCURRENCY)

      if (rateLimitHit) {
        for (const file of batch) {
          const result = await processFile(file, apiId, affiliateId, nameFormat, showLabel)
          results.push(result)
          completed++
          await sendEvent({ type: 'progress', current: completed, total: files.length, result })
          await sleep(1000)
        }
        continue
      }

      const batchResults = await Promise.all(
        batch.map(async (file) => {
          const result = await processFile(file, apiId, affiliateId, nameFormat, showLabel)
          if (result.status === 'rate_limit') rateLimitHit = true
          return result
        })
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

    const nameCount = {}
    for (const result of results) {
      if (result.status !== 'ok') continue
      if (!nameCount[result.newName]) nameCount[result.newName] = []
      nameCount[result.newName].push(result)
    }
    for (const [, items] of Object.entries(nameCount)) {
      if (items.length <= 1) continue
      items.forEach((item, index) => {
        item.newName = item.newName.replace(/\.dcv$/, ` (${index + 1}).dcv`)
      })
    }

    await sendEvent({ type: 'done', results })
    await writer.close()
  })().catch(async (err) => {
    try {
      await sendEvent({ type: 'error', error: err.message })
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
}
