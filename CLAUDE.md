# DMM Renamer Web - 実装指示書

## あなたへの指示

このファイルを読んだら、以下の順番で実装を進めてください。
確認や質問は不要です。すべての仕様はこのファイルに記載されています。
実装が完了したら `git push origin main` までやりきってください。

---

## 事前確認（最初に必ず実行）

```powershell
node -v
git config user.name
git config user.email
```

Gitのuser.name / user.emailが未設定の場合:
```powershell
git config --global user.name "aayofujiwara-tech"
git config --global user.email "aa.yo.fujiwara@gmail.com"
```

---

## 作業ディレクトリ

```
C:\Users\ain12\DMM-rename-web\
```

なければ作成:
```powershell
cd C:\Users\ain12
git clone https://github.com/aayofujiwara-tech/DMM-rename-web.git
cd DMM-rename-web
```

---

## プロジェクト初期化

```powershell
cd C:\Users\ain12\DMM-rename-web
npx create-next-app@latest . --typescript=false --tailwind=false --eslint=false --app=false --src-dir=false --import-alias="@/*"
# 上書き確認が出たら y を選択
npm install
```

---

## 最終的なファイル構成

```
C:\Users\ain12\DMM-rename-web\
├── pages/
│   ├── index.jsx          # メイン画面
│   └── api/
│       └── rename.js      # スクレイピングAPIエンドポイント
├── lib/
│   ├── cidExtractor.js    # cid抽出（DMM-renameと同じロジック）
│   └── scraper.js         # サーバーサイドスクレイピング
├── styles/
│   └── globals.css
├── package.json
└── CLAUDE.md
```

---

## lib/cidExtractor.js（完全版）

```javascript
/**
 * .dcvファイル名からcidと品番ラベルを抽出する
 *
 * 実例:
 *   masm00001hhb.dcv           → { cid: 'masm00001', label: 'MASM-1' }
 *   1dandy00812a2d_v1_drm_a_4k.dcv → { cid: 'dandy00812', label: 'DANDY-812' }
 *   miaa00629mhb.dcv           → { cid: 'miaa00629', label: 'MIAA-629' }
 *   bmw00211mhb1.dcv           → { cid: 'bmw00211', label: 'BMW-211' }
 *   bmw00272mhb2.dcv           → { cid: 'bmw00272', label: 'BMW-272' }
 */
export function extractCid(filename) {
  let s = filename

  // 1. 拡張子除去
  s = s.replace(/\.dcv$/i, '')

  // 2. 画質・DRMサフィックス除去（例: _v1_drm_a_4k）
  s = s.replace(/_(v\d+_)?drm_[a-z0-9_]+$/i, '')

  // 3. 末尾のエンコード種別除去（hhb / mhb / a2d + 末尾数字）
  s = s.replace(/(hhb\d*|mhb\d*|a2d\d*)$/i, '')

  // 4. 先頭の数字除去（例: 1dandy → dandy）
  s = s.replace(/^\d+/, '')

  const cid = s.toLowerCase()

  // 5. 品番ラベル生成（例: miaa00629 → MIAA-629）
  const match = cid.match(/^([a-z]+)(\d+)$/)
  const label = match
    ? `${match[1].toUpperCase()}-${parseInt(match[2], 10)}`
    : cid.toUpperCase()

  return { cid, label }
}

/**
 * テキストエリアの入力（複数行）を一括処理
 */
export function extractCidList(text) {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(filename => ({ filename, ...extractCid(filename) }))
}
```

---

## lib/scraper.js（完全版・サーバーサイド専用）

```javascript
import https from 'https'
import http from 'http'

/**
 * DMMの商品ページをスクレイピングしてタイトル・女優名を返す
 * Next.js API Routes（サーバーサイド）から呼ぶこと
 */
export function fetchPage(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ja,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 10000,
    }
    const req = client.get(url, options, (res) => {
      // リダイレクト対応
      if (res.statusCode === 301 || res.statusCode === 302) {
        resolve(fetchPage(res.headers.location))
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
```

---

## pages/api/rename.js（完全版）

```javascript
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
```

---

## pages/index.jsx（完全版）

