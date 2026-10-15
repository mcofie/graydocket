import { after, type NextRequest } from 'next/server'
import { notify } from '@/lib/discord'
import { INDUSTRIES, KIND_LABELS, VIBES, generateNames, type NameIdea, type NameIdeasInput } from '@/lib/name-ideas'
import { aiEnabled, generateNamesWithAI } from '@/lib/name-ideas-ai'
import { issuePass, validPass, verifyTurnstile } from '@/lib/name-ideas-pass'
import { cacheGet, cacheSet, clientIp, hitCounter } from '@/lib/shared-limits'

// GET  /api/name-ideas                                                    -> { pass, turnstileSiteKey }
// POST /api/name-ideas  { industry, vibe, kind, word?, about?, exclude?, like?, turnstile? }
//                       header x-name-pass: <pass from GET>              -> { names } | { challenge: true }
// POST /api/name-ideas  { own: "Name they typed" }                       -> { ok: true }  (team notice only)
//
// Where names come from, fastest first:
//   1. a shared pool of Claude names for each trade, feel and business type (refilled daily),
//      used for plain batches with no word, description or "more like this"
//   2. Claude, live
//   3. templates, when Claude is off, over a limit, slow or short
//
// Limits are shared across instances (lib/shared-limits). Past the soft limit a visitor must pass
// Cloudflare Turnstile (when its keys are set) or quietly gets template names; past the hard
// limits they get template names. Set a spend limit on the Anthropic workspace as the real cap.

const BURST = { windowS: 60, max: 20 } // any request, per visitor
const SOFT_PER_HOUR = 30 // per visitor; above this, prove you're human to keep getting Claude
const AI_PER_HOUR = Number(process.env.NAME_IDEAS_AI_HOURLY) || 60 // per visitor
const AI_PER_DAY = Number(process.env.NAME_IDEAS_AI_DAILY) || 2000 // everyone
const POOL_SIZE = 24
const POOL_TTL_S = 24 * 60 * 60
const DISCORD_PER_DAY = 50
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null

const day = (offset = 0) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10)

// Only our own pages may call this
function sameSite(request: NextRequest) {
  const site = request.headers.get('sec-fetch-site')
  if (site && site !== 'same-origin') return false
  const origin = request.headers.get('origin')
  return !origin || new URL(origin).host === request.headers.get('host')
}

/** One Claude call, if today's budget allows */
async function aiBudgetLeft() {
  return (await hitCounter(`ni:ai:${day()}`, 2 * 86_400)) <= AI_PER_DAY
}

const poolKey = (input: NameIdeasInput) => `ni:pool:v1:${input.industry}:${input.vibe}:${input.kind}`
const squash = (n: string) => n.toLowerCase().replace(/[^a-z0-9]/g, '')

function pickFromPool(pool: NameIdea[], exclude: string[], count: number) {
  const seen = new Set(exclude.map(squash))
  const fresh = pool.filter((n) => !seen.has(squash(n.name)))
  if (fresh.length < count) return null
  for (let i = fresh.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[fresh[i], fresh[j]] = [fresh[j], fresh[i]]
  }
  return fresh.slice(0, count)
}

/** Fill the shared pool after the response, once per combination at a time */
function refillPool(input: NameIdeasInput) {
  after(async () => {
    const key = poolKey(input)
    if ((await hitCounter(`${key}:filling`, 120)) > 1) return
    if (!(await aiBudgetLeft())) return
    const names = await generateNamesWithAI({ ...input, exclude: [], like: null, count: POOL_SIZE })
    if (names && names.length >= 12) await cacheSet(key, names, POOL_TTL_S)
  })
}

// Discord: one notice per visitor per 15 minutes, at most 50 a day, then a single "busy day" note.
// The first notice each day carries yesterday's total.
async function teamNotice(ip: string, build: (extra: { visitorToday: number; yesterday: number | null }) => Parameters<typeof notify>[0]) {
  const visitorToday = await hitCounter(`ni:visitor:${ip}:${day()}`, 86_400)
  if ((await hitCounter(`ni:notify:${ip}`, 15 * 60)) > 1) return
  const sent = await hitCounter(`ni:discord:${day()}`, 2 * 86_400)
  if (sent === DISCORD_PER_DAY + 1) {
    notify({
      channel: 'activity',
      title: '✨ Busy day in the name finder',
      summary: `${DISCORD_PER_DAY} name finder notices already today, so the rest of today stays quiet. Tomorrow’s first notice includes today’s total.`,
    })
  }
  if (sent > DISCORD_PER_DAY) return
  const yesterday = sent === 1 ? await hitCounter(`ni:searches:${day(-1)}`, 2 * 86_400, 0) : null
  notify(build({ visitorToday, yesterday }))
}

