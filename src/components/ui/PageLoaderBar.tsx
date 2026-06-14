'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export default function PageLoaderBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  // Clear states when pathname/searchParams update (navigation finished)
  useEffect(() => {
    setLoading(false)
    setProgress(100)
  }, [pathname, searchParams])

  // Reset to 0 after complete
  useEffect(() => {
    if (progress === 100) {
      const timer = setTimeout(() => {
        setProgress(0)
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [progress])

  // Watch global click events to intercept relative links
  useEffect(() => {
    const handleAnchorClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const anchor = target.closest('a')

      if (anchor) {
        const href = anchor.getAttribute('href')
        const targetAttr = anchor.getAttribute('target')

        // Intercept relative internal routes to start progress indicator immediately
        if (
          href &&
          href.startsWith('/') &&
          !href.startsWith('/api') &&
          targetAttr !== '_blank' &&
          href !== pathname
        ) {
          setLoading(true)
          setProgress(15)
        }
      }
    }

    document.addEventListener('click', handleAnchorClick)
    return () => {
      document.removeEventListener('click', handleAnchorClick)
    }
  }, [pathname])

  // Incrementally advance progress slowly up to 90% while waiting
  useEffect(() => {
    if (!loading) return

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(timer)
          return 90
        }
        return prev + 5
      })
    }, 180)

    return () => clearInterval(timer)
  }, [loading])

  if (progress === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '3px',
        backgroundColor: 'var(--color-primary-600, #303030)',
        width: `${progress}%`,
        zIndex: 999999,
        transition: 'width 0.25s ease-out, opacity 0.25s ease-in-out',
        opacity: progress === 100 ? 0 : 1,
        boxShadow: '0 0 12px 1px rgba(48, 48, 48, 0.4)',
        pointerEvents: 'none',
      }}
    />
  )
}
