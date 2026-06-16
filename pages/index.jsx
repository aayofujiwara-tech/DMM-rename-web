import { useState, useRef, useEffect } from 'react'
import Head from 'next/head'

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

    const filenames = textInput
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0)

    if (filenames.length === 0) {
      setError('ファイル名を入力してください')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filenames, nameFormat }),
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

  const handleDownloadScript = () => {
    if (!folderPath.trim()) {
      alert('フォルダのパスを入力してからダウンロードしてください。')
      return
    }

    // PowerShellの二重引用符内で特殊な意味を持つ文字を除去
    // " → 文字列終端、` → エスケープ文字、$ → 変数展開
    const sanitizePS = (str) => str.replace(/["`$]/g, '')

    const basePath = sanitizePS(folderPath.trim().replace(/[/\\]+$/, ''))

    const lines = [
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
        lines.push(`try {`)
        lines.push(`  Rename-Item -LiteralPath "${basePath}\\${safeName}" -NewName "${safeNew}"`)
        lines.push(`  Write-Host "✓ ${safeNew}" -ForegroundColor Green`)
        lines.push(`} catch {`)
        lines.push(`  Write-Host "✗ エラー: ${safeName} - $_" -ForegroundColor Red`)
        lines.push(`}`)
        lines.push('')
      })

    lines.push('Write-Host ""')
    lines.push('Write-Host "処理が完了しました。このウィンドウを閉じるにはEnterを押してください。" -ForegroundColor Cyan')
    lines.push('Read-Host')

    const content = lines.join('\r\n')
    const blob = new Blob(['﻿' + content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'rename.ps1'
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
                ? '取得中...'
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
                  onClick={handleDownloadScript}
                  disabled={!folderPath.trim()}
                >
                  ⬇ PowerShellスクリプトをダウンロード（{okCount}件）
                  {!folderPath.trim() && (
                    <span style={{ fontSize: '12px', display: 'block', marginTop: '4px' }}>
                      ※ 上のフォルダパスを入力してください
                    </span>
                  )}
                </button>
              )}

              {/* 使い方説明 */}
              {okCount > 0 && (
                <div className="howto">
                  <h3 className="howto-title">📋 ファイルのリネーム方法</h3>

                  <div className="howto-intro">
                    上のボタンでダウンロードした <code>rename.ps1</code> を使って
                    ファイルを自動でリネームできます。
                  </div>

                  <ol className="howto-steps">
                    <li className="howto-step">
                      <span className="howto-num">1</span>
                      <div className="howto-content">
                        <strong>スクリプトをダウンロードする</strong>
                        <p>
                          上の緑のボタン「PowerShellスクリプトをダウンロード」をクリックすると
                          <code>rename.ps1</code> がダウンロードされます。
                        </p>
                        <div className="howto-image-desc">
                          💡 ダウンロード先は通常 <code>C:\Users\ユーザー名\Downloads</code> です
                        </div>
                      </div>
                    </li>

                    <li className="howto-step">
                      <span className="howto-num">2</span>
                      <div className="howto-content">
                        <strong>PowerShellを開いて以下を実行する</strong>
                        <p>
                          スタートメニューで「PowerShell」と検索して開き、
                          以下のコマンドを貼り付けてEnterを押してください。
                        </p>
                        <div className="howto-code">
                          <code>{'powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\\Downloads\\rename.ps1"'}</code>
                          <button
                            className="btn-copy-code"
                            onClick={() => navigator.clipboard.writeText(
                              'powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\\Downloads\\rename.ps1"'
                            )}
                          >
                            コピー
                          </button>
                        </div>
                        <div className="howto-note">
                          💡 このコマンドは署名なしスクリプトを安全に実行できる方法です
                        </div>
                      </div>
                    </li>

                    <li className="howto-step">
                      <span className="howto-num">3</span>
                      <div className="howto-content">
                        <strong>✅ リネーム完了！</strong>
                        <p>
                          <code>✓ ファイル名.dcv</code> と表示されれば成功です。
                          エクスプローラーで対象フォルダを確認してください。
                        </p>
                        <div className="howto-note">
                          ⚠️ 実行前に大切なファイルのバックアップを取ることをおすすめします
                        </div>
                      </div>
                    </li>

                    <li className="howto-step howto-step-optional">
                      <span className="howto-num howto-num-optional">?</span>
                      <div className="howto-content">
                        <strong>スクリプトをDownloads以外に保存した場合</strong>
                        <p>
                          上のコマンドの <code>{'$env:USERPROFILE\\Downloads\\rename.ps1'}</code> の部分を
                          実際の保存先パスに変更してください。
                        </p>
                        <div className="howto-code">
                          <code>{'powershell -ExecutionPolicy Bypass -File "C:\\保存先\\rename.ps1"'}</code>
                          <button
                            className="btn-copy-code"
                            onClick={() => navigator.clipboard.writeText(
                              'powershell -ExecutionPolicy Bypass -File "C:\\保存先\\rename.ps1"'
                            )}
                          >
                            コピー
                          </button>
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