export async function GET() {
  return Response.json({ pass: issuePass(), turnstileSiteKey: TURNSTILE_SITE_KEY }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request)
  if (!sameSite(request)) return Response.json({ names: [] }, { status: 403 })
  if ((await hitCounter(`ni:burst:${ip}`, BURST.windowS)) > BURST.max) {
    return Response.json({ names: [], error: 'Lots of ideas in a short time. Take a breath and try again in a minute.' }, { status: 429 })
  }

  const body = (await request.json().catch(() => ({}))) as Partial<NameIdeasInput> & { own?: unknown; turnstile?: unknown }

  // "Already have a name?" checks: just tell the team
  if (typeof body.own === 'string') {
    const own = body.own.replace(/\s+/g, ' ').trim().slice(0, 60)
    if (own.length >= 3) {
      await teamNotice(`own:${ip}`, () => ({
        channel: 'activity',
        title: '🔎 Name checked in the name finder',
        summary: `Someone checked **${own}** against the ORC register.`,
      }))
    }
    return Response.json({ ok: true })
  }

  if (!validPass(request.headers.get('x-name-pass'))) return Response.json({ names: [], renew: true }, { status: 401 })

  const text = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) || undefined : undefined)
  const input: NameIdeasInput = {
    industry: INDUSTRIES.some((i) => i.id === body.industry) ? body.industry! : 'consulting',
    vibe: VIBES.some((v) => v.id === body.vibe) ? body.vibe! : 'modern',
    kind: body.kind === 'company' || body.kind === 'nonprofit' ? body.kind : 'sole',
    word: text(body.word, 40),
    about: text(body.about, 160),
    exclude: Array.isArray(body.exclude) ? body.exclude.filter((n): n is string => typeof n === 'string').map((n) => n.slice(0, 60)).slice(-200) : [],
    like:
      body.like && typeof body.like.name === 'string' && typeof body.like.style === 'string'
        ? { name: body.like.name.slice(0, 60), style: body.like.style.slice(0, 20) }
        : null,
    count: 8,
  }

  // Soft limit: busy visitors prove they're human (Turnstile) or carry on with templates
  const hourly = await hitCounter(`ni:hour:${ip}`, 3600)
  let useAi = aiEnabled() && hourly <= AI_PER_HOUR
  if (useAi && hourly > SOFT_PER_HOUR && !(await cacheGet<boolean>(`ni:human:${ip}`))) {
    if (TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY) {
      if (typeof body.turnstile === 'string' && (await verifyTurnstile(body.turnstile, ip))) {
        await cacheSet(`ni:human:${ip}`, true, 2 * 3600)
      } else {
        return Response.json({ names: [], challenge: true })
      }
    } else {
      useAi = false
    }
  }
  await hitCounter(`ni:searches:${day()}`, 2 * 86_400)

  let source: 'pool' | 'ai' | 'templates' = 'templates'
  let names: NameIdea[] = []
  const pooled = !input.word && !input.about && !input.like

  if (pooled) {
    const pool = await cacheGet<NameIdea[]>(poolKey(input))
    const picked = pool ? pickFromPool(pool, input.exclude ?? [], 8) : null
    if (picked) {
      names = picked
      source = 'pool'
    } else if (!pool && aiEnabled()) {
      refillPool(input)
    }
  }
  if (!names.length && useAi && (await aiBudgetLeft())) {
    names = (await generateNamesWithAI(input)) ?? []
    if (names.length) source = 'ai'
  }
  // Templates fill the batch when Claude is off, over a limit, failed, or came back short
  if (names.length < 8) {
    names = [...names, ...generateNames({ ...input, exclude: [...(input.exclude ?? []), ...names.map((n) => n.name)], count: 8 - names.length })]
  }

  await teamNotice(ip, ({ visitorToday, yesterday }) => ({
    channel: 'activity',
    title: '✨ Name ideas searched',
    summary: visitorToday > 1 ? `${visitorToday} searches from this visitor today.` : 'Someone is looking for a business name.',
    fields: [
      ['Trade', INDUSTRIES.find((i) => i.id === input.industry)?.label],
      ['Feel', VIBES.find((v) => v.id === input.vibe)?.label],
      ['For', KIND_LABELS[input.kind]],
      ['Word', input.word],
      ['About', input.about, false],
      ['More like', input.like?.name],
      ['Ideas', names.slice(0, 4).map((n) => n.name).join(', '), false],
      ['Source', source === 'pool' ? 'Claude (saved batch)' : source === 'ai' ? 'Claude' : 'Templates'],
      ['Searches yesterday', yesterday],
    ],
  }))

  return Response.json({ names, source }, { headers: { 'Cache-Control': 'no-store' } })
}
