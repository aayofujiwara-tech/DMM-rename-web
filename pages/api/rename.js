import { scrapeItem } from '../../lib/scraper'

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

/**
 * POST /api/rename
 * body: { filenames: string[] }
 * response: { results: Array<{ filename, cid, label, status, title?, actresses?, newName? }> }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { filenames } = req.body
  if (!Array.isArray(filenames) || filenames.length === 0) {
    return res.status(400).json({ error: 'filenamesが必要です' })
  }

  // cidExtractorはESMなのでdynamic importで読み込む
  const { extractCid } = await import('../../lib/cidExtractor.js')

  const results = []

  for (let i = 0; i < filenames.length; i++) {
    const filename = filenames[i].trim()
    if (!filename) continue

    const { cid, label } = extractCid(filename)

    try {
      const data = await scrapeItem(cid)

      if (data) {
        const { title, actresses } = data
        // リネーム後ファイル名を生成
        const safeTitle = title.replace(/[\\/:*?"<>|]/g, '').trim()
        const safeActresses = actresses.map(a => a.replace(/[\\/:*?"<>|]/g, '').trim())
        const actressStr = safeActresses.length > 0 ? ` - ${safeActresses.join('_')}` : ''
        const newName = `[${label}] ${safeTitle}${actressStr}.dcv`

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
