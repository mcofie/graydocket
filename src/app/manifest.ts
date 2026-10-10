import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GrayDocket — Business Registration in Ghana',
    short_name: 'GrayDocket',
    description: 'Start your business in Ghana with GrayDocket. We handle ORC registration, corporate banking, and compliance paperwork.',
    start_url: '/',
    display: 'standalone',
    background_color: '#090d14',
    theme_color: '#ffffff',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
