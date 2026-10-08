'use client'

import { useEffect, useRef } from 'react'

interface RevealProps {
  className?: string
  children: React.ReactNode
  /** How much of the element must be visible before it plays (0–1) */
  threshold?: number
}

/**
 * Marks its wrapper with data-reveal="in" the first time it scrolls into view, so CSS can play
 * entrance animations once. Styles should key off [data-reveal='in'].
 */
export default function Reveal({ className, children, threshold = 0.2 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Set on the DOM directly: React never re-renders this attribute, and no extra render is needed
    const reveal = () => {
      el.dataset.reveal = 'in'
    }
    if (typeof IntersectionObserver === 'undefined') {
      reveal()
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          reveal()
          observer.disconnect()
        }
      },
      { threshold }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return (
    <div ref={ref} className={className} data-reveal="pending">
      {children}
    </div>
  )
}
