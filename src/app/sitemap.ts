import type { MetadataRoute } from 'next'
import { articles } from '@/app/dashboard/resources/content'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://graydocket.com'
  const currentDate = new Date().toISOString()

  const staticRoutes = [
    '',
    '/pricing',
    '/find-your-business-type',
    '/resources',
    '/support',
    '/security',
    '/banking',
    '/track',
    '/services/limited-company',
    '/services/sole-proprietorship',
    '/services/company-guarantee',
    '/services/partnership',
    '/services/subsidiary',
    '/compliance/annual-returns',
    '/compliance/renewal',
    '/compliance/gra',
    '/compliance/ssnit',
    '/compliance/tin',
    '/terms',
    '/privacy',
    '/cookies',
    '/dpc',
    '/affiliate',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: currentDate,
    changeFrequency: (route === '' ? 'daily' : 'monthly') as MetadataRoute.Sitemap[number]['changeFrequency'],
    priority: route === '' ? 1.0 : route === '/pricing' ? 0.9 : 0.8,
  }))

  const guideRoutes = articles.map((article) => ({
    url: `${baseUrl}/guides/${article.slug}`,
    lastModified: currentDate,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  return [...staticRoutes, ...guideRoutes]
}
