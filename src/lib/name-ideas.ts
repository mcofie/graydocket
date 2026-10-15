// Business name ideas from templates. The page talks to /api/name-ideas only, so this can later be
// swapped for an AI generator (Anthropic API) without touching the page: keep the same input/output.

export type Industry =
  | 'food' | 'fashion' | 'beauty' | 'tech' | 'logistics' | 'construction' | 'agriculture' | 'retail'
  | 'education' | 'health' | 'events' | 'creative' | 'consulting' | 'cleaning' | 'realestate' | 'nonprofit'
export type Vibe = 'modern' | 'local' | 'premium' | 'playful'
export type NameKind = 'sole' | 'company' | 'nonprofit'

export type NameIdea = {
  name: string
  /** Meaning of a local word in the name, e.g. "Nkabom: unity (Twi)" */
  meaning?: string
  /** One short line on why the name works (AI only) */
  why?: string
  /** Which pattern made it, so "more like this" can lean on it */
  style: string
}

export type NameIdeasInput = {
  industry: Industry
  vibe: Vibe
  kind: NameKind
  /** Optional word to include: a family name, place or anything personal */
  word?: string
  /** What the business does, in the owner's words (AI only) */
  about?: string
  /** Names already shown, so a new batch doesn't repeat them */
  exclude?: string[]
  /** A liked name to lean towards ("more like this") */
  like?: NameIdea | null
  count?: number
  seed?: number
}

export const INDUSTRIES: Array<{ id: Industry; label: string }> = [
  { id: 'food', label: 'Food & catering' },
  { id: 'fashion', label: 'Fashion & tailoring' },
  { id: 'beauty', label: 'Beauty & salon' },
  { id: 'tech', label: 'Tech & software' },
  { id: 'logistics', label: 'Delivery & logistics' },
  { id: 'construction', label: 'Building & construction' },
  { id: 'agriculture', label: 'Farming & agribusiness' },
  { id: 'retail', label: 'Shop & retail' },
  { id: 'education', label: 'Education & training' },
  { id: 'health', label: 'Health & wellness' },
  { id: 'events', label: 'Events & entertainment' },
  { id: 'creative', label: 'Design & media' },
  { id: 'consulting', label: 'Consulting & services' },
  { id: 'cleaning', label: 'Cleaning & facilities' },
  { id: 'realestate', label: 'Property & real estate' },
  { id: 'nonprofit', label: 'Charity & community' },
]

export const KIND_LABELS: Record<NameKind, string> = { sole: 'Sole proprietorship', company: 'Company', nonprofit: 'Non-profit' }

export const VIBES: Array<{ id: Vibe; label: string; hint: string }> = [
  { id: 'modern', label: 'Modern', hint: 'Short and fresh' },
  { id: 'local', label: 'Rooted in Ghana', hint: 'Twi words with meaning' },
  { id: 'premium', label: 'Premium', hint: 'Polished and classy' },
  { id: 'playful', label: 'Playful', hint: 'Fun and catchy' },
]

// Words for each trade: nouns that read well in a name
const TRADE: Record<Industry, string[]> = {
  food: ['Kitchen', 'Bites', 'Table', 'Pot', 'Feast', 'Grill', 'Spice', 'Plate', 'Pantry', 'Bakehouse', 'Chop Bar', 'Eats'],
  fashion: ['Threads', 'Stitch', 'Wear', 'Atelier', 'Loom', 'Couture', 'Tailors', 'Fabrics', 'Studio', 'Closet'],
  beauty: ['Glow', 'Beauty', 'Salon', 'Braids', 'Skin', 'Lounge', 'Studio', 'Nails', 'Spa', 'Locks'],
  tech: ['Labs', 'Digital', 'Systems', 'Tech', 'Works', 'Cloud', 'Code', 'Apps', 'Data', 'Logic'],
  logistics: ['Logistics', 'Express', 'Movers', 'Couriers', 'Freight', 'Dispatch', 'Haulage', 'Runners', 'Delivery'],
  construction: ['Builders', 'Construction', 'Works', 'Structures', 'Projects', 'Contractors', 'Engineering', 'Build'],
  agriculture: ['Farms', 'Harvest', 'Agro', 'Fields', 'Growers', 'Produce', 'Acres', 'Seeds', 'Orchards'],
  retail: ['Mart', 'Store', 'Market', 'Supplies', 'Shop', 'Depot', 'Trading', 'Goods', 'Corner'],
  education: ['Academy', 'Learning', 'School', 'Tutors', 'Institute', 'Classroom', 'Scholars', 'Skills'],
  health: ['Health', 'Care', 'Wellness', 'Clinic', 'Pharmacy', 'Fitness', 'Therapy', 'Living'],
  events: ['Events', 'Occasions', 'Celebrations', 'Entertainment', 'Rentals', 'Decor', 'Experiences', 'Moments'],
  creative: ['Studio', 'Media', 'Creative', 'Design', 'Pictures', 'Collective', 'Productions', 'Prints'],
  consulting: ['Consulting', 'Partners', 'Advisory', 'Solutions', 'Associates', 'Services', 'Group', 'Insights'],
  cleaning: ['Cleaning', 'Facilities', 'Services', 'Hygiene', 'Care', 'Shine', 'Maintenance'],
  realestate: ['Properties', 'Homes', 'Realty', 'Estates', 'Living', 'Spaces', 'Residences', 'Developments'],
  nonprofit: ['Foundation', 'Initiative', 'Trust Fund', 'Network', 'Alliance', 'Project', 'Hope Centre', 'Outreach'],
}

