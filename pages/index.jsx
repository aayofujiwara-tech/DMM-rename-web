import { useState, useRef, useEffect } from 'react'
import Head from 'next/head'

export default function Home() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [textInput, setTextInput] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [folderPath, setFolderPath] = useState('')
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
    const lines = ['# DMM Renamer - 自動リネームスクリプト']
    lines.push('# このスクリプトはDMM Renamerで生成されました')
    lines.push('# 実行前に必ずバックアップを取ってください')
    lines.push('')

    // PowerShellの二重引用符内で特殊な意味を持つ文字を除去
    // " → 文字列終端、` → エスケープ文字、$ → 変数展開
    const sanitizePS = (str) => str.replace(/["`$]/g, '')

    const basePath = sanitizePS(folderPath.trim())

    results
      .filter(r => r.status === 'ok')
      .forEach(r => {
        const safeFilename = sanitizePS(r.filename)
        const safeNewName = sanitizePS(r.newName)
        const oldPath = basePath
          ? `"${basePath}\\${safeFilename}"`
          : `".\\${safeFilename}"`
        const newPath = basePath
          ? `"${basePath}\\${safeNewName}"`
          : `".\\${safeNewName}"`
        lines.push(`Rename-Item ${oldPath} ${newPath}`)
      })

    lines.push('')
    lines.push('Write-Host "リネーム完了しました！" -ForegroundColor Green')
    lines.push('Read-Host "Enterキーを押して終了"')

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
                onChange={e => setTextInput(e.target.value)}
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
                </div>
              )}

              {/* スクリプトダウンロードボタン */}
              {okCount > 0 && (
                <button className="btn-download" onClick={handleDownloadScript}>
                  ⬇ PowerShellスクリプトをダウンロード（{okCount}件）
                </button>
              )}

              {/* 使い方説明 */}
              {okCount > 0 && (
                <div className="howto">
                  <h3 className="howto-title">📋 ファイルのリネーム方法</h3>

                  <div className="howto-intro">
                    上のボタンでダウンロードした <code>rename.ps1</code> を使って、
                    ファイルを自動でリネームできます。<br />
                    通常は <strong>ステップ1・2だけ</strong> で完了します。
                  </div>

                  <ol className="howto-steps">
                    <li className="howto-step">
                      <span className="howto-num">1</span>
                      <div className="howto-content">
                        <strong>スクリプトをダウンロードする</strong>
                        <p>
                          上の緑のボタン「PowerShellスクリプトをダウンロード」をクリックすると、
                          <code>rename.ps1</code> というファイルがダウンロードされます。
                        </p>
                        <div className="howto-image-desc">
                          💡 ダウンロード先は通常 <code>C:\Users\ユーザー名\Downloads</code> です
                        </div>
                      </div>
                    </li>

                    <li className="howto-step">
                      <span className="howto-num">2</span>
                      <div className="howto-content">
                        <strong>右クリック →「PowerShellで実行」を選ぶ</strong>
                        <p>
                          ダウンロードした <code>rename.ps1</code> を
                          <strong>右クリック</strong>して、
                          メニューから <strong>「PowerShellで実行」</strong> を選択してください。
                        </p>
                        <div className="howto-steps-sub">
                          <div className="howto-sub-step">① rename.ps1 を右クリック</div>
                          <div className="howto-sub-arrow">↓</div>
                          <div className="howto-sub-step">②「PowerShellで実行」をクリック</div>
                          <div className="howto-sub-arrow">↓</div>
                          <div className="howto-sub-step">③「開く」または「実行」をクリック</div>
                          <div className="howto-sub-arrow">↓</div>
                          <div className="howto-sub-step">✅ リネーム完了！</div>
                        </div>
                        <div className="howto-note">
                          ⚠️ 実行前に確認ダイアログが出る場合があります。「開く」を選択してください。
                        </div>
                      </div>
                    </li>

                    <li className="howto-step howto-step-optional">
                      <span className="howto-num howto-num-optional">?</span>
                      <div className="howto-content">
                        <strong>エラーが出た場合のみ：実行ポリシーを変更する</strong>
                        <p>
                          「このシステムではスクリプトの実行が無効になっています」
                          というエラーが表示された場合のみ、以下の手順を実施してください。
                          <strong>一度だけ設定すれば次回以降は不要です。</strong>
                        </p>

                        <div className="howto-substeps">
                          <div className="howto-substep">
                            <span className="howto-substep-num">1</span>
                            <div>
                              <strong>PowerShellを管理者として開く</strong>
                              <p>スタートメニューで「PowerShell」と検索 → 右クリック →「管理者として実行」</p>
                            </div>
                          </div>
                          <div className="howto-substep">
                            <span className="howto-substep-num">2</span>
                            <div>
                              <strong>以下のコマンドを貼り付けてEnterを押す</strong>
                              <div className="howto-code">
                                <code>Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser</code>
                                <button
                                  className="btn-copy-code"
                                  onClick={() => navigator.clipboard.writeText('Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser')}
                                >
                                  コピー
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className="howto-substep">
                            <span className="howto-substep-num">3</span>
                            <div>
                              <strong>「Y」を入力してEnterを押す</strong>
                              <p>確認が出たら <code>Y</code> を入力してEnterを押してください。</p>
                            </div>
                          </div>
                          <div className="howto-substep">
                            <span className="howto-substep-num">4</span>
                            <div>
                              <strong>ステップ2に戻って再度実行する</strong>
                              <p>設定完了後、rename.ps1 を右クリック →「PowerShellで実行」で実行できます。</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  </ol>

                  <div className="howto-warning">
                    ⚠️ <strong>注意:</strong> スクリプトを実行するとファイル名が変更されます。
                    実行前に大切なファイルのバックアップを取ることをおすすめします。
                  </div>
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
