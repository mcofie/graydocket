'use client'

import { useEffect, useRef } from 'react'

// Cloudflare Turnstile. Most people pass without seeing anything; a checkbox shows only when
// Cloudflare isn't sure.

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string
  remove: (id: string) => void
}

let scriptLoad: Promise<void> | null = null
function loadScript() {
  scriptLoad ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      scriptLoad = null
      reject(new Error('Turnstile failed to load'))
    }
    document.head.appendChild(script)
  })
  return scriptLoad
}

export default function Turnstile({ siteKey, onToken }: { siteKey: string; onToken: (token: string) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const callback = useRef(onToken)
  useEffect(() => {
    callback.current = onToken
  }, [onToken])

  useEffect(() => {
    let id: string | undefined
    let live = true
    loadScript()
      .then(() => {
        const api = (window as unknown as { turnstile?: TurnstileApi }).turnstile
        if (!live || !box.current || !api) return
        id = api.render(box.current, { sitekey: siteKey, appearance: 'interaction-only', callback: (token: string) => callback.current(token) })
      })
      .catch(() => {})
    return () => {
      live = false
      if (id) (window as unknown as { turnstile?: TurnstileApi }).turnstile?.remove(id)
    }
  }, [siteKey])

  return <div ref={box} />
}