// Twi words with meanings, for names rooted in Ghana
export const TWI: Array<{ word: string; meaning: string; fits?: Industry[] }> = [
  { word: 'Akwaaba', meaning: 'welcome' },
  { word: 'Sika', meaning: 'money, gold', fits: ['retail', 'consulting', 'realestate'] },
  { word: 'Nkabom', meaning: 'unity', fits: ['nonprofit', 'consulting', 'events'] },
  { word: 'Ayekoo', meaning: 'well done' },
  { word: 'Adom', meaning: 'grace' },
  { word: 'Nhyira', meaning: 'blessing' },
  { word: 'Anidaso', meaning: 'hope', fits: ['nonprofit', 'health', 'education'] },
  { word: 'Asomdwee', meaning: 'peace', fits: ['health', 'nonprofit'] },
  { word: 'Ahoofe', meaning: 'beauty', fits: ['beauty', 'fashion'] },
  { word: 'Aduane', meaning: 'food', fits: ['food', 'agriculture'] },
  { word: 'Nkoso', meaning: 'progress', fits: ['tech', 'construction', 'education', 'consulting'] },
  { word: 'Sankofa', meaning: 'go back and get it: learn from the past', fits: ['education', 'creative', 'fashion'] },
  { word: 'Adwuma', meaning: 'work', fits: ['construction', 'consulting', 'cleaning'] },
  { word: 'Mmofra', meaning: 'children', fits: ['education', 'nonprofit'] },
  { word: 'Nsuo', meaning: 'water', fits: ['cleaning', 'health', 'agriculture'] },
  { word: 'Kwan', meaning: 'the way, the road', fits: ['logistics', 'tech'] },
  { word: 'Ahenfie', meaning: 'palace', fits: ['realestate', 'events', 'food'] },
  { word: 'Asase', meaning: 'the earth, land', fits: ['agriculture', 'realestate', 'construction'] },
]

const MODERN_STEMS = ['Nova', 'Bloom', 'Bright', 'Swift', 'Peak', 'True', 'Vivid', 'Golden', 'Clear', 'Bold', 'Prime', 'Sun', 'Kora', 'Zuri', 'Neo']
const MODERN_SUFFIX = ['ly', 'io', 'ify', 'ora', 'ix']
const PREMIUM_LEAD = ['House of', 'Maison']
// Stems that make good made-up words ("Brightly", "Novaix" is avoided by the vowel rule)
const COIN_STEMS = ['Nova', 'Bloom', 'Bright', 'Swift', 'Vivid', 'Kora', 'Zuri', 'Peak', 'Clear']
const PREMIUM_TAIL = ['& Co', 'Collective', 'Signature', 'Atelier']
const PLAYFUL = ['Happy', 'Busy', 'Little', 'Jolly', 'Sweet', 'Merry', 'Lucky', 'Sunny', 'Chop Chop', 'Yummy']
const COLOURS = ['Gold', 'Ivory', 'Emerald', 'Amber', 'Cocoa', 'Indigo']

// Words the ORC won't accept without special approval or a licence
export const RESTRICTED = /\b(bank|banking|insurance|assurance|government|national|republic|ghana|state|municipal|council|university|chartered|holdings|trust|savings|loans|microfinance|federal|royal|presidential)\b/i

