// Knowledge base content for /dashboard/resources.
// Videos: set `src` to a file under /public (e.g. "/videos/business-types.mp4") or a full URL to publish one.

export type ResourceVideo = {
  id: string
  title: string
  duration: string
  src?: string
  poster?: string
}

export type ResourceAudio = {
  id: string
  title: string
  duration: string
  /** Path under /public (e.g. "/audio/business-types.mp3") or a full URL. Leave unset to show a placeholder. */
  src?: string
}

export type ArticleBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'note'; text: string }

export type Article = {
  slug: string
  title: string
  summary: string
  category: 'Getting started' | 'Business types' | 'After registration'
  readMinutes: number
  body: ArticleBlock[]
}

export const videos: ResourceVideo[] = [
  { id: 'business-types', title: 'Which business type is right for you?', duration: '1:10' },
  { id: 'how-it-works', title: 'How registration works on GrayDocket', duration: '0:50' },
  { id: 'name-search', title: 'Choosing a name that gets approved', duration: '0:45' },
  { id: 'annual-returns', title: 'Annual returns in under a minute', duration: '0:55' },
]

// Short audio explainers. Ids for business types match new/constants.ts so the quiz can pick the right one.
export const audios: ResourceAudio[] = [
  { id: 'business-types', title: 'Business types in Ghana, explained', duration: '2:00' },
  { id: 'sole_proprietorship', title: 'What a sole proprietorship means for you', duration: '1:30' },
  { id: 'limited_by_shares', title: 'What a limited company means for you', duration: '1:45' },
  { id: 'limited_by_guarantee', title: 'Registering a non-profit, explained', duration: '1:30' },
]

