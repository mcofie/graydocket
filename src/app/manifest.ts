import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GrayDocket: Business Registration in Ghana',
    short_name: 'GrayDocket',
    description: 'Start your business in Ghana. GrayDocket handles ORC registration, name searches and annual returns, so you can focus on running it.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    // Matches the white site so the launch screen doesn't flash dark
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      { src: '/favicon.ico', sizes: '16x16 32x32 48x48', type: 'image/x-icon' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // Full-bleed version with the mark inside the safe zone, for Android's adaptive icon shapes
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
