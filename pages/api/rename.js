import { fetchFanzaItem, isValidApiKeys } from '../../lib/fanzaApi'

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

/**
 * POST /api/rename
 * body: { filenames: string[], apiId: string, affiliateId: string }
 * response: { results: Array<{ filename, cid, label, status, title?, actresses?, newName? }> }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const VALID_FORMATS = new Set(['title_actress', 'actress_title'])
  const rawFormat = req.body.nameFormat
  const nameFormat = VALID_FORMATS.has(rawFormat) ? rawFormat : 'title_actress'
  const { filenames } = req.body

  const apiId = process.env.FANZA_API_ID
  const affiliateId = process.env.FANZA_AFFILIATE_ID

  if (!apiId || !affiliateId || !isValidApiKeys(apiId, affiliateId)) {
    return res.status(500).json({ error: 'サーバーのAPIキーが未設定です' })
  }

  if (!Array.isArray(filenames) || filenames.length === 0) {
    return res.status(400).json({ error: 'filenamesが必要です' })
  }
  if (filenames.length > 100) {
    return res.status(400).json({ error: 'ファイル名は100件以下にしてください' })
  }
  if (filenames.some(f => typeof f !== 'string' || f.length > 500)) {
    return res.status(400).json({ error: 'ファイル名が無効です' })
  }

  // cidExtractorはESMなのでdynamic importで読み込む
  const { extractCid } = await import('../../lib/cidExtractor.js')

  function buildNewName(label, title, actresses, fmt) {
    const safeTitle = title.replace(/[\\/:*?"<>|]/g, '').trim()
    const safeActresses = actresses
      .map(a => a.replace(/[\\/:*?"<>|]/g, '').trim())
      .join('_')

    if (fmt === 'actress_title') {
      return safeActresses
        ? `[${label}] ${safeActresses} - ${safeTitle}.dcv`
        : `[${label}] ${safeTitle}.dcv`
    }
    return safeActresses
      ? `[${label}] ${safeTitle} - ${safeActresses}.dcv`
      : `[${label}] ${safeTitle}.dcv`
  }

  const results = []

  for (let i = 0; i < filenames.length; i++) {
    const filename = filenames[i].trim()
    if (!filename) continue

    const { cid, label } = extractCid(filename)

    if (!cid || !/^[a-z][a-z0-9]{1,49}$/.test(cid)) {
      results.push({ filename, cid, label, status: 'not_found' })
      continue
    }

    try {
      const data = await fetchFanzaItem(cid, apiId, affiliateId)

      if (data) {
        const { title, actresses } = data
        const newName = buildNewName(label, title, actresses, nameFormat)
        results.push({ filename, cid, label, status: 'ok', title, actresses, newName })
      } else {
        results.push({ filename, cid, label, status: 'not_found' })
      }
    } catch (e) {
      results.push({ filename, cid, label, status: 'error', error: e.message })
    }

    // レート制限: 1秒間隔
    if (i < filenames.length - 1) await sleep(1000)
  }

  return res.status(200).json({ results })
}
