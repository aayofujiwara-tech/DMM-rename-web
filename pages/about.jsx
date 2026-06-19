import Head from 'next/head'
import Link from 'next/link'

export default function About() {
  return (
    <>
      <Head>
        <title>このツールについて - DMM Renamer</title>
      </Head>
      <div className="legal-page">
        <div className="legal-inner">
          <Link href="/" className="legal-back">← トップに戻る</Link>
          <h1>このツールについて</h1>
          <p className="legal-updated">運営: 海野坊頭 / プロトタイプ版</p>

          <section>
            <h2>何をするツールか</h2>
            <p>
              DMMからダウンロードした動画ファイル（.dcv / .wsdcf）のファイル名を、
              女優名・タイトルを含むわかりやすい名前に変換するWebツールです。
            </p>
            <p>
              ファイル名に含まれる品番（例: <code>miaa00629</code>）を抽出し、
              FANZA公式APIを使ってタイトル・女優名を取得します。
              変換結果はブラウザ上に表示され、PowerShell/シェルスクリプトとして
              ダウンロードできます。
            </p>
          </section>

          <section>
            <h2>✅ やっていること</h2>
            <ul>
              <li>入力されたファイル名から品番（cid）を抽出する</li>
              <li>FANZA公式API（Affiliate API v3）でタイトル・女優名を取得する</li>
              <li>リネーム用スクリプト（.ps1 / .sh / .bat）を生成してダウンロードさせる</li>
              <li>すべての処理はブラウザとFANZA公式サーバーの間で完結する</li>
            </ul>
          </section>

          <section>
            <h2>❌ やっていないこと</h2>
            <ul>
              <li>ファイル本体（動画）のアップロード・取得</li>
              <li>入力されたファイル名のサーバーへの永続保存</li>
              <li>個人情報・IPアドレスの収集・保存</li>
              <li>Cookieの発行</li>
              <li>第三者へのデータ提供</li>
              <li>スマートフォン・タブレットへの対応（DMMの.dcvファイルはPC専用のため）</li>
            </ul>
          </section>

          <section>
            <h2>ダウンロードされるファイルについて</h2>
            <p>
              「リネームファイルをダウンロード」ボタンを押すと、
              以下の3ファイルが入ったZIPがダウンロードされます。
              <strong>ファイルの中身はすべてブラウザ上で生成されます。
              サーバーは関与しません。</strong>
            </p>
            <ul>
              <li>
                <code>rename.ps1</code> —
                PowerShellスクリプト。Windows/Macで実行できます。
                <Link href="/source#ps1"> 安全性を確認する →</Link>
              </li>
              <li>
                <code>実行する.bat</code> —
                Windowsで.ps1を実行するためのバッチファイル。
                ダブルクリックで動きます。
                <Link href="/source#bat"> 安全性を確認する →</Link>
              </li>
              <li>
                <code>実行する.sh</code> —
                Mac/Linux用のシェルスクリプト。
                ターミナルから実行できます。
                <Link href="/source#sh"> 安全性を確認する →</Link>
              </li>
              <li>
                <code>README.txt</code> —
                実行方法の説明書きです。
              </li>
            </ul>
          </section>

          <section>
            <h2>動作環境</h2>
            <p>本ツールはPC（Windows・Mac・Linux）専用です。スマートフォン・タブレットには対応していません。</p>
          </section>

          <section>
            <h2>使用している外部サービス</h2>
            <ul>
              <li>
                <strong>FANZA Affiliate API（DMM.com）</strong> —
                タイトル・女優名の取得に使用。
                入力されたファイル名に含まれる品番がAPIリクエストに含まれます。
                <a href="https://affiliate.dmm.com/api/" target="_blank" rel="noreferrer">公式サイト</a>
              </li>
              <li>
                <strong>Vercel</strong> —
                本サービスのホスティング。
                <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noreferrer">プライバシーポリシー</a>
              </li>
            </ul>
          </section>

          <section>
            <h2>バグ報告・ご意見</h2>
            <p>
              動作しない場合や対応していないファイル名パターンがあれば、
              <a href="https://x.com/uminobozu125" target="_blank" rel="noreferrer">
                X（@uminobozu125）
              </a>
              にDMでお知らせください。
            </p>
          </section>

        </div>
      </div>
    </>
  )
}
