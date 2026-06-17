import { useState, useRef, useEffect } from 'react'
import Head from 'next/head'
import JSZip from 'jszip'

export default function Home() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [textInput, setTextInput] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [folderPath, setFolderPath] = useState('')
  const [folderName, setFolderName] = useState('')
  const [inputMethod, setInputMethod] = useState('text')
  const [demoIndex, setDemoIndex] = useState(0)
  const [nameFormat, setNameFormat] = useState('title_actress')
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const fileInputRef = useRef(null)

  const demoItems = [
    { before: 'ssis00100hhb.dcv',               after: '[SSIS-100] 君だけの特別な時間 - 涼川ひなた.dcv' },
    { before: 'jufe00300hhb.dcv',               after: '[JUFE-300] 秘密の放課後レッスン - 桜井もも.dcv' },
    { before: '1dandy00812a2d_v1_drm_a_4k.dcv', after: '[DANDY-812] 憧れの先輩と二人きり - 七瀬あおい.dcv' },
    { before: 'ipx00500hhb.dcv',               after: '[IPX-500] 甘えたい夜に - 白石りな.dcv' },
    { before: 'bmw00272mhb2.dcv',              after: '[BMW-272] 恋する季節のメロディー - 星野ことり.dcv' },
    { before: 'pred00248hhb.dcv',              after: '[PRED-248] ふたりだけの秘密 - 朝倉みく.dcv' },
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setDemoIndex(prev => (prev + 1) % demoItems.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [])

  // フォルダ選択からファイル名を取得
  const handleFolderSelect = (e) => {
    const files = [...e.target.files]
    const dcvFiles = files.filter(f => f.name.endsWith('.dcv'))
    const names = dcvFiles.map(f => f.name).join('\n')
    setTextInput(names)
    setResults([])
    setError('')
    setInputMethod('folder')

    // webkitRelativePathからフォルダ名を取得
    if (files.length > 0 && files[0].webkitRelativePath) {
      const folderN = files[0].webkitRelativePath.split('/')[0]
      setFolderName(folderN)
      setFolderPath('')
    }
  }

  const handleSubmit = async () => {
    setError('')
    setResults([])
    setProgress({ current: 0, total: 0 })

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
      const response = await fetch('/api/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filenames, nameFormat }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'サーバーエラー')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'progress') {
              setProgress({ current: event.current, total: event.total })
              setResults(prev => [...prev, event.result])
            } else if (event.type === 'done') {
              setResults(event.results)
            }
          } catch {}
        }
      }
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

  const handleDownloadZip = async () => {
    if (!folderPath.trim()) {
      alert('フォルダのパスを入力してからダウンロードしてください。')
      return
    }

    // PowerShell single-quoted strings don't expand variables; only ' needs escaping (doubled)
    const sanitizePS = (str) => String(str).replace(/'/g, "''")
    const basePath = sanitizePS(folderPath.trim().replace(/[/\\]+$/, ''))

    const ps1Lines = [
      '# DMM Renamer - 自動リネームスクリプト',
      '# このスクリプトはDMM Renamerで生成されました',
      '# 実行前に必ずバックアップを取ってください',
      '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
      '$OutputEncoding = [System.Text.Encoding]::UTF8',
      '',
    ]

    results
      .filter(r => r.status === 'ok')
      .forEach(r => {
        const safeName = sanitizePS(r.filename)
        const safeNew  = sanitizePS(r.newName)
        ps1Lines.push(`try {`)
        ps1Lines.push(`  Rename-Item -LiteralPath '${basePath}\\${safeName}' -NewName '${safeNew}'`)
        ps1Lines.push(`  Write-Host '✓ ${safeNew}' -ForegroundColor Green`)
        ps1Lines.push(`} catch {`)
        ps1Lines.push(`  Write-Host ('✗ エラー: ${safeName} - ' + $_) -ForegroundColor Red`)
        ps1Lines.push(`}`)
        ps1Lines.push('')
      })

    ps1Lines.push('Write-Host ""')
    ps1Lines.push('Write-Host "処理が完了しました。Enterを押して閉じてください。" -ForegroundColor Cyan')
    ps1Lines.push('Read-Host')

    const ps1Content = ps1Lines.join('\r\n')

    const batContent = [
      '@echo off',
      'chcp 65001 > nul',
      'powershell -ExecutionPolicy Bypass -File "%~dp0rename.ps1"',
      'pause',
    ].join('\r\n')

    const zip = new JSZip()
    zip.file('rename.ps1', '﻿' + ps1Content, { binary: false })
    zip.file('実行する.bat', batContent, { binary: false })

    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'rename.zip'
    a.click()
    URL.revokeObjectURL(url)
  }

  const okCount = results.filter(r => r.status === 'ok').length

  return (
    <>
      <Head>
        <title>DMM Renamer Web</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* ナビゲーション */}
      <nav className="nav">
        <span className="nav-logo">DMM Renamer</span>
        <a href="#tool" className="nav-cta">今すぐ使う →</a>
      </nav>

      {/* ヒーロー */}
      <section className="hero">
        <div className="hero-inner">
          <h1 className="hero-title">
            DMMファイルを、<br />
            <span className="accent">自動でリネーム。</span>
          </h1>
          <p className="hero-sub">
            ダウンロードしたままの謎のファイル名を、女優名・タイトルに整理。<br />
            貼り付けるだけ、無料、登録不要。
          </p>
          <a href="#tool" className="hero-btn">今すぐ無料で使う →</a>

          <div className="rename-demo">
            <div className="rename-demo-label">
              変換イメージ
              <span className="rename-demo-note">※タイトル・女優名はすべて架空のサンプルです</span>
            </div>
            <div className="rename-before">{demoItems[demoIndex].before}</div>
            <div className="rename-arrow">↓</div>
            <div className="rename-after" key={demoIndex}>{demoItems[demoIndex].after}</div>
          </div>
        </div>
      </section>

      {/* 使い方 */}
      <section className="how">
        <div className="section-inner">
          <h2 className="section-title">使い方</h2>
          <div className="steps">
            <div className="step">
              <span className="step-num">1</span>
              <div className="step-title">ファイル名を貼り付け</div>
              <p className="step-desc">DMMでダウンロードした.dcvファイルのファイル名をコピーして貼り付けるだけ。フォルダを選択して一括取得も可能。</p>
            </div>
            <div className="step">
              <span className="step-num">2</span>
              <div className="step-title">変換ボタンを押す</div>
              <p className="step-desc">ボタンを押すだけでFANZAの品番からタイトル・女優名を自動検索。複数ファイルも一括で処理できます。</p>
            </div>
            <div className="step">
              <span className="step-num">3</span>
              <div className="step-title">スクリプトで一括リネーム</div>
              <p className="step-desc">変換結果をコピーするか、PowerShellスクリプトをダウンロード。実行するだけでファイルが自動リネームされます。</p>
            </div>
          </div>
        </div>
      </section>

      {/* 特徴 */}
      <section className="features">
        <div className="section-inner">
          <h2 className="section-title">特徴</h2>
          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon">🆓</div>
              <div className="feature-title">完全無料</div>
              <p className="feature-desc">登録不要・制限なし。アカウント作成も料金も一切不要で利用できます。</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📂</div>
              <div className="feature-title">フォルダ選択に対応</div>
              <p className="feature-desc">.dcvファイルが入ったフォルダを選択するだけでファイル名を自動取得。一つひとつコピペする手間が不要です。</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <div className="feature-title">一括処理</div>
              <p className="feature-desc">複数のファイルをまとめて変換。大量のファイルも効率よく整理できます。</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <div className="feature-title">FANZA公式データ</div>
              <p className="feature-desc">公式データベースから正確な情報を取得。タイトル・女優名を確実に反映。</p>
            </div>
          </div>
        </div>
      </section>

      {/* ツール本体 */}
      <section className="tool-section" id="tool">
        <div className="section-inner">
          <h2 className="section-title">ツールを使う</h2>

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
                onChange={e => { setTextInput(e.target.value); setInputMethod('text') }}
                placeholder={'miaa00629mhb.dcv\npred00248hhb.dcv\ndass00076hhb.dcv'}
                rows={6}
              />
            </div>

            {/* ファイル名形式 */}
            <div className="format-selector">
              <label className="method-label">ファイル名の形式</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    value="title_actress"
                    checked={nameFormat === 'title_actress'}
                    onChange={() => setNameFormat('title_actress')}
                  />
                  <span>[品番] タイトル - 女優名.dcv</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    value="actress_title"
                    checked={nameFormat === 'actress_title'}
                    onChange={() => setNameFormat('actress_title')}
                  />
                  <span>[品番] 女優名 - タイトル.dcv</span>
                </label>
              </div>
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

          {/* プログレスバー */}
          {loading && progress.total > 0 && (
            <div className="progress-section">
              <div className="progress-header">
                <span>取得中...</span>
                <span>{progress.current} / {progress.total} 件</span>
              </div>
              <div className="progress-bar-wrap">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
              <div className="progress-items">
                {results.map((r, i) => (
                  <div key={i} className={`progress-item ${r.status}`}>
                    {r.status === 'ok' ? '✓' : '━'} {r.filename}
                    {r.status === 'ok' && <span className="progress-item-new">→ {r.newName}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 結果エリア */}
          {!loading && results.length > 0 && (
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

              {/* フォルダパス入力 */}
              {okCount > 0 && (
                <div className="folder-path-input">
                  <label className="method-label">
                    📁 ファイルが保存されているフォルダのパスを入力
                  </label>
                  {inputMethod === 'folder' ? (
                    <>
                      <input
                        type="text"
                        className="path-input"
                        value={folderPath}
                        onChange={e => setFolderPath(e.target.value)}
                        placeholder={
                          folderName
                            ? `例: C:\\Users\\ユーザー名\\Downloads\\${folderName}`
                            : '例: C:\\Users\\ain12\\Downloads\\DMM'
                        }
                      />
                      <div className="path-hint-box">
                        <p className="path-hint-title">
                          ⚠️ ブラウザの仕様により、フォルダの場所（絶対パス）は自動取得できません
                        </p>
                        {folderName && (
                          <p className="path-hint">
                            取得できたのはフォルダ名（<code>{folderName}</code>）のみです。
                            スクリプトが正しい場所のファイルをリネームするために、上の入力欄にフォルダの絶対パスを貼り付けてください。
                          </p>
                        )}
                        <p className="path-hint path-hint-steps">
                          【パスのコピー方法】<br />
                          ① エクスプローラーで <strong>{folderName || 'フォルダ'}</strong> を開く<br />
                          ② 上部のアドレスバーをクリックする<br />
                          ③ パスが選択されるので <strong>Ctrl+C</strong> でコピー<br />
                          ④ 上の入力欄に <strong>Ctrl+V</strong> で貼り付け
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <input
                        type="text"
                        className="path-input"
                        value={folderPath}
                        onChange={e => setFolderPath(e.target.value)}
                        placeholder="例: C:\Users\ain12\Downloads\DMM"
                      />
                      <p className="path-hint">
                        Windowsのエクスプローラーでフォルダを開き、アドレスバーをクリックするとパスをコピーできます。
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* スクリプトダウンロードボタン */}
              {okCount > 0 && (
                <button
                  className="btn-download"
                  onClick={handleDownloadZip}
                  disabled={okCount === 0 || !folderPath.trim()}
                >
                  ⬇ リネームファイルをダウンロード（{okCount}件）
                  {!folderPath.trim() && (
                    <span style={{ fontSize: '12px', display: 'block' }}>
                      ※ フォルダのパスを入力してください
                    </span>
                  )}
                </button>
              )}

              {/* 使い方説明 */}
              {okCount > 0 && (
                <div className="howto">
                  <h3 className="howto-title">📋 ファイルのリネーム方法</h3>

                  <div className="howto-intro">
                    上のボタンでダウンロードしたZIPファイルを使って
                    ファイルを自動でリネームできます。
                    <strong>ダブルクリックするだけで完了します。</strong>
                  </div>

                  <ol className="howto-steps">
                    <li className="howto-step">
                      <span className="howto-num">1</span>
                      <div className="howto-content">
                        <strong>ZIPをダウンロードして展開する</strong>
                        <p>
                          上の緑のボタン「リネームファイルをダウンロード」をクリックすると
                          <code>rename.zip</code> がダウンロードされます。
                          右クリック →「すべて展開」で展開してください。
                        </p>
                        <div className="howto-steps-sub">
                          <div className="howto-sub-step">① rename.zip を右クリック</div>
                          <div className="howto-sub-arrow">↓</div>
                          <div className="howto-sub-step">②「すべて展開」をクリック</div>
                          <div className="howto-sub-arrow">↓</div>
                          <div className="howto-sub-step">③「展開」をクリック</div>
                        </div>
                      </div>
                    </li>

                    <li className="howto-step">
                      <span className="howto-num">2</span>
                      <div className="howto-content">
                        <strong>「実行する.bat」をダブルクリック</strong>
                        <p>
                          展開したフォルダの中にある
                          <code>実行する.bat</code> を
                          <strong>ダブルクリック</strong>してください。
                        </p>
                        <div className="howto-steps-sub">
                          <div className="howto-sub-step">① 実行する.bat をダブルクリック</div>
                          <div className="howto-sub-arrow">↓</div>
                          <div className="howto-sub-step">②「開く」または「実行」をクリック</div>
                          <div className="howto-sub-arrow">↓</div>
                          <div className="howto-sub-step">✅ リネーム完了！</div>
                        </div>
                        <div className="howto-note">
                          💡 黒い画面（コマンドプロンプト）が開いて処理が実行されます。
                          「✓ ファイル名」と表示されれば成功です。
                        </div>
                      </div>
                    </li>

                    <li className="howto-step howto-step-optional">
                      <span className="howto-num howto-num-optional">?</span>
                      <div className="howto-content">
                        <strong>「WindowsによってPCが保護されました」と表示された場合</strong>
                        <p>
                          Windowsのスマートスクリーンが表示された場合は以下の手順で実行してください。
                        </p>
                        <div className="howto-steps-sub">
                          <div className="howto-sub-step">①「詳細情報」をクリック</div>
                          <div className="howto-sub-arrow">↓</div>
                          <div className="howto-sub-step">②「実行」をクリック</div>
                        </div>
                        <div className="howto-note">
                          ⚠️ 実行前に大切なファイルのバックアップを取ることをおすすめします
                        </div>
                      </div>
                    </li>
                  </ol>
                </div>
              )}
            </section>
          )}
        </div>
      </section>

      {/* フッター */}
      <footer className="footer">
        <p>© 2026 DMM Renamer</p>
        <p className="footer-credit">
          Powered by <a href="https://affiliate.dmm.com/api/" target="_blank" rel="noreferrer">DMM Webサービス</a>
        </p>
      </footer>
    </>
  )
}