```jsx
import { useState, useRef } from 'react'
import Head from 'next/head'

export default function Home() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [textInput, setTextInput] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef(null)

  // フォルダ選択からファイル名を取得
  const handleFolderSelect = (e) => {
    const files = [...e.target.files]
    const dcvFiles = files.filter(f => f.name.endsWith('.dcv'))
    const names = dcvFiles.map(f => f.name).join('\n')
    setTextInput(names)
  }

  const handleSubmit = async () => {
    setError('')
    setResults([])

    const filenames = textInput
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0)

    if (filenames.length === 0) {
      setError('ファイル名を入力してください')
      return
    }

    setLoading(true)
    setProgress({ current: 0, total: filenames.length })

    try {
      const res = await fetch('/api/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filenames }),
      })

      if (!res.ok) throw new Error('サーバーエラー')

      const data = await res.json()
      setResults(data.results)
    } catch (e) {
      setError(`エラー: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    const text = results
      .filter(r => r.status === 'ok')
      .map(r => r.newName)
      .join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const okCount = results.filter(r => r.status === 'ok').length

  return (
    <>
      <Head>
        <title>DMM Renamer Web</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="container">
        <header>
          <h1>DMM Renamer</h1>
          <p className="subtitle">.dcvファイルを女優名・タイトルにリネーム</p>
        </header>

        <main>
          {/* 入力エリア */}
          <section className="input-section">
            {/* フォルダ選択 */}
            <div className="method">
              <label className="method-label">① フォルダを選択</label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFolderSelect}
                webkitdirectory=""
                directory=""
                multiple
                style={{ display: 'none' }}
              />
              <button
                className="btn-folder"
                onClick={() => fileInputRef.current.click()}
              >
                フォルダを選択
              </button>
            </div>

            <div className="divider">または</div>

            {/* テキスト貼り付け */}
            <div className="method">
              <label className="method-label">② ファイル名を貼り付け</label>
              <textarea
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                placeholder={'miaa00629mhb.dcv\npred00248hhb.dcv\ndass00076hhb.dcv'}
                rows={6}
              />
            </div>

            {error && <p className="error">{error}</p>}

            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={loading || !textInput.trim()}
            >
              {loading
                ? `取得中... (${progress.current}/${progress.total})`
                : '変換する'}
            </button>
          </section>

          {/* 結果エリア */}
          {results.length > 0 && (
            <section className="result-section">
              <div className="result-header">
                <h2>結果</h2>
                {okCount > 0 && (
                  <button className="btn-copy" onClick={handleCopy}>
                    {copied ? '✓ コピーしました' : `コピー (${okCount}件)`}
                  </button>
                )}
              </div>

              <ul className="result-list">
                {results.map((r, i) => (
                  <li key={i} className={`result-item ${r.status}`}>
                    <span className="old-name">{r.filename}</span>
                    {r.status === 'ok' && (
                      <span className="new-name">→ {r.newName}</span>
                    )}
                    {r.status === 'not_found' && (
                      <span className="no-match">ヒットなし・スキップ</span>
                    )}
                    {r.status === 'error' && (
                      <span className="no-match">エラー: {r.error}</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </main>
      </div>
    </>
  )
}
```

---

## styles/globals.css（完全版）

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Segoe UI', sans-serif;
  background: #1a1a2e;
  color: #e0e0e0;
  min-height: 100vh;
}

.container {
  max-width: 760px;
  margin: 0 auto;
  padding: 32px 24px;
}

header {
  margin-bottom: 32px;
}

h1 {
  font-size: 28px;
  color: #e94560;
  margin-bottom: 4px;
}

.subtitle {
  color: #a0a0b0;
  font-size: 14px;
}

.input-section {
  background: #16213e;
  border: 1px solid #0f3460;
  border-radius: 10px;
  padding: 28px;
  margin-bottom: 24px;
}

.method-label {
  display: block;
  font-size: 14px;
  color: #a0a0b0;
  margin-bottom: 10px;
  font-weight: 500;
}

.btn-folder {
  padding: 10px 24px;
  background: #16213e;
  border: 1px solid #0f3460;
  border-radius: 6px;
  color: #e0e0e0;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.btn-folder:hover { background: #0f3460; }

.divider {
  text-align: center;
  color: #555;
  font-size: 13px;
  margin: 20px 0;
  position: relative;
}

.divider::before, .divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 42%;
  height: 1px;
  background: #0f3460;
}

.divider::before { left: 0; }
.divider::after { right: 0; }

textarea {
  width: 100%;
  padding: 10px 14px;
  background: #0f1e3a;
  border: 1px solid #0f3460;
  border-radius: 6px;
  color: #e0e0e0;
  font-size: 13px;
  font-family: 'Consolas', monospace;
  resize: vertical;
  line-height: 1.6;
}

textarea::placeholder { color: #444; }

.error {
  color: #e94560;
  font-size: 13px;
  margin-top: 12px;
}

.btn-primary {
  margin-top: 20px;
  width: 100%;
  padding: 12px;
  background: #e94560;
  border: none;
  border-radius: 6px;
  color: #fff;
  font-size: 15px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover { background: #c73652; }
.btn-primary:disabled { opacity: 0.4; cursor: default; }

.result-section {
  background: #16213e;
  border: 1px solid #0f3460;
  border-radius: 10px;
  padding: 28px;
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

h2 { font-size: 18px; }

.btn-copy {
  padding: 8px 18px;
  background: #0f3460;
  border: 1px solid #1a4a8a;
  border-radius: 6px;
  color: #4ecca3;
  cursor: pointer;
  font-size: 13px;
}

.btn-copy:hover { background: #1a4a8a; }

.result-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.result-item {
  padding: 10px 14px;
  background: #0f1e3a;
  border: 1px solid #0f3460;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.result-item.not_found,
.result-item.error { opacity: 0.5; }

.old-name { font-size: 12px; color: #a0a0b0; font-family: 'Consolas', monospace; }
.new-name { font-size: 13px; color: #4ecca3; font-family: 'Consolas', monospace; }
.no-match { font-size: 12px; color: #666; font-style: italic; }
```

---

## pages/_app.js（完全版）

```javascript
import '../styles/globals.css'

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />
}
```

---

## 動作確認

```powershell
cd C:\Users\ain12\DMM-rename-web
npm run dev
```

ブラウザで http://localhost:3000 を開く。

1. フォルダを選択 または ファイル名を貼り付け
2. 「変換する」をクリック
3. リネーム後のファイル名が表示される
4. 「コピー」で結果をクリップボードにコピー

---

## Vercelへのデプロイ

動作確認後:

```powershell
cd C:\Users\ain12\DMM-rename-web
git add .
git commit -m "feat: DMM Renamer Web 初回実装"
git push origin main
```

GitHubにプッシュ後、https://vercel.com でインポートするだけで自動デプロイされる。

---

## よくあるエラーと対処

| エラー | 原因 | 対処 |
|--------|------|------|
| ESM/CJS混在エラー | cidExtractor.jsのimport | pages/api/rename.jsでdynamic importを使う |
| スクレイピング結果が空 | DMMのHTML構造が変わった | scraper.jsの正規表現を調整 |
| CORSエラー | クライアントから直接DMMにアクセス | 必ずAPI Routes経由でスクレイピングすること |
| フォルダ選択が動かない | ブラウザの対応状況 | Chrome/Edgeを使うこと |

