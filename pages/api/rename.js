import { fetchFanzaItem, isValidApiKeys } from '../../lib/fanzaApi'

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

const CONCURRENCY = 5
const DELAY_BETWEEN_BATCHES = 200
const VALID_FORMATS = new Set(['title_actress', 'actress_title'])

function buildNewName(label, title, actresses, fmt, partNumber) {
  const safeTitle = title.replace(/[\\/:*?"<>|]/g, '').trim()
  const safeActresses = actresses
    .map(a => a.replace(/[\\/:*?"<>|]/g, '').replace(/\.+$/, '').trim())
    .filter(a => a.length > 0)
    .join('_')

  const part = partNumber ? ` (${partNumber})` : ''

  if (fmt === 'actress_title') {
    return safeActresses
      ? `[${label}] ${safeActresses} - ${safeTitle}${part}.dcv`
      : `[${label}] ${safeTitle}${part}.dcv`
  }
  return safeActresses
    ? `[${label}] ${safeTitle} - ${safeActresses}${part}.dcv`
    : `[${label}] ${safeTitle}${part}.dcv`
}

async function processFile(file, apiId, affiliateId, nameFormat) {
  const { filename, cid, label, partNumber } = file

  if (!cid || !/^[a-z0-9_]{2,50}$/.test(cid)) {
    return { filename, cid, label, status: 'not_found' }
  }

  try {
    let data = await fetchFanzaItem(cid, apiId, affiliateId)

    // ヒットしなかった場合、ゼロパディングを変えて再検索
    // 例: ipt00016 → ipt016 → ipt16
    //     12gld00208 → 12gld0208 → 12gld208（数字プレフィックスも対応）
    if (!data) {
      const zeroMatch = cid.match(/^(\d*[a-z_]+)(0{2,})(\d+)$/i)
      if (zeroMatch) {
        const [, prefix, , num] = zeroMatch
        data = await fetchFanzaItem(`${prefix}0${num}`, apiId, affiliateId)
        if (!data) {
          data = await fetchFanzaItem(`${prefix}${num}`, apiId, affiliateId)
        }
      }
    }

    if (data) {
      const { title, actresses } = data
      const newName = buildNewName(label, title, actresses, nameFormat, partNumber)
      return { filename, cid, label, status: 'ok', title, actresses, newName }
    }
    return { filename, cid, label, status: 'not_found' }
  } catch (e) {
    return { filename, cid, label, status: 'error', error: e.message }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { filenames } = req.body
  const nameFormat = VALID_FORMATS.has(req.body.nameFormat) ? req.body.nameFormat : 'title_actress'

  const apiId = process.env.FANZA_API_ID
  const affiliateId = process.env.FANZA_AFFILIATE_ID

  if (!Array.isArray(filenames) || filenames.length === 0) {
    return res.status(400).json({ error: 'filenamesが必要です' })
  }
  if (filenames.length > 50) {
    return res.status(400).json({ error: '一度に処理できるのは50件までです' })
  }
  if (filenames.some(f => typeof f !== 'string' || f.length > 500)) {
    return res.status(400).json({ error: 'ファイル名が無効です' })
  }
  if (!apiId || !affiliateId || !isValidApiKeys(apiId, affiliateId)) {
    return res.status(500).json({ error: 'サーバーのAPIキーが未設定です' })
  }

  const { extractCid } = await import('../../lib/cidExtractor.js')
  const files = filenames
    .map(f => f.trim())
    .filter(f => f.length > 0)
    .map(filename => ({ filename, ...extractCid(filename) }))

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  const results = []
  let completed = 0
  let rateLimitHit = false

  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY)

    if (rateLimitHit) {
      for (const file of batch) {
        const result = await processFile(file, apiId, affiliateId, nameFormat)
        results.push(result)
        completed++
        sendEvent({ type: 'progress', current: completed, total: files.length, result })
        await sleep(1000)
      }
      continue
    }

    const batchResults = await Promise.all(
      batch.map(async (file) => {
        const result = await processFile(file, apiId, affiliateId, nameFormat)
        if (result.status === 'rate_limit') rateLimitHit = true
        return result
      })
    )

    for (const result of batchResults) {
      results.push(result)
      completed++
      sendEvent({ type: 'progress', current: completed, total: files.length, result })
    }

    if (i + CONCURRENCY < files.length) {
      await sleep(DELAY_BETWEEN_BATCHES)
    }
  }

  // 同一newNameの連番処理
  const nameCount = {}
  for (const result of results) {
    if (result.status !== 'ok') continue
    if (!nameCount[result.newName]) nameCount[result.newName] = []
    nameCount[result.newName].push(result)
  }
  for (const [newName, items] of Object.entries(nameCount)) {
    if (items.length <= 1) continue
    items.forEach((item, index) => {
      item.newName = newName.replace(/\.dcv$/, ` (${index + 1}).dcv`)
    })
  }

  sendEvent({ type: 'done', results })
  res.end()
}
