import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function AgeCheck() {
  const router = useRouter()

  useEffect(() => {
    if (localStorage.getItem('age_verified') === 'true') {
      router.replace('/')
    }
  }, [])

  const handleAgree = () => {
    localStorage.setItem('age_verified', 'true')
    router.replace('/')
  }

  const handleDisagree = () => {
    window.location.href = 'https://www.google.com'
  }

  return (
    <>
      <Head>
        <title>年齢確認 - DMM Renamer</title>
      </Head>
      <div className="age-check-page">
        <div className="age-check-box">
          <div className="age-check-icon">🔞</div>
          <h1 className="age-check-title">年齢確認</h1>
          <p className="age-check-desc">
            このサイトはアダルトコンテンツを含むサービス（FANZA）に
            関連するツールを提供しています。<br /><br />
            <strong>18歳未満の方の利用はお断りしています。</strong><br /><br />
            あなたは18歳以上ですか？
          </p>
          <div className="age-check-buttons">
            <button className="btn-agree" onClick={handleAgree}>
              はい、18歳以上です
            </button>
            <button className="btn-disagree" onClick={handleDisagree}>
              いいえ、18歳未満です
            </button>
          </div>
          <p className="age-check-note">
            「はい」を選択することで、
            <a href="/terms">利用規約</a>および
            <a href="/privacy">プライバシーポリシー</a>
            に同意したものとみなします。
          </p>
        </div>
      </div>
    </>
  )
}
