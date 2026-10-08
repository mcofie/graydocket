'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import styles from './page-loader-bar.module.css'

// One accent per page load, rotating so consecutive loads never share a colour
const ACCENTS = ['var(--accent-blue)', 'var(--accent-green)', 'var(--accent-gold)', 'var(--accent-orange)']

// Never leave the bar on screen longer than this, even if a navigation fails or is cancelled
const SAFETY_TIMEOUT_MS = 10000

/** Should a click on this link start the loader? Only for in-app navigations to a different page. */
function startsNavigation(event: MouseEvent, anchor: HTMLAnchorElement) {
  // New tab/window, download or save-as: the current page doesn't change
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false
  if (anchor.target && anchor.target !== '_self') return false
  if (anchor.hasAttribute('download')) return false

  let url: URL
  try {
    url = new URL(anchor.href, window.location.href)
  } catch {
    return false
  }
  if (url.origin !== window.location.origin) return false
  if (url.pathname.startsWith('/api')) return false

  // Same page (or a #hash on it): the route won't change, so nothing would ever finish the bar
  return url.pathname !== window.location.pathname || url.search !== window.location.search
}

export default function PageLoaderBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const routeKey = `${pathname}?${searchParams.toString()}`

  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [accent, setAccent] = useState(0)
  const activeRef = useRef(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const finish = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    setLoading(false)
    setProgress(100)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setProgress(0), 400)
  }, [])

  // The route changed, so the navigation finished
  useEffect(() => {
    const frame = requestAnimationFrame(finish)
    return () => cancelAnimationFrame(frame)
  }, [routeKey, finish])

  // Start on clicks that will navigate to another page in the app
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest('a')
      if (!anchor || !startsNavigation(event, anchor)) return
      if (hideTimer.current) clearTimeout(hideTimer.current)
      if (!activeRef.current) setAccent((i) => (i + 1) % ACCENTS.length)
      activeRef.current = true
      setLoading(true)
      setProgress(15)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  // Creep towards 90% while waiting, and give up after the safety timeout
  useEffect(() => {
    if (!loading) return
    const creep = setInterval(() => {
      setProgress((prev) => (prev >= 90 ? 90 : prev + Math.max(1, (90 - prev) / 8)))
    }, 180)
    const safety = setTimeout(finish, SAFETY_TIMEOUT_MS)
    return () => {
      clearInterval(creep)
      clearTimeout(safety)
    }
  }, [loading, finish])

  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
  }, [])

  if (progress === 0) return null

  return (
    <div
      className={`${styles.bar} ${progress === 100 ? styles.done : ''}`}
      style={{ width: `${progress}%`, backgroundColor: ACCENTS[accent] }}
      aria-hidden="true"
    />
  )
}
