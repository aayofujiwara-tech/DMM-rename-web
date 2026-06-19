import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'

const sections = [
  {
    id: 'safety',
    title: '🛡️ 安全性の根拠',
    summary: 'このツールがなぜ安全なのかを説明します',
    content: (
      <div className="source-safety">
        <div className="source-safety-item">
          <div className="source-safety-icon">✅</div>
          <div>
            <strong>ブラウザ上で完結して生成される</strong>
            <p>スクリプトはあなたのブラウザ内で生成されます。サーバーはファイルを生成・保存しません。</p>
          </div>
        </div>
        <div className="source-safety-item">
          <div className="source-safety-icon">✅</div>
          <div>
            <strong>実行するコマンドは1種類だけ</strong>
            <p>Windows版は <code>Rename-Item</code>、Mac/Linux版は <code>mv</code> コマンドのみ。ファイル名を変えるだけの命令です。</p>
          </div>
        </div>
        <div className="source-safety-item">
          <div className="source-safety-icon">✅</div>
          <div>
            <strong>インターネット通信なし</strong>
            <p>スクリプト実行中はインターネットに一切接続しません。外部へのデータ送信はゼロです。</p>
          </div>
        </div>
        <div className="source-safety-item">
          <div className="source-safety-icon">✅</div>
          <div>
            <strong>ファイルの削除・上書きなし</strong>
            <p>既存ファイルを削除したり上書きしたりしません。ファイル名だけを変更します。</p>
          </div>
        </div>
        <div className="source-safety-item">
          <div className="source-safety-icon">✅</div>
          <div>
            <strong>コードは全てこのページで確認可能</strong>
            <p>以下の各セクションで実際に生成されるコードを確認できます。難読化・暗号化は一切していません。</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'ps1',
    title: '📄 rename.ps1（PowerShellスクリプト）',
    summary: 'Windows/Mac共通。実際のリネーム処理を行うメインスクリプト',
    explanation: [
      { line: '# コメント行（#で始まる行は実行されません）', desc: 'スクリプトの説明文です。実行には影響しません。' },
      { line: '[Console]::OutputEncoding = ...', desc: '日本語ファイル名を正しく表示するための文字コード設定です。' },
      { line: 'try { ... } catch { ... }', desc: 'エラーが起きても他のファイルの処理を続けるための構文です。' },
      { line: 'Rename-Item -LiteralPath "元のパス" -NewName "新しい名前"', desc: 'ファイル名を変更する唯一のコマンドです。これ以外の操作は行いません。' },
      { line: 'Write-Host "✓ ..."', desc: '処理結果を画面に表示するだけです。ファイル操作ではありません。' },
      { line: 'Read-Host', desc: 'Enterキーを待つ命令です。実行完了後に自動で閉じないようにしています。' },
    ],
    code: `# DMM Renamer - 自動リネームスクリプト（Windows用）
# このスクリプトはDMM Renamerで生成されました
# 実行前に必ずバックアップを取ってください
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

try {
  Rename-Item -LiteralPath "C:\\フォルダのパス\\miaa00629mhb.dcv" \`
              -NewName "[MIAA-629] タイトル名 - 女優名.dcv"
  Write-Host "✓ [MIAA-629] タイトル名 - 女優名.dcv" -ForegroundColor Green
} catch {
  Write-Host "✗ エラー: miaa00629mhb.dcv - $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "処理が完了しました。Enterを押して閉じてください。" -ForegroundColor Cyan
Read-Host`,
  },
  {
    id: 'bat',
    title: '📄 実行する.bat（Windowsバッチファイル）',
    summary: 'ダブルクリックで rename.ps1 を起動するだけのファイル',
    explanation: [
      { line: '@echo off', desc: 'コマンドの実行ログを非表示にします。見た目をすっきりさせるだけです。' },
      { line: 'chcp 65001 > nul', desc: 'コマンドプロンプトの文字コードをUTF-8に設定します。日本語対応のためです。' },
      { line: 'powershell -ExecutionPolicy Bypass -File "%~dp0rename.ps1"', desc: 'このファイルと同じフォルダにある rename.ps1 を実行します。これだけです。' },
      { line: 'pause', desc: '実行後にウィンドウが自動で閉じないようにします。' },
    ],
    code: `@echo off
chcp 65001 > nul
powershell -ExecutionPolicy Bypass -File "%~dp0rename.ps1"
pause`,
  },
  {
    id: 'sh',
    title: '📄 実行する.sh（Mac/Linuxシェルスクリプト）',
    summary: 'Mac/Linux用。mvコマンドでファイル名を変更するだけ',
    explanation: [
      { line: '#!/bin/bash', desc: 'このファイルをbashで実行することを宣言する1行目です。必須の記述です。' },
      { line: 'export LANG=ja_JP.UTF-8', desc: '日本語ファイル名を正しく扱うための文字コード設定です。' },
      { line: "mv '元のパス' '新しいパス'", desc: 'ファイル名を変更するコマンドです。シングルクォートで囲むことで特殊文字を安全に扱います。' },
      { line: '&& echo "✓ ..."', desc: 'mvが成功した場合に完了メッセージを表示します。ファイル操作ではありません。' },
      { line: "|| echo '✗ エラー'", desc: 'mvが失敗した場合にエラーメッセージを表示します。' },
      { line: 'read -p "..."', desc: 'Enterキーを待つ命令です。実行完了後に自動で閉じないようにしています。' },
    ],
    code: `#!/bin/bash
# DMM Renamer - 自動リネームスクリプト（Mac/Linux用）
# このスクリプトはDMM Renamerで生成されました
# 実行前に必ずバックアップを取ってください
export LANG=ja_JP.UTF-8

mv '/フォルダのパス/miaa00629mhb.dcv' \\
   '/フォルダのパス/[MIAA-629] タイトル名 - 女優名.dcv' \\
  && echo '✓ [MIAA-629] タイトル名 - 女優名.dcv' \\
  || echo '✗ エラー: miaa00629mhb.dcv'

echo ""
echo "処理が完了しました。"
read -p "Enterキーを押して終了..."`,
  },
  {
    id: 'faq',
    title: '❓ よくある疑問',
    summary: 'ウイルスじゃないの？ファイルが消えない？など',
    faqs: [
      {
        q: 'ウイルスやマルウェアじゃないの？',
        a: 'スクリプトの中身はこのページで全て確認できます。難読化・暗号化は一切していません。実行するコマンドは Rename-Item（Windows）と mv（Mac/Linux）の2種類のみで、どちらもOSに標準搭載されたファイル名変更コマンドです。'
      },
      {
        q: 'ファイルが消えたり壊れたりしない？',
        a: 'ファイルの削除・移動・上書きは行いません。ファイル名（テキスト情報）だけを変更します。ただし念のため、実行前にバックアップを取ることを強く推奨します。'
      },
      {
        q: '個人情報や動画が外部に送信されない？',
        a: 'スクリプト実行中はインターネットに接続しません。ファイルの中身（動画データ）には一切アクセスしません。このサイトに送信されるのはファイル名（品番）のみで、それもFANZA公式APIへの検索に使われるだけです。'
      },
      {
        q: 'なぜWindowsがセキュリティ警告を出すの？',
        a: 'ブラウザからダウンロードしたファイルはWindowsが「インターネット由来」としてマークするため、PowerShellスクリプトの実行に確認が求められます。これはWindowsの正常なセキュリティ機能です。コードの中身はこのページで確認できます。'
      },
      {
        q: 'リネームを元に戻せる？',
        a: '通常のリネームと同じなので、Windowsのエクスプローラーで手動で元のファイル名に戻すことができます。ただし元のファイル名（例: miaa00629mhb.dcv）を控えておく必要があります。'
      },
    ],
  },
]

function AccordionSection({ section }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(section.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`accordion ${open ? 'accordion-open' : ''}`}>
      <button className="accordion-header" onClick={() => setOpen(!open)}>
        <div className="accordion-title">
          <span>{section.title}</span>
          <span className="accordion-summary">{section.summary}</span>
        </div>
        <span className="accordion-chevron">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="accordion-body">
          {section.content && section.content}

          {section.explanation && (
            <>
              <h3 className="accordion-sub-title">📝 各行の説明</h3>
              <div className="source-explanations">
                {section.explanation.map((item, i) => (
                  <div key={i} className="source-explanation-item">
                    <code className="source-explanation-line">{item.line}</code>
                    <p className="source-explanation-desc">→ {item.desc}</p>
                  </div>
                ))}
              </div>

              <h3 className="accordion-sub-title">💻 実際のコード（テンプレート）</h3>
              <div className="source-block">
                <div className="source-header">
                  <span className="source-filename">
                    {section.id === 'ps1' ? 'rename.ps1' : section.id === 'bat' ? '実行する.bat' : '実行する.sh'}
                  </span>
                  <button className="btn-copy-code" onClick={handleCopy}>
                    {copied ? '✓ コピー済み' : 'コピー'}
                  </button>
                </div>
                <pre className="source-code">{section.code}</pre>
              </div>
            </>
          )}

          {section.faqs && (
            <div className="source-faqs">
              {section.faqs.map((faq, i) => (
                <div key={i} className="source-faq-item">
                  <div className="source-faq-q">Q. {faq.q}</div>
                  <div className="source-faq-a">A. {faq.a}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Source() {
  return (
    <>
      <Head>
        <title>ファイルの安全性について - DMM Renamer</title>
      </Head>
      <div className="legal-page">
        <div className="legal-inner">
          <Link href="/" className="legal-back">← トップに戻る</Link>
          <h1>ダウンロードファイルの安全性について</h1>
          <p className="legal-updated">
            「リネームファイルをダウンロード」で生成されるファイルの中身と安全性を説明します。
            各項目をクリックすると詳細が表示されます。
          </p>

          <div className="accordion-list">
            {sections.map(section => (
              <AccordionSection key={section.id} section={section} />
            ))}
          </div>

          <div className="source-contact">
            <p>
              それでも不安な点がある場合は
              <a href="https://x.com/uminobozu125" target="_blank" rel="noreferrer">
                X（@uminobozu125）
              </a>
              にDMでお気軽にお問い合わせください。
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
