import { articles, type Article } from '@/app/dashboard/resources/content'
import { businessTypes } from '@/app/dashboard/applications/new/constants'
import { priceForType, type DbBusinessType } from '@/app/dashboard/applications/new/pricing'
import { getBusinessTypes } from '@/lib/actions'
import { siteUrl } from '@/lib/metadata'
import { SUPPORT_EMAIL } from '@/lib/structured-data'

// /llms.txt and /llms-full.txt: a plain summary of GrayDocket for AI assistants and answer
// engines (https://llmstxt.org). Prices come from the same source as checkout, so they match.

const PAGES = {
  start: [
    { path: '/find-your-business-type', title: 'Find your business type', text: 'A short quiz that recommends a business type, lists what you need, checks your name with the ORC and shows the price.' },
    { path: '/name-ideas', title: 'Business name ideas', text: 'Free name finder: suggests names by trade and style, checks each against the ORC register and for a free web address.' },
    { path: '/pricing', title: 'Pricing', text: 'Prices for each business type, what is included, extras and compliance services.' },
    { path: '/track', title: 'Track an application', text: 'Check the status of a registration with its tracking ID.' },
  ],
  types: [
    { path: '/services/sole-proprietorship', title: 'Sole proprietorship registration', text: 'Fast, official business name registration in Ghana with the ORC (Form A).' },
    { path: '/services/limited-company', title: 'Company limited by shares (Ltd)', text: 'Private company under the Companies Act, 2019 (Act 992), filed with ORC Form 3.' },
    { path: '/services/company-guarantee', title: 'Company limited by guarantee (NGO, foundation)', text: 'Non-profit organisations, NGOs and charities, with no share capital.' },
    { path: '/services/partnership', title: 'Partnership', text: 'About partnerships under the Incorporated Private Partnerships Act (Act 152).' },
    { path: '/services/subsidiary', title: 'External company (branch office)', text: 'About registering a foreign company’s branch in Ghana.' },
  ],
  after: [
    { path: '/compliance/annual-returns', title: 'Annual returns', text: 'Yearly return companies file with the ORC to stay in good standing.' },
    { path: '/compliance/renewal', title: 'Business name renewal', text: 'Yearly renewal for sole proprietorships and partnerships.' },
    { path: '/compliance/tin', title: 'TIN', text: 'Tax Identification Numbers for individuals and businesses, linked to the Ghana Card.' },
    { path: '/compliance/gra', title: 'GRA tax activation', text: 'Connecting a business to the Ghana Revenue Authority.' },
    { path: '/compliance/ssnit', title: 'SSNIT employer registration', text: 'Registering as an employer for social security.' },
    { path: '/banking', title: 'Business banking', text: 'Opening a business bank account alongside registration.' },
  ],
  more: [
    { path: '/resources', title: 'Resources', text: 'Videos and guides on registering and running a business in Ghana.' },
    { path: '/support', title: 'Help and support', text: 'Contact the team and find answers.' },
    { path: '/security', title: 'Security', text: 'How accounts, records and payments are protected.' },
    { path: '/affiliate', title: 'Affiliate programme', text: 'Earn commission by referring people who register.' },
    { path: '/terms', title: 'Terms of service', text: '' },
    { path: '/privacy', title: 'Privacy policy', text: '' },
  ],
}

const link = (p: { path: string; title: string; text: string }) => `- [${p.title}](${siteUrl}${p.path})${p.text ? `: ${p.text}` : ''}`
const cedis = (n: number) => `GH₵ ${n.toLocaleString('en-GH', { maximumFractionDigits: 2 })}`

async function priceLines() {
  try {
    const dbTypes = (await getBusinessTypes()) as DbBusinessType[]
    return businessTypes.map((t) => {
      const p = priceForType(t.id, dbTypes)
      const parts = p.lines.map((l) => `${l.label} ${cedis(l.amount)}`).join(', ')
      return `- ${t.name} (${t.formRef}): ${cedis(p.total)} in total${parts ? ` (${parts})` : ''}${p.timeline ? `; usually ${p.timeline}` : ''}.`
    })
  } catch {
    return [`- See ${siteUrl}/pricing for current prices.`]
  }
}

async function summary() {
  return [
    '# GrayDocket',
    '',
    '> GrayDocket registers businesses in Ghana online. It prepares and files registrations with the Office of the Registrar of Companies (ORC), searches business names against the ORC register, and helps businesses stay compliant afterwards (annual returns, renewals, tax and SSNIT). Customers apply online, review everything, then pay; progress shows in their dashboard.',
    '',
    'Key facts:',
    '- Serves Ghana. Business types registered online: sole proprietorship (ORC Form A), company limited by shares (Form 3) and company limited by guarantee (Form 3).',
    '- Prices include government (ORC) fees and the first year’s renewal or annual return. Customers pay at the end, after reviewing, through Paystack.',
    ...(await priceLines()),
    '- Free tools: a business type quiz and a business name finder with live ORC name checks.',
    `- Contact: ${SUPPORT_EMAIL}`,
    '- GrayDocket is a registration service and does not give legal advice. The ORC makes the final decision on every application and name.',
    '',
    '## Start here',
    ...PAGES.start.map(link),
    '',
    '## Business types',
    ...PAGES.types.map(link),
    '',
    '## After registration',
    ...PAGES.after.map(link),
    '',
    '## Guides',
    ...articles.map((a) => link({ path: `/guides/${a.slug}`, title: a.title, text: a.summary })),
    '',
    '## Optional',
    ...PAGES.more.map(link),
    `- [Full text of all guides](${siteUrl}/llms-full.txt)`,
  ].join('\n')
}

function articleText(a: Article) {
  const body = a.body.map((b) => {
    if (b.type === 'h2') return `### ${b.text}`
    if (b.type === 'ul') return b.items.map((i) => `- ${i}`).join('\n')
    if (b.type === 'note') return `> ${b.text}`
    return b.text
  })
  return [`## ${a.title}`, '', `Source: ${siteUrl}/guides/${a.slug}`, '', a.summary, '', ...body.flatMap((t) => [t, ''])].join('\n')
}

export async function llmsTxt() {
  return `${await summary()}\n`
}

export async function llmsFullTxt() {
  return `${await summary()}\n\n---\n\n# Guides\n\n${articles.map(articleText).join('\n---\n\n')}`
}

export const textResponse = (body: string) =>
  new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } })
