import Head from 'next/head'
import Link from 'next/link'

export default function Privacy() {
  return (
    <>
      <Head>
        <title>プライバシーポリシー - DMM Renamer</title>
      </Head>
      <div className="legal-page">
        <div className="legal-inner">
          <Link href="/" className="legal-back">← トップに戻る</Link>
          <h1>プライバシーポリシー</h1>
          <p className="legal-updated">最終更新日: 2026年6月1日</p>

          <section>
            <h2>収集する情報</h2>
            <p>
              本サービスは以下の情報を収集します。
            </p>
            <ul>
              <li>
                <strong>入力されたファイル名</strong>:
                変換処理のためにサーバーに送信されます。
                処理完了後は保存されません。
              </li>
              <li>
                <strong>年齢確認の状態</strong>:
                お使いのブラウザのlocalStorageに保存されます。
                サーバーには送信されません。
              </li>
            </ul>
          </section>

          <section>
            <h2>収集しない情報</h2>
            <ul>
              <li>氏名・住所・電話番号等の個人情報</li>
              <li>メールアドレス</li>
              <li>IPアドレス（ログとして保存しません）</li>
              <li>Cookie（年齢確認はlocalStorageを使用しています）</li>
            </ul>
          </section>

          <section>
            <h2>第三者サービスの利用</h2>
            <p>本サービスは以下の第三者サービスを利用しています。</p>
            <ul>
              <li>
                <strong>FANZA Affiliate API（DMM）</strong>:
                ファイル名の変換に使用します。
                入力されたファイル名（品番）がAPIリクエストに含まれます。
                <a href="https://terms.dmm.com/affiliate_service/" target="_blank" rel="noreferrer">
                  DMMの利用規約
                </a>
              </li>
              <li>
                <strong>Vercel</strong>:
                本サービスのホスティングに使用しています。
                <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noreferrer">
                  Vercelのプライバシーポリシー
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2>情報の保存期間</h2>
            <p>
              入力されたファイル名はサーバー上に保存されません。
              年齢確認の状態はブラウザを閉じても保持されますが、
              ブラウザのキャッシュ・データをクリアすることで削除できます。
            </p>
          </section>

          <section>
            <h2>本ポリシーの変更</h2>
            <p>
              本ポリシーは予告なく変更することがあります。
              変更後の内容はこのページに掲載します。
            </p>
          </section>
        </div>
      </div>
    </>
  )
}
