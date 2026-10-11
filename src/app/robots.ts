import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/metadata'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = siteUrl
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/admin/', '/api/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
