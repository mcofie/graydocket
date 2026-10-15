// Domain name availability for a business name. Server-only (uses a raw TCP connection).
//
//   .com     Verisign's public RDAP service: 200 = registered, 404 = not registered
//   .com.gh  Ghana's registry WHOIS (whois.nic.gh, port 43): "No Object Found" = not registered
//
// "Available" here means "not registered right now": it isn't a reservation, and some names are
// sold at premium prices the lookup can't see. Answers are cached for a day and lookups for the same
// domain are shared, which keeps us well within the registries' fair-use terms.

import net from 'node:net'

export type DomainStatus = 'available' | 'taken' | 'unknown'
export type DomainResult = { domain: string; status: DomainStatus }

const DAY = 24 * 60 * 60 * 1000
const cache = new Map<string, { status: DomainStatus; at: number }>()
const inflight = new Map<string, Promise<DomainStatus>>()

// Legal endings and filler words that don't belong in a web address
const DROP = new Set(['limited', 'ltd', 'llc', 'plc', 'inc', 'company', 'co', 'by', 'guarantee', 'lbg', 'the', 'enterprise', 'enterprises', 'ventures'])

/** "Kente Studio Limited" -> ["kente", "studio"] */
function nameWords(businessName: string) {
  return businessName
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter((w) => w && !DROP.has(w))
}

const VALID = /^(?!-)[a-z0-9-]{1,63}(?<!-)\.(com|com\.gh)$/

/** The domains to check first for a business name */
export function domainSuggestions(businessName: string): string[] {
  const words = nameWords(businessName)
  const joined = words.join('')
  if (joined.length < 3 || joined.length > 63) return []
  const list = [`${joined}.com`, `${joined}.com.gh`]
  if (words.length > 1 && words.join('-').length <= 63) list.push(`${words.join('-')}.com`)
  return list.filter((d) => VALID.test(d))
}

/** Close variations, offered when the first choices are taken */
export function domainAlternatives(businessName: string): string[] {
  const joined = nameWords(businessName).join('')
  if (joined.length < 3 || joined.length > 58) return []
  return [`${joined}gh.com`, `${joined}hq.com`, `get${joined}.com`].filter((d) => VALID.test(d))
}

async function lookupCom(domain: string): Promise<DomainStatus> {
  try {
    const res = await fetch(`https://rdap.verisign.com/com/v1/domain/${domain}`, {
      headers: { accept: 'application/rdap+json' },
      signal: AbortSignal.timeout(6000),
      cache: 'no-store',
    })
    if (res.status === 200) return 'taken'
    if (res.status === 404) return 'available'
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

function lookupComGh(domain: string): Promise<DomainStatus> {
  return new Promise((resolve) => {
    let text = ''
    let settled = false
    const done = (status: DomainStatus) => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve(status)
    }
    const classify = () => {
      if (/No Object Found/i.test(text)) return done('available')
      if (/Domain Name:/i.test(text) && /Registry Domain ID|Creation Date/i.test(text)) return done('taken')
      done('unknown')
    }
    const socket = net.connect({ host: 'whois.nic.gh', port: 43 })
    socket.setTimeout(7000)
    socket.on('connect', () => socket.write(`${domain}\r\n`))
    socket.on('data', (chunk) => {
      text += chunk.toString('utf8')
      // The answer arrives in one go; stop as soon as it's clear
      if (/No Object Found|Registry Domain ID/i.test(text)) classify()
    })
    socket.on('end', classify)
    socket.on('timeout', () => done('unknown'))
    socket.on('error', () => done('unknown'))
  })
}

/** Is this domain registered? Cached for a day (a failed lookup only for 5 minutes) */
export async function checkDomain(domain: string): Promise<DomainStatus> {
  const d = domain.trim().toLowerCase()
  if (!VALID.test(d)) return 'unknown'
  const hit = cache.get(d)
  if (hit && Date.now() - hit.at < (hit.status === 'unknown' ? 5 * 60 * 1000 : DAY)) return hit.status
  const running = inflight.get(d)
  if (running) return running

  const lookup = (d.endsWith('.com.gh') ? lookupComGh(d) : lookupCom(d))
    .then((status) => {
      cache.set(d, { status, at: Date.now() })
      if (cache.size > 5000) cache.clear()
      return status
    })
    .finally(() => inflight.delete(d))
  inflight.set(d, lookup)
  return lookup
}

/** Check the usual domains for a business name, adding variations if those are all taken */
export async function checkDomainsFor(businessName: string): Promise<{ domains: DomainResult[]; alternatives: DomainResult[] }> {
  const first = domainSuggestions(businessName)
  const domains = await Promise.all(first.map(async (domain) => ({ domain, status: await checkDomain(domain) })))
  const anyFree = domains.some((d) => d.status === 'available')
  const alternatives = anyFree || domains.length === 0
    ? []
    : await Promise.all(domainAlternatives(businessName).map(async (domain) => ({ domain, status: await checkDomain(domain) })))
  return { domains, alternatives: alternatives.filter((a) => a.status === 'available') }
}