// A small seeded random generator, so a batch can be reproduced
function rng(seed: number) {
  let s = seed >>> 0 || 1
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

// Capitalise each word, but keep small joining words lower case ("House of Serwaa")
const SMALL = new Set(['of', 'by', 'and', 'the', 'de'])
const title = (w: string) =>
  w
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((part, i) => (i > 0 && SMALL.has(part.toLowerCase()) ? part.toLowerCase() : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(' ')
const coin = (stem: string, suffix: string) => {
  const base = stem.replace(/[aeiou]$/i, '')
  return base + suffix
}

/** Ending for the type of business; company names need "Limited" at the ORC */
export function withEnding(name: string, kind: NameKind) {
  if (kind === 'company' && !/\b(limited|ltd)\.?$/i.test(name)) return `${name} Limited`
  if (kind === 'nonprofit' && !/\b(foundation|initiative|lbg)$/i.test(name)) return `${name} LBG`
  return name
}

export function generateNames(input: NameIdeasInput): NameIdea[] {
  const count = Math.min(Math.max(input.count ?? 8, 1), 12)
  const rand = rng(input.seed ?? Date.now())
  const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)]
  const trade = TRADE[input.industry] ?? TRADE.consulting
  const word = input.word ? title(input.word.replace(/[^A-Za-z' -]/g, ' ')).slice(0, 24) : ''
  const twi = TWI.filter((t) => !t.fits || t.fits.includes(input.industry))

  // Each maker returns one idea in a given style
  const makers: Record<string, () => NameIdea | null> = {
    word_trade: () => (word ? { name: `${word} ${pick(trade)}`, style: 'word_trade' } : null),
    word_s: () => (word ? { name: `${word}’s ${pick(trade)}`, style: 'word_s' } : null),
    twi_trade: () => {
      const t = pick(twi)
      return { name: `${t.word} ${pick(trade)}`, meaning: `${t.word}: ${t.meaning} (Twi)`, style: 'twi_trade' }
    },
    twi_word: () => {
      if (!word) return null
      const t = pick(twi)
      return { name: `${t.word} by ${word}`, meaning: `${t.word}: ${t.meaning} (Twi)`, style: 'twi_word' }
    },
    modern_coined: () => ({ name: `${coin(pick(COIN_STEMS), pick(MODERN_SUFFIX))}`, style: 'modern_coined' }),
    modern_pair: () => ({ name: `${pick(MODERN_STEMS)} ${pick(trade)}`, style: 'modern_pair' }),
    modern_one: () => ({ name: `${pick(MODERN_STEMS)}${pick(trade).split(' ')[0]}`, style: 'modern_one' }),
    premium_lead: () => ({ name: `${pick(PREMIUM_LEAD)} ${word || pick([...MODERN_STEMS, ...COLOURS])}`, style: 'premium_lead' }),
    premium_tail: () => ({ name: `${word || pick(COLOURS)} ${pick(PREMIUM_TAIL)}`, style: 'premium_tail' }),
    premium_colour: () => ({ name: `${pick(COLOURS)} ${pick(trade)}`, style: 'premium_colour' }),
    playful_adj: () => ({ name: `${pick(PLAYFUL)} ${pick(trade)}`, style: 'playful_adj' }),
    playful_rhyme: () => {
      const t = pick(trade)
      const first = t[0]
      const allit = [...MODERN_STEMS, ...PLAYFUL, ...COLOURS].filter((w) => w[0] === first)
      return allit.length ? { name: `${pick(allit)} ${t}`, style: 'playful_rhyme' } : null
    },
  }

  // Which styles suit each vibe (with a little of the others for variety)
  const byVibe: Record<Vibe, string[]> = {
    modern: ['modern_coined', 'modern_pair', 'modern_one', 'modern_pair', 'word_trade', 'premium_colour'],
    local: ['twi_trade', 'twi_trade', 'twi_word', 'twi_trade', 'word_s', 'word_trade'],
    premium: ['premium_lead', 'premium_tail', 'premium_colour', 'word_trade', 'modern_pair'],
    playful: ['playful_adj', 'playful_rhyme', 'playful_adj', 'word_s', 'modern_pair', 'playful_rhyme'],
  }
  let styles = byVibe[input.vibe] ?? byVibe.modern
  // "More like this": mostly the liked style
  if (input.like?.style && makers[input.like.style]) styles = [input.like.style, input.like.style, input.like.style, ...styles]

  // "Bold Systems" and "BoldSystems" count as the same name
  // "Ama’s Table" and "Ama Table" count as the same name
  const squash = (n: string) => n.toLowerCase().replace(/['’]s\b/g, '').replace(/[^a-z0-9]/g, '')
  const seen = new Set((input.exclude ?? []).map(squash))
  // Variety: each opening word once per batch (except the person's own word)
  const leads = new Set<string>()
  const out: NameIdea[] = []
  // Two passes: the second relaxes the "different opening" rule so a batch is always full
  for (let attempt = 0; out.length < count && attempt < count * 50; attempt += 1) {
    const strict = attempt < count * 25
    const idea = makers[pick(styles)]?.()
    if (!idea) continue
    const name = title(idea.name)
    if (name.length < 3 || name.length > 40 || RESTRICTED.test(name)) continue
    const key = name.toLowerCase()
    if (seen.has(squash(name))) continue
    // No word twice in one name ("Chop Chop Chop Bar")
    const words = key.split(/[\s’']+/).filter((w) => w.length > 1)
    if (new Set(words).size !== words.length) continue
    // Variety: names starting the same way ("Nova Labs", "Novix", "NovaData") count as one lead,
    // except when they start with the person's own word
    const lead = squash(name).slice(0, 3)
    const ownWord = word && key.startsWith(word.toLowerCase())
    if (strict && !ownWord && leads.has(lead)) continue
    if (!ownWord) leads.add(lead)
    seen.add(squash(name))
    out.push({ ...idea, name })
  }
  return out
}
