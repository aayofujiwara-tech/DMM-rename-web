import { useState, useRef, useEffect } from 'react'
import { flushSync } from 'react-dom'
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
  const [includeSubfolders, setIncludeSubfolders] = useState(false)
  const [showLabel, setShowLabel] = useState(true)
  const [shareOpen, setShareOpen] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const fileInputRef = useRef(null)

  const demoItems = [
    { before: 'ssis00100hhb.dcv',               after: '[SSIS-100] 君だけの特別な時間 - 涼川ひなた.dcv' },
    { before: 'jufe00300hhb.dcv',               after: '[JUFE-300] 秘密の放課後レッスン - 桜井もも.dcv' },
    { before: '1dandy00812a2d_v1_drm_a_4k.dcv', after: '[DANDY-812] 憧れの先輩と二人きり - 七瀬あおい.dcv' },
    { before: 'ipx00500hhb.dcv',               after: '[IPX-500] 甘えたい夜に - 白石りな.dcv' },
    { before: 'bmw00272mhb2.dcv',              after: '[BMW-272] 恋する季節のメロディー - 星野ことり.dcv' },
    { before: 'pred00248hhb.dcv',              after: '[PRED-248] ふたりだけの秘密 - 朝倉みく.dcv' },
    { before: '13dsvr01059vrv1uhqe1.wsdcf',    after: '[DSVR-1059] VR 甘い囁きの夜 - 桐島なお.wsdcf' },
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setDemoIndex(prev => (prev + 1) % demoItems.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [])

  // webkitdirectory は React JSX では確実に DOM に反映されないため直接 setAttribute で設定する
  useEffect(() => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('webkitdirectory', '')
      fileInputRef.current.setAttribute('directory', '')
    }
  }, [])

  // フォルダ選択からファイル名を取得
  const handleFolderSelect = (e) => {
    const files = [...e.target.files]
    const dcvFiles = files.filter(f => f.name.endsWith('.dcv') || f.name.endsWith('.wsdcf'))
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
        body: JSON.stringify({ filenames, nameFormat, showLabel }),
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
              // flushSyncでReact 18の自動バッチングを回避し、1件ごとに即座に再レンダーする
              flushSync(() => {
                setProgress({ current: event.current, total: event.total })
                setResults(prev => [...prev, event.result])
              })
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

    const basePath = folderPath.trim().replace(/[/\\]+$/, '')

    // PowerShell single-quoted strings: only ' needs escaping (doubled). $ and ` are not expanded.
    const sanitizePS = (str) => String(str).replace(/'/g, "''")
    // 制御文字・改行・シェル展開文字を含む値はスクリプトインジェクションの原因になるため拒否する
    const hasDangerousChars = (str) => /[\r\n\x00-\x1f$`]/.test(str)

    if (hasDangerousChars(basePath)) {
      alert('フォルダのパスに使用できない文字が含まれています。')
      return
    }

    const ps1Lines = [
      '# DMM Renamer - 自動リネームスクリプト',
      '# このスクリプトはDMM Renamerで生成されました',
      '# 実行前に必ずバックアップを取ってください',
      '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
      '$OutputEncoding = [System.Text.Encoding]::UTF8',
      '',
    ]

    const safeBase = sanitizePS(basePath)

    if (includeSubfolders) {
      ps1Lines.push('# サブフォルダも含めて検索してリネーム')
      ps1Lines.push(`$baseDir = '${safeBase}'`)
      ps1Lines.push('')
      results
        .filter(r => r.status === 'ok')
        .filter(r => !hasDangerousChars(r.filename) && !hasDangerousChars(r.newName))
        .forEach(r => {
          const safeName = sanitizePS(r.filename)
          const safeNew  = sanitizePS(r.newName)
          ps1Lines.push(`# ${safeName} -> ${safeNew}`)
          ps1Lines.push(`$target = Get-ChildItem -LiteralPath $baseDir -Filter '${safeName}' -Recurse | Select-Object -First 1`)
          ps1Lines.push(`if ($target) {`)
          ps1Lines.push(`  try {`)
          ps1Lines.push(`    Rename-Item -LiteralPath $target.FullName -NewName '${safeNew}'`)
          ps1Lines.push(`    Write-Host ('✓ ' + $target.DirectoryName + '\\' + '${safeNew}') -ForegroundColor Green`)
          ps1Lines.push(`  } catch {`)
          ps1Lines.push(`    Write-Host ('✗ エラー: ${safeName} - ' + $_) -ForegroundColor Red`)
          ps1Lines.push(`  }`)
          ps1Lines.push(`} else {`)
          ps1Lines.push(`  Write-Host '- スキップ（見つからず）: ${safeName}' -ForegroundColor Yellow`)
          ps1Lines.push(`}`)
          ps1Lines.push('')
        })
    } else {
      results
        .filter(r => r.status === 'ok')
        .filter(r => !hasDangerousChars(r.filename) && !hasDangerousChars(r.newName))
        .forEach(r => {
          const safeName = sanitizePS(r.filename)
          const safeNew  = sanitizePS(r.newName)
          ps1Lines.push(`try {`)
          ps1Lines.push(`  Rename-Item -LiteralPath '${safeBase}\\${safeName}' -NewName '${safeNew}'`)
          ps1Lines.push(`  Write-Host '✓ ${safeNew}' -ForegroundColor Green`)
          ps1Lines.push(`} catch {`)
          ps1Lines.push(`  Write-Host ('✗ エラー: ${safeName} - ' + $_) -ForegroundColor Red`)
          ps1Lines.push(`}`)
          ps1Lines.push('')
        })
    }

    ps1Lines.push('Write-Host ""')
    ps1Lines.push('Write-Host "処理が完了しました。Enterを押して閉じてください。" -ForegroundColor Cyan')
    ps1Lines.push('Read-Host')

    // Mac/Linux用 rename.sh
    const macBasePath = basePath.replace(/\\/g, '/')
    const sanitizeSh = (str) => String(str).replace(/'/g, "'\\''")
    const shLines = [
      '#!/bin/bash',
      '# DMM Renamer - 自動リネームスクリプト（Mac/Linux用）',
      '# このスクリプトはDMM Renamerで生成されました',
      '# 実行前に必ずバックアップを取ってください',
      '',
      'export LANG=ja_JP.UTF-8',
      '',
    ]

    if (includeSubfolders) {
      shLines.push(`BASE_DIR='${sanitizeSh(macBasePath)}'`)
      shLines.push('')
      results
        .filter(r => r.status === 'ok')
        .filter(r => !hasDangerousChars(r.filename) && !hasDangerousChars(r.newName))
        .forEach(r => {
          shLines.push(`TARGET=$(find '$BASE_DIR' -name '${sanitizeSh(r.filename)}' 2>/dev/null | head -1)`)
          shLines.push(`if [ -n "$TARGET" ]; then`)
          shLines.push(`  mv "$TARGET" "$(dirname "$TARGET")"/'${sanitizeSh(r.newName)}' && echo '✓ ${sanitizeSh(r.newName)}' || echo '✗ エラー: ${sanitizeSh(r.filename)}'`)
          shLines.push(`else`)
          shLines.push(`  echo '- スキップ（見つからず）: ${sanitizeSh(r.filename)}'`)
          shLines.push(`fi`)
          shLines.push('')
        })
    } else {
      results
        .filter(r => r.status === 'ok')
        .filter(r => !hasDangerousChars(r.filename) && !hasDangerousChars(r.newName))
        .forEach(r => {
          shLines.push(`mv '${sanitizeSh(macBasePath)}/${sanitizeSh(r.filename)}' '${sanitizeSh(macBasePath)}/${sanitizeSh(r.newName)}' && echo '✓ ${sanitizeSh(r.newName)}' || echo '✗ エラー: ${sanitizeSh(r.filename)}'`)
        })
    }

    shLines.push('')
    shLines.push('echo ""')
    shLines.push('echo "処理が完了しました。"')
    shLines.push('read -p "Enterキーを押して終了..."')

    const batContent = [
      '@echo off',
      'chcp 65001 > nul',
      'powershell -ExecutionPolicy Bypass -File "%~dp0rename.ps1"',
      'pause',
    ].join('\r\n')

    const zip = new JSZip()
    zip.file('rename.ps1', '﻿' + ps1Lines.join('\r\n'), { binary: false })
    zip.file('実行する.bat', batContent, { binary: false })
    zip.file('実行する.sh', shLines.join('\n'), { binary: false })
    zip.file('README.txt', [
      'DMM Renamer - 自動リネームスクリプト',
      '================================',
      '',
      '【Windowsの方】',
      '「実行する.bat」をダブルクリックして実行してください。',
      '',
      '【Macの方】',
      '1. ターミナルを開く（アプリケーション → ユーティリティ → ターミナル）',
      '2. 以下のコマンドを貼り付けてEnterを押す:',
      '   bash ~/Downloads/rename/実行する.sh',
      '   ※ ZIPの展開先が異なる場合はパスを変更してください',
      '',
      '【Linuxの方】',
      '1. ターミナルを開く',
      '2. 以下のコマンドを実行してスクリプトに実行権限を付与する:',
      '   chmod +x /path/to/実行する.sh',
      '   ※ /path/to/ の部分はこのファイルがある場所のパスに変更してください',
      '3. 以下のコマンドで実行する:',
      '   bash /path/to/実行する.sh',
      '',
      '【注意事項】',
      '・実行前に必ずバックアップを取ってください',
      '・リネームは元に戻せません',
      '・Mac/Linuxの場合、日本語ファイル名が正しく表示されない場合は',
      '  ターミナルの文字コードをUTF-8に設定してください',
      '',
      'Generated by DMM Renamer',
      'https://dmm-rename-web.vercel.app',
    ].join('\r\n'), { binary: false })

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
            2D（.dcv）・VR（.wsdcf）両対応。貼り付けるだけ、無料、登録不要。
          </p>
          <div className="os-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
            </svg>
Windows / Mac / Linux 対応
          </div>
          <a href="#tool" className="hero-btn">今すぐ無料で使う →</a>

          <div className="proto-notice">
            🚧 現在プロトタイプ版です。正常に動作しない場合や
            対応していないファイル名パターンがあれば、
            <a href="https://twitter.com/messages/compose?recipient_id=uminobozu125" target="_blank" rel="noreferrer">
              X（@uminobozu125）のDM
            </a>
            でお知らせください。
          </div>

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
              <p className="step-desc">DMMでダウンロードした.dcv（2D）・.wsdcf（VR）のファイル名をコピーして貼り付けるだけ。フォルダを選択して一括取得も可能。</p>
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
              <p className="feature-desc">.dcv（2D）・.wsdcf（VR）ファイルが入ったフォルダを選択するだけでファイル名を自動取得。一つひとつコピペする手間が不要です。</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <div className="feature-title">一括処理</div>
              <p className="feature-desc">複数のファイルをまとめて変換。1回あたり最大50件まで処理できます。</p>
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
              <p className="method-desc">
                .dcvファイルが入っているフォルダを選択してください。
                選択したフォルダ直下のファイル名が自動で取得されます。
                <span className="os-note">※ リネームスクリプトはWindows・Mac・Linux対応です</span>
              </p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFolderSelect}
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
              <p className="method-desc">
                エクスプローラーでファイルを選択してファイル名をコピーし、
                以下に貼り付けてください。1行に1ファイル名を入力してください。
              </p>
              <textarea
                value={textInput}
                onChange={e => { setTextInput(e.target.value); setInputMethod('text') }}
                placeholder={'miaa00629mhb.dcv\npred00248hhb.dcv\n13dsvr01059vrv1uhqe1.wsdcf'}
                rows={6}
              />
            </div>

            {/* サブフォルダオプション */}
            <div className="subfolder-option">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={includeSubfolders}
                  onChange={e => setIncludeSubfolders(e.target.checked)}
                />
                <span>サブフォルダ内のファイルも処理する</span>
              </label>
              <p className="subfolder-note">
                {includeSubfolders
                  ? '⚠️ 指定フォルダ内のすべてのサブフォルダも対象になります。実行前に必ずバックアップを取ってください。'
                  : '💡 チェックを入れると、サブフォルダ内のファイルも一括でリネームできます。'
                }
              </p>
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
              <div className="subfolder-option" style={{marginTop: '12px'}}>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={showLabel}
                    onChange={e => setShowLabel(e.target.checked)}
                  />
                  <span>品番を含める（例: [MIAA-629]）</span>
                </label>
                <p className="subfolder-note">
                  {showLabel
                    ? '✅ ファイル名の先頭に品番が付きます'
                    : '⚠️ 品番なしでリネームされます。後から品番を確認できなくなる場合があります。'
                  }
                </p>
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
                  <label className={`method-label ${folderPath.trim() ? 'label-ok' : 'label-required'}`}>
                    {folderPath.trim()
                      ? '✅ フォルダのパス（入力済み）'
                      : '⚠️ リネーム対象フォルダのパスを入力（必須）'
                    }
                  </label>
                  <div className="path-howto">
                    <div className="path-howto-item">
                      <span className="path-howto-badge">フォルダ選択を使った場合</span>
                      <span>
                        上で選択したフォルダ（{folderName ? <code>{folderName}</code> : 'フォルダ名'}）を
                        エクスプローラーで開いてアドレスバーをクリックし、パスをコピーしてください。
                      </span>
                    </div>
                    <div className="path-howto-item">
                      <span className="path-howto-badge">ファイル名を貼り付けた場合</span>
                      <span>
                        対象ファイルが入っているフォルダをエクスプローラーで開き、
                        アドレスバーをクリックしてパスをコピーしてください。
                      </span>
                    </div>
                    {includeSubfolders && (
                      <div className="path-howto-item path-howto-warn">
                        <span className="path-howto-badge path-howto-badge-warn">サブフォルダ処理ON</span>
                        <span>
                          サブフォルダも処理する場合は、<strong>一番上の親フォルダ</strong>のパスを入力してください。
                          例: サブフォルダが <code>D:\movie\古川いおり\VR</code> なら
                          親フォルダ <code>D:\movie\古川いおり</code> を指定します。
                        </span>
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    className={`path-input ${folderPath.trim() ? 'path-input-ok' : 'path-input-empty'}`}
                    value={folderPath}
                    onChange={e => setFolderPath(e.target.value)}
                    placeholder="例: D:\ain\movie\古川いおり"
                  />
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
                    ZIPの中にWindowsとMac両方のスクリプトが入っています。
                  </div>

                  {/* Windows手順 */}
                  <div className="howto-os-section">
                    <div className="howto-os-header">
                      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                        <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
                      </svg>
                      Windows の場合
                    </div>
                    <ol className="howto-steps">
                      <li className="howto-step">
                        <span className="howto-num">1</span>
                        <div className="howto-content">
                          <strong>ZIPをダウンロードして展開する</strong>
                          <p>「リネームファイルをダウンロード」をクリックして<code>rename.zip</code>をダウンロード。右クリック →「すべて展開」で展開してください。</p>
                        </div>
                      </li>
                      <li className="howto-step">
                        <span className="howto-num">2</span>
                        <div className="howto-content">
                          <strong>「実行する.bat」をダブルクリック</strong>
                          <p>展開したフォルダの中の<code>実行する.bat</code>をダブルクリックするだけで完了です。</p>
                          <div className="howto-steps-sub">
                            <div className="howto-sub-step">① 実行する.bat をダブルクリック</div>
                            <div className="howto-sub-arrow">↓</div>
                            <div className="howto-sub-step">②「開く」または「実行」をクリック</div>
                            <div className="howto-sub-arrow">↓</div>
                            <div className="howto-sub-step">✅ リネーム完了！</div>
                          </div>
                          <div className="howto-note">
                            ⚠️ 「WindowsによってPCが保護されました」と表示された場合は「詳細情報」→「実行」をクリック
                          </div>
                        </div>
                      </li>
                    </ol>
                  </div>

                  {/* Mac手順 */}
                  <div className="howto-os-section">
                    <div className="howto-os-header howto-os-header-mac">
                      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                        <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
                      </svg>
                      Mac の場合
                    </div>
                    <ol className="howto-steps">
                      <li className="howto-step">
                        <span className="howto-num">1</span>
                        <div className="howto-content">
                          <strong>ZIPをダウンロードして展開する</strong>
                          <p>「リネームファイルをダウンロード」をクリックして<code>rename.zip</code>をダウンロード。ダブルクリックで展開されます。</p>
                        </div>
                      </li>
                      <li className="howto-step">
                        <span className="howto-num">2</span>
                        <div className="howto-content">
                          <strong>ターミナルを開く</strong>
                          <p>Finderで「アプリケーション」→「ユーティリティ」→「ターミナル」を開いてください。</p>
                          <div className="howto-note">
                            💡 Spotlight（⌘ + Space）で「ターミナル」と検索しても開けます
                          </div>
                        </div>
                      </li>
                      <li className="howto-step">
                        <span className="howto-num">3</span>
                        <div className="howto-content">
                          <strong>以下のコマンドを実行する</strong>
                          <p>ターミナルに以下を貼り付けてEnterを押してください。</p>
                          <div className="howto-code">
                            <code>bash ~/Downloads/rename/実行する.sh</code>
                            <button
                              className="btn-copy-code"
                              onClick={() => navigator.clipboard.writeText('bash ~/Downloads/rename/実行する.sh')}
                            >
                              コピー
                            </button>
                          </div>
                          <p style={{marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)'}}>
                            ※ ZIPの展開先が異なる場合はパスを変更してください
                          </p>
                          <div className="howto-steps-sub" style={{marginTop: '10px'}}>
                            <div className="howto-sub-step">✅ 「✓ ファイル名.dcv」と表示されれば完了！</div>
                          </div>
                        </div>
                      </li>
                    </ol>
                  </div>

                  <div className="howto-warning">
                    ⚠️ <strong>注意:</strong> スクリプトを実行するとファイル名が変更されます。
                    実行前に大切なファイルのバックアップを取ることをおすすめします。
                  </div>
                </div>
              )}

              {results.some(r => r.status === 'not_found') && (
                <div className="feedback-section">
                  <h4 className="feedback-title">🔍 取得できなかったファイルについて</h4>
                  <p className="feedback-desc">
                    販売停止・削除済みのコンテンツは情報を取得できません。<br />
                    それ以外の理由で取得できなかった場合は、ファイル名をXのDMでお知らせください。対応を検討します。
                  </p>
                  <a
                    href={`https://twitter.com/messages/compose?recipient_id=uminobozu125&text=${encodeURIComponent(
                      'DMM Renamerでヒットしなかったファイル名を報告します。\n\n' +
                      results.filter(r => r.status === 'not_found').map(r => `・${r.filename}`).join('\n')
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-feedback"
                  >
                    📩 X（@uminobozu125）のDMで報告する
                  </a>
                  <p className="feedback-note">
                    ※ Xのアカウントが必要です。ファイル名以外の個人情報は不要です。
                  </p>
                </div>
              )}
            </section>
          )}
        </div>
      </section>

      {/* シェアメニュー */}
      <div className="share-container">
        {shareOpen && (
          <div className="share-menu">
            <p className="share-menu-label">シェアする</p>

            {/* X */}
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                'DMMのダウンロードファイルを自動でリネームできるツール\n\nmiaa00629mhb.dcv\n→ [MIAA-629] タイトル名 - 女優名.dcv\n\n無料・登録不要で使えます\n@uminobozu125 #DMM #FANZA'
              )}&url=${encodeURIComponent('https://dmm-rename-web.vercel.app')}`}
              target="_blank"
              rel="noreferrer"
              className="share-menu-item"
              onClick={() => setShareOpen(false)}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.912-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              X（Twitter）
            </a>

            {/* LINE */}
            <a
              href={`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent('https://dmm-rename-web.vercel.app')}`}
              target="_blank"
              rel="noreferrer"
              className="share-menu-item"
              onClick={() => setShareOpen(false)}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
              </svg>
              LINE
            </a>

            {/* Facebook */}
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://dmm-rename-web.vercel.app')}`}
              target="_blank"
              rel="noreferrer"
              className="share-menu-item"
              onClick={() => setShareOpen(false)}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </a>

            <div className="share-menu-divider" />

            {/* リンクをコピー */}
            <button
              className="share-menu-item"
              onClick={() => {
                navigator.clipboard.writeText('https://dmm-rename-web.vercel.app')
                setLinkCopied(true)
                setTimeout(() => {
                  setLinkCopied(false)
                  setShareOpen(false)
                }, 1500)
              }}
            >
              {linkCopied ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  コピーしました！
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  リンクをコピー
                </>
              )}
            </button>
          </div>
        )}

        {/* メインボタン */}
        <button
          className={`share-main-btn ${shareOpen ? 'share-main-btn-open' : ''}`}
          onClick={() => setShareOpen(!shareOpen)}
          aria-label="シェア"
        >
          {shareOpen ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <circle cx="18" cy="5" r="3"/>
              <circle cx="6" cy="12" r="3"/>
              <circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          )}
        </button>
      </div>

      {shareOpen && (
        <div
          className="share-overlay"
          onClick={() => setShareOpen(false)}
        />
      )}

      {/* フッター */}
      <footer className="footer">
        <p>© 2026 DMM Renamer</p>
        <p className="footer-credit">
          Powered by <a href="https://affiliate.dmm.com/api/" target="_blank" rel="noreferrer">DMM Webサービス</a>
        </p>
        <div className="footer-links">
          <a href="/terms">利用規約</a>
          <span>|</span>
          <a href="/privacy">プライバシーポリシー</a>
          <span>|</span>
          <a href="/age-check">年齢確認</a>
          <span>|</span>
          <a href="https://twitter.com/messages/compose?recipient_id=uminobozu125" target="_blank" rel="noreferrer">バグ報告</a>
        </div>
        <p className="footer-age">
          🔞 本サービスは18歳以上の方を対象としています
        </p>
        <p className="footer-operator">
          運営: 海野坊頭
        </p>
      </footer>
    </>
  )
}
