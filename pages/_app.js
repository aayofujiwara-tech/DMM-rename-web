import { useEffect } from 'react'
import { useRouter } from 'next/router'
import '../styles/globals.css'

export default function App({ Component, pageProps }) {
  const router = useRouter()

  useEffect(() => {
    const excludePaths = ['/age-check', '/terms', '/privacy']
    if (excludePaths.includes(router.pathname)) return

    if (localStorage.getItem('age_verified') !== 'true') {
      router.replace('/age-check')
    }
  }, [router.pathname])

  return <Component {...pageProps} />
}
