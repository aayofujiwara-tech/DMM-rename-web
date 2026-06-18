import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="ja">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500&display=swap"
          rel="stylesheet"
        />
        {/* OGP */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="DMM Renamer" />
        <meta property="og:title" content="DMM Renamer - DMMファイルを自動でリネーム" />
        <meta property="og:description" content="DMMでダウンロードした.dcvファイルを女優名・タイトルで自動リネーム。貼り付けるだけ、無料、登録不要。" />
        <meta property="og:url" content="https://dmm-rename-web.vercel.app" />
        <meta property="og:image" content="https://dmm-rename-web.vercel.app/ogp.svg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:locale" content="ja_JP" />
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="DMM Renamer - DMMファイルを自動でリネーム" />
        <meta name="twitter:description" content="DMMでダウンロードした.dcvファイルを女優名・タイトルで自動リネーム。貼り付けるだけ、無料、登録不要。" />
        <meta name="twitter:image" content="https://dmm-rename-web.vercel.app/ogp.svg" />
        {/* description */}
        <meta name="description" content="DMMでダウンロードした.dcvファイルを女優名・タイトルで自動リネーム。貼り付けるだけ、無料、登録不要。" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
