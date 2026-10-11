import type { Metadata } from 'next'

const configuredUrl = new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://graydocket.com')
export const siteUrl = ['localhost', '127.0.0.1', '[::1]'].includes(configuredUrl.hostname)
  ? 'https://graydocket.com'
  : configuredUrl.origin
export const siteTitle = 'Business Registration in Ghana | GrayDocket'
export const siteDescription = 'Register your business in Ghana with GrayDocket. We handle ORC registration, business name searches, annual returns, and compliance paperwork.'

export function pageMetadata(title: string, description: string, path: string): Metadata {
  const socialTitle = path === '/' ? siteTitle : `${title} | GrayDocket`
  return {
    title: { absolute: socialTitle },
    description,
    alternates: { canonical: path },
    openGraph: {
      title: socialTitle,
      description,
      url: path,
      siteName: 'GrayDocket',
      locale: 'en_GH',
      type: 'website',
      images: [{ url: '/opengraph-image.png?v=3', width: 1200, height: 630, alt: "GrayDocket: Start your business. We'll handle the paperwork. Colourful hero doodles surround the message." }],
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      description,
      images: ['/twitter-image.png?v=3'],
    },
  }
}
