import { Analytics } from '@vercel/analytics/react'
import '../styles/globals.css'
import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function App({ Component, pageProps }) {
  const router = useRouter()

  useEffect(() => {
    const excludePaths = ['/age-check', '/terms', '/privacy']
    if (excludePaths.includes(router.pathname)) return
    if (localStorage.getItem('age_verified') !== 'true') {
      router.replace('/age-check')
    }
  }, [router.pathname])

  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  )
}
