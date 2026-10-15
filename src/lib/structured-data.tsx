import { siteDescription, siteUrl } from '@/lib/metadata'

// Structured data (schema.org JSON-LD) that tells search engines and AI assistants what a page is
// about: who we are, what we sell and for how much, and answers to common questions.

type Json = Record<string, unknown>

export const SUPPORT_EMAIL = 'support@graydocket.com'
const ORG_ID = `${siteUrl}/#organization`
const abs = (path: string) => (path.startsWith('http') ? path : `${siteUrl}${path === '/' ? '' : path}`)

/** Renders JSON-LD safely: "<" is escaped so content can never close the script tag */
export function JsonLd({ data }: { data: Json | Json[] }) {
  const graph = Array.isArray(data) ? { '@context': 'https://schema.org', '@graph': data } : { '@context': 'https://schema.org', ...data }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, '\\u003c') }} />
}

export const organizationLd = (): Json => ({
  '@type': 'ProfessionalService',
  '@id': ORG_ID,
  name: 'GrayDocket',
  url: siteUrl,
  logo: `${siteUrl}/icon-512.png`,
  image: `${siteUrl}/opengraph-image.png`,
  description: siteDescription,
  email: SUPPORT_EMAIL,
  areaServed: { '@type': 'Country', name: 'Ghana' },
  knowsAbout: [
    'Business registration in Ghana',
    'Office of the Registrar of Companies (ORC)',
    'Sole proprietorship registration',
    'Company limited by shares',
    'Company limited by guarantee',
    'Business name search',
    'Annual returns',
  ],
  contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', email: SUPPORT_EMAIL, areaServed: 'GH', availableLanguage: ['English'] },
})

export const websiteLd = (): Json => ({
  '@type': 'WebSite',
  '@id': `${siteUrl}/#website`,
  name: 'GrayDocket',
  url: siteUrl,
  inLanguage: 'en-GH',
  publisher: { '@id': ORG_ID },
})

export const faqLd = (faqs: Array<{ q: string; a: string }>): Json => ({
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
})

export const breadcrumbLd = (items: Array<{ name: string; path: string }>): Json => ({
  '@type': 'BreadcrumbList',
  itemListElement: [{ name: 'Home', path: '/' }, ...items].map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, item: abs(item.path) })),
})

/** A registration service we offer; with a price when we have one */
export const serviceLd = (s: { name: string; description: string; path: string; price?: number; timeline?: string }): Json => ({
  '@type': 'Service',
  name: s.name,
  description: s.description,
  url: abs(s.path),
  serviceType: 'Business registration',
  provider: { '@id': ORG_ID },
  areaServed: { '@type': 'Country', name: 'Ghana' },
  ...(s.price
    ? {
        offers: {
          '@type': 'Offer',
          price: s.price.toFixed(2),
          priceCurrency: 'GHS',
          availability: 'https://schema.org/InStock',
          url: abs('/pricing'),
          description: `Includes government (ORC) fees${s.timeline ? `. Usually ${s.timeline}` : ''}.`,
        },
      }
    : {}),
})

export const articleLd = (a: { title: string; summary: string; path: string }): Json => ({
  '@type': 'Article',
  headline: a.title,
  description: a.summary,
  url: abs(a.path),
  mainEntityOfPage: abs(a.path),
  inLanguage: 'en-GH',
  author: { '@id': ORG_ID },
  publisher: { '@id': ORG_ID },
  image: `${siteUrl}/opengraph-image.png`,
})

export const webAppLd = (a: { name: string; description: string; path: string }): Json => ({
  '@type': 'WebApplication',
  name: a.name,
  description: a.description,
  url: abs(a.path),
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Any',
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'GHS' },
  provider: { '@id': ORG_ID },
})
