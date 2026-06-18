import Head from 'next/head'
import Link from 'next/link'

export default function Terms() {
  return (
    <>
      <Head>
        <title>利用規約 - DMM Renamer</title>
      </Head>
      <div className="legal-page">
        <div className="legal-inner">
          <Link href="/" className="legal-back">← トップに戻る</Link>
          <h1>利用規約</h1>
          <p className="legal-updated">最終更新日: 2026年6月1日</p>

          <section>
            <h2>第1条（利用資格）</h2>
            <p>
              本サービスは18歳以上の方のみご利用いただけます。
              18歳未満の方の利用は固くお断りします。
            </p>
          </section>

          <section>
            <h2>第2条（サービスの概要）</h2>
            <p>
              DMM Renamer（以下「本サービス」）は、DMMからダウンロードした
              動画ファイルのファイル名を整理するためのツールです。
              本サービスはFANZA Affiliate APIを利用して情報を取得しています。
            </p>
          </section>

          <section>
            <h2>第3条（禁止事項）</h2>
            <p>以下の行為を禁止します。</p>
            <ul>
              <li>本サービスを違法な目的で使用すること</li>
              <li>本サービスに過度な負荷をかける行為</li>
              <li>本サービスのシステムを不正に操作する行為</li>
              <li>その他、運営者が不適切と判断する行為</li>
            </ul>
          </section>

          <section>
            <h2>第4条（免責事項）</h2>
            <p>
              本サービスは現状有姿で提供されます。
              サービスの正確性・完全性・有用性について、いかなる保証もいたしません。
              本サービスの利用によって生じた損害について、運営者は一切の責任を負いません。
            </p>
          </section>

          <section>
            <h2>第5条（サービスの変更・終了）</h2>
            <p>
              運営者は予告なく本サービスの内容を変更・終了することができます。
              これによってユーザーに生じた損害について、運営者は責任を負いません。
            </p>
          </section>

          <section>
            <h2>第6条（著作権）</h2>
            <p>
              本サービスで取得されるタイトル・女優名等の情報は
              FANZA（DMM）が保有するものです。
              これらの情報の無断転載・二次利用を禁止します。
            </p>
          </section>

          <section>
            <h2>第7条（準拠法）</h2>
            <p>
              本規約は日本法に準拠し、解釈されるものとします。
            </p>
          </section>
        </div>
      </div>
    </>
  )
}