export const articles: Article[] = [
  {
    slug: 'choosing-a-business-type',
    title: 'Choosing a business type in Ghana',
    summary: 'Sole proprietorship, limited company or company limited by guarantee: what each one means for you.',
    category: 'Getting started',
    readMinutes: 4,
    body: [
      { type: 'p', text: 'The structure you register determines who owns the business, who is responsible for its debts, and what you need to file each year. Most founders choose one of three structures.' },
      { type: 'h2', text: 'Sole proprietorship' },
      { type: 'p', text: 'You trade under a registered business name, but legally you and the business are the same. It is the quickest and simplest option, and a good fit if you are starting on your own and want to begin trading fast.' },
      { type: 'ul', items: ['One owner', 'Registered with ORC Form A', 'Your personal assets are not separate from the business', 'Renewed every year'] },
      { type: 'h2', text: 'Company limited by shares' },
      { type: 'p', text: 'A separate legal entity owned by its shareholders. Your personal assets are protected from the company’s debts, and you can bring in co-founders or investors by issuing shares.' },
      { type: 'ul', items: ['At least two directors, one of whom lives in Ghana', 'At least one shareholder', 'A company secretary and an auditor', 'Registered with ORC Form 3 and files annual returns'] },
      { type: 'h2', text: 'Company limited by guarantee' },
      { type: 'p', text: 'The structure for non-profits such as NGOs, charities, associations and foundations. There is no share capital; members instead guarantee a set amount towards the company’s debts if it is wound up.' },
      { type: 'h2', text: 'Quick rule of thumb' },
      { type: 'ul', items: ['Going it alone and want to start simple: sole proprietorship', 'Want limited liability, co-founders or investors: company limited by shares', 'Not-for-profit: company limited by guarantee'] },
      { type: 'note', text: 'This guide is general information, not legal advice. If your situation is unusual, request a call and we will help you decide.' },
    ],
  },
  {
    slug: 'checking-a-business-name',
    title: 'Checking and choosing a business name',
    summary: 'How the name search works and how to pick a name that is less likely to be rejected.',
    category: 'Getting started',
    readMinutes: 3,
    body: [
      { type: 'p', text: 'Every registration starts with a name. The Office of the Registrar of Companies (ORC) will reject a name that is identical or too similar to one already registered, so it pays to check first.' },
      { type: 'h2', text: 'How the GrayDocket name check works' },
      { type: 'p', text: 'As you type a proposed name in the registration form, we search the ORC register and flag exact matches and look-alikes. A clear result means no conflicts were found, but the ORC makes the final decision when it reviews your application.' },
      { type: 'h2', text: 'Tips for a name that gets approved' },
      { type: 'ul', items: ['Make it distinctive rather than generic', 'Avoid names that copy or closely resemble well-known brands', 'Private limited companies must end with “Limited” or “LTD”', 'Add an alternative name in case your first choice is taken'] },
    ],
  },
  {
    slug: 'sole-proprietorship-checklist',
    title: 'Sole proprietorship: what you need',
    summary: 'The details and documents to have ready before you register a business name.',
    category: 'Business types',
    readMinutes: 3,
    body: [
      { type: 'p', text: 'Registering a sole proprietorship usually takes 2–3 working days once your application is submitted. Having these ready makes the form quick to complete.' },
      { type: 'h2', text: 'About you' },
      { type: 'ul', items: ['Your full name, date of birth, nationality and occupation', 'Your Ghana Card number and clear photos of the card', 'Your TIN', 'Your residential address, phone number and email'] },
      { type: 'h2', text: 'About the business' },
      { type: 'ul', items: ['Your proposed business name and a backup', 'Your business sector and a short description of what you do', 'The date you started or will start trading', 'Your principal place of business, including its digital address (from the Ghana Post GPS app)'] },
      { type: 'note', text: 'Tip: you can scan your Ghana Card in the registration form to fill in your personal details automatically.' },
    ],
  },
  {
    slug: 'limited-company-checklist',
    title: 'Company limited by shares: what you need',
    summary: 'Directors, secretary, shareholders, auditor and the other details Form 3 asks for.',
    category: 'Business types',
    readMinutes: 4,
    body: [
      { type: 'p', text: 'Incorporating a company limited by shares usually takes 5–10 working days once submitted. Under the Companies Act, 2019 (Act 992), the company needs a few people in specific roles.' },
      { type: 'h2', text: 'People' },
      { type: 'ul', items: ['At least two directors, at least one resident in Ghana, each with a Ghana Card and TIN', 'A company secretary', 'At least one shareholder, individual or corporate, with their number of shares', 'A licensed auditor and their ICAG licence number', 'The beneficial owner(s), meaning the people who ultimately own or control the company'] },
      { type: 'h2', text: 'Company details' },
      { type: 'ul', items: ['Proposed name ending in “Limited” or “LTD”', 'The company’s objects (what it will do)', 'Registered office address and digital address', 'Stated capital, plus authorised and issued shares', 'Whether you will adopt the standard constitution or your own'] },
      { type: 'note', text: 'Most companies adopt the standard constitution. A custom constitution needs separate drafting.' },
    ],
  },
  {
    slug: 'company-limited-by-guarantee',
    title: 'Registering a non-profit (company limited by guarantee)',
    summary: 'What NGOs, charities and associations need to know before registering.',
    category: 'Business types',
    readMinutes: 3,
    body: [
      { type: 'p', text: 'A company limited by guarantee is the usual structure for organisations that do not distribute profits. Registration usually takes 10–15 working days once submitted.' },
      { type: 'h2', text: 'What is different from a limited company' },
      { type: 'ul', items: ['No share capital and no shareholders', 'Members act as guarantors instead', 'Profits go back into the organisation’s purpose'] },
      { type: 'h2', text: 'What you will need' },
      { type: 'ul', items: ['Directors and a company secretary, with Ghana Cards and TINs', 'Details of the guarantors', 'A clear description of the organisation’s objects', 'A registered office address'] },
    ],
  },
  {
    slug: 'staying-compliant',
    title: 'Staying compliant after you register',
    summary: 'Annual returns, renewals, tax and SSNIT: the obligations that come after your certificate.',
    category: 'After registration',
    readMinutes: 4,
    body: [
      { type: 'p', text: 'Registration is the start, not the finish. Keeping up with a few recurring obligations keeps your business in good standing and avoids penalties.' },
      { type: 'h2', text: 'Annual returns (companies)' },
      { type: 'p', text: 'Every company files an annual return with the ORC confirming its directors, shareholders and other details.' },
      { type: 'h2', text: 'Business name renewal (sole proprietorships and partnerships)' },
      { type: 'p', text: 'Registered business names are renewed each year to keep trading under the name.' },
      { type: 'h2', text: 'Tax' },
      { type: 'p', text: 'Your business needs a TIN and an active profile with the Ghana Revenue Authority (GRA) so it can file and pay taxes.' },
      { type: 'h2', text: 'SSNIT' },
      { type: 'p', text: 'If you employ staff, you must register as an employer with SSNIT and pay monthly contributions.' },
      { type: 'note', text: 'GrayDocket tracks these deadlines for the businesses in your account and reminds you before anything is due.' },
    ],
  },
]

export function getArticle(slug: string) {
  return articles.find((a) => a.slug === slug)
}
