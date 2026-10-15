import { createHmac, timingSafeEqual } from 'node:crypto'

// A short-lived signed pass the name finder page picks up before asking for names. It doesn't stop
// a determined script, but plain copied requests stop working after two hours, and every request
// must have come through our page first. Turnstile (name-ideas route) is the stronger check.

const SECRET = process.env.NAME_IDEAS_SECRET || process.env.OTP_SIGNING_SECRET || 'graydocket-name-ideas'
const MAX_AGE_MS = 2 * 60 * 60_000

const sign = (issued: string) => createHmac('sha256', SECRET).update(`name-ideas:${issued}`).digest('base64url')

export function issuePass() {
  const issued = Date.now().toString(36)
  return `${issued}.${sign(issued)}`
}

export function validPass(pass: string | null) {
  if (!pass) return false
  const [issued, signature] = pass.split('.')
  if (!issued || !signature) return false
  const age = Date.now() - parseInt(issued, 36)
  if (!(age >= -60_000 && age < MAX_AGE_MS)) return false
  const expected = Buffer.from(sign(issued))
  const given = Buffer.from(signature)
  return expected.length === given.length && timingSafeEqual(expected, given)
}

/** Cloudflare Turnstile, when keys are set. Returns true if the browser passed. */
export async function verifyTurnstile(token: string, ip: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret || !token) return false
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(5000),
    })
    const body = (await res.json()) as { success?: boolean }
    return body.success === true
  } catch {
    return false
  }
}
