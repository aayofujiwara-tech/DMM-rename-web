import Head from 'next/head'
import Link from 'next/link'

const PS1_TEMPLATE = `# DMM Renamer - 自動リネームスクリプト（Windows用）
# このスクリプトはDMM Renamerで生成されました
# 実行前に必ずバックアップを取ってください
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# 例: フォルダ直下のファイルをリネームする場合
try {
  Rename-Item -LiteralPath "C:\\フォルダのパス\\miaa00629mhb.dcv" -NewName "[MIAA-629] タイトル名 - 女優名.dcv"
  Write-Host "✓ [MIAA-629] タイトル名 - 女優名.dcv" -ForegroundColor Green
} catch {
  Write-Host "✗ エラー: miaa00629mhb.dcv - $\_" -ForegroundColor Red
}

Write-Host ""
Write-Host "処理が完了しました。Enterを押して閉じてください。" -ForegroundColor Cyan
Read-Host`

const BAT_TEMPLATE = `@echo off
chcp 65001 > nul
powershell -ExecutionPolicy Bypass -File "%~dp0rename.ps1"
pause`

const SH_TEMPLATE = `#!/bin/bash
# DMM Renamer - 自動リネームスクリプト（Mac/Linux用）
# このスクリプトはDMM Renamerで生成されました
# 実行前に必ずバックアップを取ってください
export LANG=ja_JP.UTF-8

# 例: フォルダ直下のファイルをリネームする場合
mv "/フォルダのパス/miaa00629mhb.dcv" "/フォルダのパス/[MIAA-629] タイトル名 - 女優名.dcv" \\
  && echo "✓ [MIAA-629] タイトル名 - 女優名.dcv" \\
  || echo "✗ エラー: miaa00629mhb.dcv"

echo ""
echo "処理が完了しました。"
read -p "Enterキーを押して終了..."`

export default function Source() {
  const copy = (text) => navigator.clipboard.writeText(text)

  return (
    <>
      <Head>
        <title>ソースコード - DMM Renamer</title>
      </Head>
      <div className="legal-page">
        <div className="legal-inner">
          <Link href="/" className="legal-back">← トップに戻る</Link>
          <h1>ダウンロードファイルの中身</h1>
          <p className="legal-updated">
            「リネームファイルをダウンロード」で生成されるファイルのテンプレートです。
            実際のファイルにはあなたが入力したフォルダパスとファイル名が入ります。
          </p>

          <section id="ps1">
            <h2>rename.ps1（Windows/Mac用 PowerShellスクリプト）</h2>
            <p>
              実際のリネーム処理を行うスクリプトです。
              各ファイルに対して <code>Rename-Item</code> コマンドを実行します。
              エラーが発生した場合は赤字でエラー内容を表示してスキップします。
            </p>
            <div className="source-block">
              <div className="source-header">
                <span className="source-filename">rename.ps1</span>
                <button className="btn-copy-code" onClick={() => copy(PS1_TEMPLATE)}>
                  コピー
                </button>
              </div>
              <pre className="source-code">{PS1_TEMPLATE}</pre>
            </div>
          </section>

          <section id="bat">
            <h2>実行する.bat（Windows用バッチファイル）</h2>
            <p>
              ダブルクリックで <code>rename.ps1</code> を実行するためのファイルです。
              PowerShellの実行ポリシーを一時的にバイパスして実行します。
              このファイル自体はリネーム処理を行いません。
            </p>
            <div className="source-block">
              <div className="source-header">
                <span className="source-filename">実行する.bat</span>
                <button className="btn-copy-code" onClick={() => copy(BAT_TEMPLATE)}>
                  コピー
                </button>
              </div>
              <pre className="source-code">{BAT_TEMPLATE}</pre>
            </div>
          </section>

          <section id="sh">
            <h2>実行する.sh（Mac/Linux用シェルスクリプト）</h2>
            <p>
              Mac/Linux環境でリネームを実行するスクリプトです。
              <code>mv</code> コマンドでファイル名を変更します。
              シングルクォートを使用しているため、
              ファイル名に含まれる特殊文字がシェルに展開されません。
            </p>
            <div className="source-block">
              <div className="source-header">
                <span className="source-filename">実行する.sh</span>
                <button className="btn-copy-code" onClick={() => copy(SH_TEMPLATE)}>
                  コピー
                </button>
              </div>
              <pre className="source-code">{SH_TEMPLATE}</pre>
            </div>
          </section>

          <section>
            <h2>安全性について</h2>
            <ul>
              <li>これらのファイルはすべて<strong>ブラウザ上で生成</strong>されます。サーバーは関与しません。</li>
              <li>インターネットへの接続は一切行いません。</li>
              <li>実行するのは <code>Rename-Item</code>（Windows）または <code>mv</code>（Mac/Linux）のみです。</li>
              <li>ファイルの削除・上書き・外部送信は行いません。</li>
            </ul>
          </section>

        </div>
      </div>
    </>
  )
}
