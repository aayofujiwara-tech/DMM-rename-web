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

  function buildNewName(label, title, actresses, fmt, partNumber) {
    const safeTitle = title.replace(/[\\/:*?"<>|]/g, '').trim()
    const safeActresses = actresses
      .map(a => a.replace(/[\\/:*?"<>|]/g, '').trim())
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

  const results = []

  for (let i = 0; i < filenames.length; i++) {
    const filename = filenames[i].trim()
    if (!filename) continue

    const { cid, label, partNumber } = extractCid(filename)

    if (!cid || !/^[a-z][a-z0-9]{1,49}$/.test(cid)) {
      results.push({ filename, cid, label, status: 'not_found' })
      continue
    }

    try {
      const data = await fetchFanzaItem(cid, apiId, affiliateId)

      if (data) {
        const { title, actresses } = data
        const newName = buildNewName(label, title, actresses, nameFormat, partNumber)
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

  // 同一newNameが残っている場合は連番を付けてリネーム衝突を防ぐ
  const nameCount = {}
  for (const result of results) {
    if (result.status !== 'ok') continue
    nameCount[result.newName] = (nameCount[result.newName] ?? [])
    nameCount[result.newName].push(result)
  }
  for (const [baseName, items] of Object.entries(nameCount)) {
    if (items.length <= 1) continue
    items.forEach((item, index) => {
      item.newName = baseName.replace(/\.dcv$/, ` (${index + 1}).dcv`)
    })
  }

  return res.status(200).json({ results })
}
