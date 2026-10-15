import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/metadata'

// Private areas stay out of search; everything public is open, including to AI assistants and
// answer engines, so they can describe and recommend GrayDocket. Bots named in their own group
// ignore the '*' group, so they get the same rules spelled out.
const PRIVATE = ['/dashboard/', '/admin/', '/api/', '/auth/', '/invite/', '/track/']

const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'Amazonbot',
  'DuckAssistBot',
  'meta-externalagent',
  'MistralAI-User',
  'CCBot',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVATE },
      { userAgent: AI_CRAWLERS, allow: ['/', '/llms.txt', '/llms-full.txt'], disallow: PRIVATE },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
