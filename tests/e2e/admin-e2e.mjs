// End-to-end check of the admin against a real Redis and a mock Square server.
//
//   npm run build && npm run test:e2e        (needs redis-server and redis-cli on PATH)
//
// Covers: fail-closed configuration, setup-code gate, owner-only access,
// Square connect / sign-in / disconnect, per-environment merchant binding,
// canonical callback host, restart survival, and demo-mode isolation.
// Uses fake credentials only; never contacts Square.
import { spawn, execFileSync } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'nc-admin-e2e-'))
const OUT = path.resolve(HERE, '../../.output/server/index.mjs')
if (!fs.existsSync(OUT)) { console.error('Run `npm run build` first.'); process.exit(1) }
const REDIS_PORT = 6390
const REDIS_URL = `redis://127.0.0.1:${REDIS_PORT}/0`
const MOCK = 'http://127.0.0.1:4801'
const SETUP_CODE = 'nino-first-run-7Hq2xP'
const SECRET = 'e2e-session-secret-0123456789abcdef0123456789'
const results = []
const ok = (name, cond, detail = '') => { results.push({ name, pass: !!cond, detail }); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`) }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const redis = (...args) => execFileSync('redis-cli', ['-p', String(REDIS_PORT), ...args], { encoding: 'utf8' }).trim()

// --- processes -----------------------------------------------------------------
let redisProc
async function startRedis() {
  fs.mkdirSync(`${DIR}/redis`, { recursive: true })
  redisProc = track(spawn('redis-server', ['--port', String(REDIS_PORT), '--appendonly', 'yes', '--dir', `${DIR}/redis`, '--save', ''], { stdio: 'ignore' }))
  for (let i = 0; i < 40; i++) { try { if (redis('ping') === 'PONG') return } catch {} await sleep(100) }
  throw new Error('redis did not start')
}
async function stopRedis() { try { redis('shutdown') } catch {} await sleep(400) }

async function startApp(port, env) {
  const proc = track(spawn('node', [OUT], { env: { PATH: process.env.PATH, HOME: process.env.HOME, PORT: String(port), ...env }, stdio: ['ignore', 'pipe', 'pipe'] }))
  let logs = ''
  proc.stdout.on('data', (d) => (logs += d)); proc.stderr.on('data', (d) => (logs += d))
  for (let i = 0; i < 80; i++) { try { if ((await fetch(`http://localhost:${port}/`)).ok) return { proc, logs: () => logs, port } } catch {} await sleep(150) }
  throw new Error('app did not start:\n' + logs)
}
async function stopApp(app) { app.proc.kill(); await new Promise((r) => app.proc.on('exit', r)) }

// --- tiny browser ----------------------------------------------------------------
let defaultHeaders = {}
class Jar {
  constructor() { this.c = new Map() }
  header() { return [...this.c].map(([k, v]) => `${k}=${v}`).join('; ') }
  take(res) { for (const sc of res.headers.getSetCookie?.() ?? []) { const [kv] = sc.split(';'); const i = kv.indexOf('='); const k = kv.slice(0, i); const v = kv.slice(i + 1); if (/Max-Age=0|Expires=Thu, 01 Jan 1970/i.test(sc) || v === '') this.c.delete(k); else this.c.set(k, v) } }
  clone() { const j = new Jar(); j.c = new Map(this.c); return j }
}
async function req(base, jar, p, { method = 'GET', body, headers = {} } = {}) {
  // Stand-in for Vercel's TLS termination: https://localhost callbacks reach the local http server.
  const url = (p.startsWith('http') ? p : base + p).replace(/^https:\/\/localhost:/, 'http://localhost:')
  const sameSite = url.startsWith(base)
  const res = await fetch(url, {
    method, redirect: 'manual',
    headers: { ...(sameSite && jar ? { cookie: jar.header() } : {}), ...(body ? { 'content-type': 'application/json' } : {}), ...(method !== 'GET' && sameSite ? { origin: base } : {}), ...defaultHeaders, ...headers },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (sameSite && jar) jar.take(res)
  const text = await res.text()
  let data = null; try { data = JSON.parse(text) } catch {}
  return { status: res.status, location: res.headers.get('location'), data, text }
}
/** Follow a Square round trip: start → mock authorize → callback. Returns the final redirect. */
async function squareTrip(base, jar, startPath) {
  const start = await req(base, jar, startPath)
  if (start.location?.startsWith('/api/admin/auth/square/callback')) return { stage: 'callback', ...(await req(base, jar, start.location)) }
  if (!start.location?.startsWith(MOCK)) return { stage: 'start', ...start }
  const auth = await req(base, null, start.location)
  if (!auth.location) return { stage: 'authorize', ...auth }
  const cb = await req(base, jar, auth.location)
  return { stage: 'callback', ...cb }
}
const mock = async (p, body) => (await fetch(MOCK + p, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {})).json()

const realEnv = (port) => ({
  REDIS_URL, NUXT_SESSION_SECRET: SECRET, NUXT_ADMIN_SETUP_CODE: SETUP_CODE,
  NUXT_SQUARE_APP_ID: 'mock-app-id-not-real', NUXT_SQUARE_APP_SECRET: 'mock-app-secret-not-real', NUXT_SQUARE_ENV: 'sandbox',
  NUXT_SQUARE_API_ORIGIN: MOCK, NUXT_SQUARE_AUTHORIZE_URL: `${MOCK}/oauth2/authorize`,
  NUXT_SQUARE_REDIRECT_URL: `http://localhost:${port}/api/admin/auth/square/callback`,
})

// Every child process is stopped however the run ends, so a failed run can't
// leave servers holding the ports (and stale data) for the next one.
const children = new Set()
const track = (proc) => { children.add(proc); proc.on('exit', () => children.delete(proc)); return proc }
const killAll = () => { for (const c of children) { try { c.kill('SIGKILL') } catch {} } }
process.on('exit', killAll)
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { killAll(); process.exit(130) })
process.on('uncaughtException', (e) => { console.error(e); killAll(); process.exit(1) })
process.on('unhandledRejection', (e) => { console.error(e); killAll(); process.exit(1) })

async function assertPortFree(port) {
  const inUse = await new Promise((resolve) => {
    const sock = net.connect(port, '127.0.0.1')
    sock.once('connect', () => { sock.destroy(); resolve(true) })
    sock.once('error', () => resolve(false))
  })
  if (inUse) { console.error(`Port ${port} is already in use; stop that process first.`); process.exit(1) }
}
for (const port of [REDIS_PORT, 4801, 3501, 3502, 3503, 3504, 3506, 3507, 3508, 3509]) await assertPortFree(port)

// =================================================================================
fs.rmSync(`${DIR}/redis`, { recursive: true, force: true })
await startRedis()
const mockProc = track(spawn('node', [path.join(HERE, 'mock-square.mjs')], { stdio: 'ignore' }))
await sleep(500)

// --- A. Locked until configured ----------------------------------------------------
{
  const app = await startApp(3502, { VERCEL: '1', NUXT_ADMIN_SETUP_CODE: SETUP_CODE })
  const B = 'http://localhost:3502'
  const s = await req(B, new Jar(), '/api/admin/auth/session')
  ok('Vercel without Redis: admin reports missing durable storage', s.data?.blocked?.includes('REDIS_URL'), s.data?.blocked)
  const setup = await req(B, new Jar(), '/api/admin/auth/setup', { method: 'POST', body: { code: SETUP_CODE, email: 'x@example.com', password: 'abcdefghijklm', confirm: 'abcdefghijklm' } })
  ok('Vercel without Redis: setup refused', setup.status === 503, String(setup.status))
  await stopApp(app)
}
{
  const app = await startApp(3503, { REDIS_URL, NUXT_SESSION_SECRET: SECRET })
  const B = 'http://localhost:3503'
  const s = await req(B, new Jar(), '/api/admin/auth/session')
  ok('No setup code configured: setup closed with the reason shown', s.data?.methods?.setup === false && s.data?.blocked?.includes('NUXT_ADMIN_SETUP_CODE'), s.data?.blocked)
  const setup = await req(B, new Jar(), '/api/admin/auth/setup', { method: 'POST', body: { code: 'anything-long-enough', email: 'x@example.com', password: 'abcdefghijklm', confirm: 'abcdefghijklm' } })
  ok('No setup code configured: setup refused', setup.status === 503, String(setup.status))
  ok('Locked servers wrote no owner account', redis('exists', 'ninos:admin:owner') === '0')
  await stopApp(app)
}

// --- B. Real flow ----------------------------------------------------------------------
const PORT = 3501
const B = `http://localhost:${PORT}`
let app = await startApp(PORT, realEnv(PORT))
ok('Storage backend is Redis', app.logs().includes('storage: Redis'), (app.logs().match(/\[admin\][^\n]*/) || [''])[0])
const nino = new Jar()

ok('Signed out: admin API is 401', (await req(B, new Jar(), '/api/admin/products')).status === 401)
const page = await req(B, new Jar(), '/admin/inventory')
ok('Signed out: admin page redirects to login', page.status === 302 && page.location.startsWith('/admin/login'), page.location)
const s0 = await req(B, new Jar(), '/api/admin/auth/session')
ok('First visit: setup offered, no other sign-in method', s0.data.methods.setup && !s0.data.methods.password && !s0.data.methods.square)
ok('Signed-out session response reveals no owner details', !('owner' in s0.data) && !('storage' in s0.data))

const good = { email: 'Nino@Example.com', password: 'my-own-secret-pass', confirm: 'my-own-secret-pass' }
ok('Setup without the code is refused', (await req(B, new Jar(), '/api/admin/auth/setup', { method: 'POST', body: good })).status === 403)
ok('Setup with a wrong code is refused', (await req(B, new Jar(), '/api/admin/auth/setup', { method: 'POST', body: { ...good, code: 'wrong-code-123456' } })).status === 403)
ok('Setup with a short password is refused', (await req(B, new Jar(), '/api/admin/auth/setup', { method: 'POST', body: { ...good, code: SETUP_CODE, password: 'short', confirm: 'short' } })).status === 400)
const created = await req(B, nino, '/api/admin/auth/setup', { method: 'POST', body: { ...good, code: SETUP_CODE } })
ok('Setup with the right code creates the owner and signs in', created.status === 200 && nino.c.has('nc_admin'), String(created.status))
const reuse = await req(B, new Jar(), '/api/admin/auth/setup', { method: 'POST', body: { ...good, email: 'intruder@example.com', code: SETUP_CODE } })
ok('Setup code cannot be used again once the owner exists', reuse.status === 409, String(reuse.status))
const ownerRaw = redis('get', 'ninos:admin:owner')
ok('Owner record in Redis holds a scrypt hash, not the password', ownerRaw.includes('scrypt$') && !ownerRaw.includes('my-own-secret-pass'))
const me = await req(B, nino, '/api/admin/auth/session')
ok('Session API never returns the password hash', !me.text.includes('scrypt'))
ok('Owner email stored lower-case', me.data.owner?.email === 'nino@example.com', me.data.owner?.email)

// Owner-only sign-in
ok('Sign-in with another email is refused', (await req(B, new Jar(), '/api/admin/auth/login', { method: 'POST', body: { email: 'intruder@example.com', password: good.password } })).status === 401)
ok('Sign-in with a wrong password is refused', (await req(B, new Jar(), '/api/admin/auth/login', { method: 'POST', body: { email: 'nino@example.com', password: 'not-my-password' } })).status === 401)
const second = new Jar()
ok('Owner email + password signs in', (await req(B, second, '/api/admin/auth/login', { method: 'POST', body: { email: 'NINO@example.com', password: good.password } })).status === 200)
const xsite = await req(B, nino, '/api/admin/products', { method: 'POST', body: { title: 'x' }, headers: { origin: 'https://evil.example' } })
ok('Cross-site POST is blocked', xsite.status === 403)
const forged = new Jar(); forged.c.set('nc_admin', 'Fe26.2**forged**cookie')
ok('Forged cookie is rejected', (await req(B, forged, '/api/admin/products')).status === 401)

// Inventory + photo
const prod = await req(B, nino, '/api/admin/products', { method: 'POST', body: { title: 'E2E Charizard', priceCents: '45.00', quantity: 2, availability: 'listed' } })
ok('Owner can add a card', prod.status === 200, prod.data?.product?.id)
const pid = prod.data?.product?.id
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
const fd = new FormData(); fd.append('file', new Blob([png], { type: 'image/png' }), 'p.png')
const up = await fetch(B + '/api/admin/uploads', { method: 'POST', body: fd, headers: { cookie: nino.header(), origin: B } }).then((r) => r.json())
ok('Photo upload stored', /^\/media\/[a-f0-9]{16}$/.test(up.src ?? ''), up.src)
await req(B, nino, `/api/admin/products/${pid}`, { method: 'PUT', body: { photos: [{ id: up.id, src: up.src, alt: 'front' }] } })
await req(B, nino, '/api/admin/settings', { method: 'PUT', body: { copy: { heroHeadline: 'E2E headline' }, featuredProductIds: [pid] } })

// Square: sign-in before linking is refused
const early = await squareTrip(B, new Jar(), '/api/admin/auth/square/start')
ok('Sign in with Square before connecting: refused', early.stage === 'start' && early.location?.includes('error=nosquare'), early.location)

// Homepage feed before Square is connected: empty, so the site shows Instagram
const feed0 = await req(B, null, '/api/feed')
ok('Homepage feed is empty before Square is connected', feed0.status === 200 && feed0.data?.source === null && feed0.data?.cards?.length === 0, feed0.text.slice(0, 120))
const home0 = await req(B, null, '/')
ok('Homepage feed falls back to Instagram before Square is connected', home0.text.includes('data-feed-source="instagram"'))

// Square: connect from the admin
await mock('/__mock/merchant', { merchant: 'M-NINO' })
const conn = await squareTrip(B, nino, '/api/admin/auth/square/start?next=/admin/square')
ok('Connect Square: round trip lands back on the Square page', conn.stage === 'callback' && conn.location === '/admin/square?connected=1', `${conn.stage} ${conn.location}`)
const st1 = await req(B, nino, '/api/admin/square/status')
ok('Square status shows the connected business and location', st1.data?.connection?.businessName === "Nino's Collectibles (mock)" && st1.data?.connection?.locationName === 'Card shows')
const tokenLog = (await mock('/__mock/log')).log.filter((l) => l.t === 'token')
const ninoToken = tokenLog.at(-1)?.access_token
ok('Square status response contains no token', !!ninoToken && !st1.text.includes(ninoToken) && !st1.text.includes('sealed'))
const connRaw = redis('get', 'ninos:admin:square:connection')
ok('Stored Square connection is sealed (no raw token in Redis)', connRaw.length > 0 && !connRaw.includes(ninoToken) && !connRaw.includes('RT-'))
const allKeys = redis('--scan', '--pattern', 'ninos:admin:*').split('\n')
ok('Session-sealing key is not stored in Redis when NUXT_SESSION_SECRET is set', !allKeys.includes('ninos:admin:session:secret'))
const prev = await req(B, nino, '/api/admin/square/preview', { method: 'POST' })
ok('Square preview reads the real (mock) catalog through the connection', prev.status === 200 && prev.data?.source === 'square' && prev.data?.imports?.[0]?.name === 'Mock Square card', `${prev.status} ${prev.data?.source}`)

// Homepage feed reads the connected catalog: in-stock cards only, no ids or tokens
const feed1 = await req(B, null, '/api/feed')
const names1 = (feed1.data?.cards ?? []).map((c) => c.name)
ok('Homepage feed lists in-stock Square items, newest first', feed1.data?.source === 'square' && names1.join('|') === 'Mock untracked card|Mock Square card', names1.join('|'))
const card1 = feed1.data?.cards?.find((c) => c.name === 'Mock Square card')
ok('Homepage feed carries price, stock and image from Square', card1?.priceCents === 2500 && card1?.quantity === 4 && card1?.imageUrl === 'https://example.com/mock-square-card.jpg')
ok('Homepage feed shows no price where Square has none', feed1.data?.cards?.find((c) => c.name === 'Mock untracked card')?.priceCents === null)
ok('Homepage feed sends no Square ids or tokens', !/SQ-(ITEM|VAR|IMG)|mock-access-token|RT-|sealed|L-NINO|M-NINO/.test(feed1.text), feed1.text.slice(0, 200))
const home1 = await req(B, null, '/')
ok('Homepage renders the Square stock in the feed section', home1.text.includes('data-feed-source="square"') && home1.text.includes('Mock Square card') && !home1.text.includes('Mock sold-out card'))

// Square sign-in for the linked merchant
const viaSquare = new Jar()
const si = await squareTrip(B, viaSquare, '/api/admin/auth/square/start')
const siSession = await req(B, viaSquare, '/api/admin/auth/session')
ok('Sign in with Square works for the linked merchant', si.location === '/admin' && siSession.data.signedIn && siSession.data.via === 'square', `${si.location} ${siSession.data.via}`)

// A different Square account
await mock('/__mock/merchant', { merchant: 'M-OTHER' })
const other = await squareTrip(B, new Jar(), '/api/admin/auth/square/start')
ok('Sign in with a different Square account is refused', other.location?.includes('error=notowner'), other.location)
const otherConnect = await squareTrip(B, nino, '/api/admin/auth/square/start?next=/admin/square')
ok('Connecting a different Square account while one is linked is refused', otherConnect.location?.includes('error=othermerchant'), otherConnect.location)
const mlog = await mock('/__mock/log')
const otherTokens = mlog.log.filter((l) => l.t === 'token' && l.merchant === 'M-OTHER').map((l) => l.access_token)
ok('Tokens from refused Square accounts are revoked immediately', otherTokens.length === 2 && otherTokens.every((t) => !mlog.live.includes(t)))
await mock('/__mock/merchant', { merchant: 'M-NINO' })

// Disconnect
const latestNinoToken = (await mock('/__mock/log')).log.filter((l) => l.t === 'token' && l.merchant === 'M-NINO').at(-1).access_token
const disc = await req(B, nino, '/api/admin/square/disconnect', { method: 'POST' })
const afterDisc = await mock('/__mock/log')
ok('Disconnect revokes access at Square', disc.data?.revoked === true && !afterDisc.live.includes(latestNinoToken))
ok('Disconnect deletes the stored connection', redis('exists', 'ninos:admin:square:connection') === '0')
const st2 = await req(B, nino, '/api/admin/square/status')
ok('Square status shows not connected', st2.data?.connection === null && st2.data?.canConnect === true)
const feed2 = await req(B, null, '/api/feed')
ok('After disconnect, the homepage feed stops showing Square stock', feed2.data?.source === null && feed2.data?.cards?.length === 0)
const afterDiscSignin = await squareTrip(B, new Jar(), '/api/admin/auth/square/start')
ok('After disconnect, Sign in with Square is refused', afterDiscSignin.location?.includes('error=nosquare'), afterDiscSignin.location)
ok('After disconnect, email + password still works', (await req(B, new Jar(), '/api/admin/auth/login', { method: 'POST', body: { email: 'nino@example.com', password: good.password } })).status === 200)

// Reconnect for the restart test
const re = await squareTrip(B, nino, '/api/admin/auth/square/start?next=/admin/square')
ok('Reconnect works', re.location === '/admin/square?connected=1', re.location)

// --- C. Restart the app, then restart Redis too ---------------------------------------
async function checkSurvives(label) {
  const s = await req(B, nino, '/api/admin/auth/session')
  ok(`${label}: existing session cookie still valid`, s.data?.signedIn === true)
  const p = await req(B, nino, `/api/admin/products/${pid}`)
  ok(`${label}: card and its photo link survive`, p.data?.product?.title === 'E2E Charizard' && p.data.product.photos?.[0]?.src === up.src)
  const media = await fetch(B + up.src)
  ok(`${label}: photo bytes survive`, media.status === 200 && Buffer.from(await media.arrayBuffer()).equals(png))
  const site = await req(B, null, '/api/site')
  ok(`${label}: public settings + featured card survive`, site.data?.copy?.heroHeadline === 'E2E headline' && site.data?.featured?.[0]?.id === pid)
  ok(`${label}: owner password still works`, (await req(B, new Jar(), '/api/admin/auth/login', { method: 'POST', body: { email: 'nino@example.com', password: good.password } })).status === 200)
  const sq = await req(B, nino, '/api/admin/square/preview', { method: 'POST' })
  ok(`${label}: Square connection survives and its sealed token still opens`, sq.status === 200 && sq.data?.source === 'square', String(sq.status))
  ok(`${label}: setup stays closed`, (await req(B, new Jar(), '/api/admin/auth/setup', { method: 'POST', body: { ...good, code: SETUP_CODE } })).status === 409)
}
await stopApp(app)
app = await startApp(PORT, realEnv(PORT))
await checkSurvives('After app restart')
await stopApp(app)
await stopRedis()
await startRedis()
app = await startApp(PORT, realEnv(PORT))
await checkSurvives('After app + Redis restart')

// Password change signs other sessions out
const changed = await req(B, nino, '/api/admin/auth/password', { method: 'POST', body: { current: good.password, password: 'a-brand-new-password', confirm: 'a-brand-new-password' } })
ok('Password change succeeds', changed.status === 200)
ok('Password change keeps this session', (await req(B, nino, '/api/admin/auth/session')).data.signedIn === true)
ok('Password change signs out other sessions', (await req(B, second, '/api/admin/auth/session')).data.signedIn === false)
ok('Old password no longer works', (await req(B, new Jar(), '/api/admin/auth/login', { method: 'POST', body: { email: 'nino@example.com', password: good.password } })).status === 401)

// Rate limiting is shared through Redis
const rl = new Jar(); let last = 0
for (let i = 0; i < 6; i++) last = (await req(B, rl, '/api/admin/auth/login', { method: 'POST', body: { email: 'nino@example.com', password: 'guess-' + i }, headers: { 'x-forwarded-for': '203.0.113.9' } })).status
ok('Sixth wrong password from one address is rate-limited', last === 429, String(last))
ok('Rate-limit counter lives in Redis', redis('--scan', '--pattern', 'ninos:admin:ratelimit:login:*').length > 0)
await stopApp(app)

// --- E. Sandbox test, then switch the same site to production ------------------------
// A merchant linked during Sandbox testing must not block Nino's real store.
// Production requires an https callback (Square's rule), as on a Vercel Preview.
const prodEnv = { ...realEnv(PORT), NUXT_SQUARE_ENV: 'production', NUXT_SQUARE_REDIRECT_URL: `https://localhost:${PORT}/api/admin/auth/square/callback` }
app = await startApp(PORT, prodEnv)
const stE = await req(B, nino, '/api/admin/square/status')
ok('After switching to production, the sandbox connection is not used', stE.data?.connection === null && /from sandbox/.test(stE.data?.note ?? ''), stE.data?.note)
const sandboxSignin = await squareTrip(B, new Jar(), '/api/admin/auth/square/start')
ok('Sandbox merchant cannot use Sign in with Square on the production site', sandboxSignin.location?.includes('error=nosquare'), sandboxSignin.location)
await mock('/__mock/merchant', { merchant: 'M-OTHER' })
const prodConnect = await squareTrip(B, nino, '/api/admin/auth/square/start?next=/admin/square')
ok('First merchant authorized in production is bound to the owner', prodConnect.location === '/admin/square?connected=1', prodConnect.location)
const ownerProd = JSON.parse(redis('get', 'ninos:admin:owner'))
ok('Owner record now names the production merchant and environment', ownerProd.merchantId === 'M-OTHER' && ownerProd.squareEnv === 'production')
const connProd = JSON.parse(redis('get', 'ninos:admin:square:connection'))
ok('Stored connection is tagged with its environment', connProd.env === 'production')
const prodSignin = await squareTrip(B, new Jar(), '/api/admin/auth/square/start')
ok('Production merchant can Sign in with Square', prodSignin.location === '/admin', prodSignin.location)
await mock('/__mock/merchant', { merchant: 'M-NINO' })
const wrongProd = await squareTrip(B, nino, '/api/admin/auth/square/start?next=/admin/square')
ok('A second production merchant is refused (one store per owner)', wrongProd.location?.includes('error=othermerchant'), wrongProd.location)

// Canonical host: the Square round trip must start on the registered callback host.
const offHost = await req(`http://127.0.0.1:${PORT}`, null, '/admin/login')
ok('Admin pages on another host redirect to the registered callback host', offHost.status === 302 && offHost.location === `https://localhost:${PORT}/admin/login`, offHost.location)
const offStart = await req(`http://127.0.0.1:${PORT}`, null, '/api/admin/auth/square/start')
ok('Square start on another host redirects to the registered host first', offStart.status === 302 && offStart.location === `https://localhost:${PORT}/api/admin/auth/square/start`, offStart.location)
await stopApp(app)

// --- F. Simulated Vercel Preview: fail closed, then a correctly configured site ----------
const VHOST = 'niko-git-admin-preview-nickhsousa96-8307s-projects.vercel.app'
const VORIGIN = `https://${VHOST}`
const vercelBase = { VERCEL: '1', VERCEL_ENV: 'preview', REDIS_URL: `redis://127.0.0.1:${REDIS_PORT}/1` }
{
  const v = await startApp(3506, { ...vercelBase, NUXT_ADMIN_SETUP_CODE: SETUP_CODE })
  const s = await req('http://localhost:3506', new Jar(), '/api/admin/auth/session')
  ok('Vercel with Redis but no NUXT_SESSION_SECRET: admin locked', s.data?.blocked?.includes('NUXT_SESSION_SECRET'), s.data?.blocked)
  await stopApp(v)
}
{
  const v = await startApp(3507, { ...vercelBase, NUXT_ADMIN_DEMO: '1', VERCEL_ENV: 'production', NUXT_SESSION_SECRET: SECRET, NUXT_ADMIN_SETUP_CODE: SETUP_CODE })
  ok('NUXT_ADMIN_DEMO is ignored on the production deployment', !v.logs().includes('Demo memory') && v.logs().includes('ignored on the production deployment'))
  const d = await req('http://localhost:3507', new Jar(), '/api/admin/auth/login', { method: 'POST', body: { password: 'demo-nino' } })
  ok('The demo password does not work on production', d.status === 409 || d.status === 401, String(d.status))
  const site = await req('http://localhost:3507', null, '/api/site')
  ok('No SAMPLE data reaches the production homepage API', !site.text.includes('SAMPLE'))
  await stopApp(v)
}
{
  const env = {
    ...vercelBase, NUXT_SESSION_SECRET: SECRET, NUXT_ADMIN_SETUP_CODE: SETUP_CODE,
    NUXT_SQUARE_APP_ID: 'sq0idp-FAKEPRODAPP', NUXT_SQUARE_APP_SECRET: 'fake-secret-for-tests', NUXT_SQUARE_ENV: 'production',
    NUXT_SQUARE_REDIRECT_URL: `${VORIGIN}/api/admin/auth/square/callback`,
    // Test overrides present on purpose: they must be ignored on Vercel.
    NUXT_SQUARE_API_ORIGIN: MOCK, NUXT_SQUARE_AUTHORIZE_URL: `${MOCK}/oauth2/authorize`,
  }
  const v = await startApp(3508, env)
  const VB = 'http://localhost:3508'
  defaultHeaders = { 'x-forwarded-proto': 'https', 'x-forwarded-host': VHOST }
  const s = await req(VB, new Jar(), '/api/admin/auth/session')
  const items = Object.fromEntries((s.data?.setupCheck?.items ?? []).map((i) => [i.key, i.ok]))
  ok('Setup check: every Preview setting reports OK', Object.values(items).length === 7 && Object.values(items).every(Boolean), JSON.stringify(items))
  ok('Setup check shows the exact callback URL to register', s.data?.setupCheck?.callbackUrl === `${VORIGIN}/api/admin/auth/square/callback`, s.data?.setupCheck?.callbackUrl)
  ok('Setup check exposes no values', !s.text.includes('FAKEPRODAPP') && !s.text.includes('fake-secret') && !s.text.includes(SETUP_CODE) && !s.text.includes(SECRET))
  const vj = new Jar()
  const vs = await req(VB, vj, '/api/admin/auth/setup', { method: 'POST', body: { code: SETUP_CODE, email: 'nino@example.com', password: 'my-own-secret-pass', confirm: 'my-own-secret-pass' }, headers: { origin: VORIGIN } })
  ok('Preview: owner setup with the code works', vs.status === 200, String(vs.status))
  const after = await req(VB, new Jar(), '/api/admin/auth/session')
  ok('Preview: setup check is hidden from visitors once the owner exists', after.data?.setupCheck === null && after.data?.methods?.setup === false)
  const start = await req(VB, vj, '/api/admin/auth/square/start?next=/admin/square')
  const loc = new URL(start.location ?? 'http://invalid/')
  ok('Preview: Connect Square goes to Square production, not the test override', loc.origin === 'https://connect.squareup.com' && loc.pathname === '/oauth2/authorize', start.location)
  ok('Preview: authorize request carries the app ID, scopes, state and the registered callback', loc.searchParams.get('client_id') === 'sq0idp-FAKEPRODAPP' && loc.searchParams.get('redirect_uri') === `${VORIGIN}/api/admin/auth/square/callback` && (loc.searchParams.get('state') ?? '').length >= 30 && /MERCHANT_PROFILE_READ/.test(loc.searchParams.get('scope') ?? '') && loc.searchParams.get('session') === 'false')
  ok('Preview: the app secret never appears in the browser redirect', !start.location.includes('fake-secret'))
  defaultHeaders = {}
  const sandboxIdOnProd = await startApp(3509, { ...env, NUXT_SQUARE_APP_ID: 'sandbox-sq0idb-FAKE' })
  defaultHeaders = { 'x-forwarded-proto': 'https', 'x-forwarded-host': VHOST }
  const sv = await req('http://localhost:3509', vj, '/api/admin/square/status')
  ok('Preview: a Sandbox app ID with NUXT_SQUARE_ENV=production blocks Connect Square', sv.data?.canConnect === false && sv.data.problems.some((p) => /Sandbox ID/.test(p)))
  defaultHeaders = {}
  await stopApp(sandboxIdOnProd)
  await stopApp(v)
  redis('-n', '1', 'flushdb')
}
{
  // Dedicated admin subdomain: its root opens the admin; the public site stays put.
  const AHOST = 'admin.example.test'
  const a = await startApp(3510, { ...vercelBase, VERCEL_ENV: 'production', NUXT_SESSION_SECRET: SECRET, NUXT_ADMIN_SETUP_CODE: SETUP_CODE,
    NUXT_SQUARE_APP_ID: 'sq0idp-FAKEPRODAPP', NUXT_SQUARE_APP_SECRET: 'fake-secret-for-tests', NUXT_SQUARE_ENV: 'production',
    NUXT_SQUARE_REDIRECT_URL: `https://${AHOST}/api/admin/auth/square/callback` })
  const AB = 'http://localhost:3510'
  const root = await req(AB, null, '/', { headers: { 'x-forwarded-proto': 'https', 'x-forwarded-host': AHOST } })
  ok('Admin subdomain: its root opens the admin', root.status === 302 && root.location === '/admin', `${root.status} ${root.location}`)
  const pub = await req(AB, null, '/', { headers: { 'x-forwarded-proto': 'https', 'x-forwarded-host': 'www.example.test' } })
  ok('Admin subdomain: the public homepage on the main domain is unchanged', pub.status === 200 && pub.text.includes('id="feed"'), String(pub.status))
  const moved = await req(AB, null, '/admin/login', { headers: { 'x-forwarded-proto': 'https', 'x-forwarded-host': 'www.example.test' } })
  ok('Admin subdomain: /admin on the main domain moves to the subdomain', moved.status === 302 && moved.location === `https://${AHOST}/admin/login`, moved.location)
  await stopApp(a)
  redis('-n', '1', 'flushdb')
}

// --- D. Demo mode never touches real data ----------------------------------------------
const before = redis('--scan', '--pattern', '*').split('\n').sort().join(',')
const ownerBefore = redis('get', 'ninos:admin:owner')
const logBefore = (await mock('/__mock/log')).log.length
const demo = await startApp(3504, { ...realEnv(3504), NUXT_ADMIN_DEMO: '1' })
const D = 'http://localhost:3504'
ok('Demo mode uses memory storage even with REDIS_URL set', demo.logs().includes('Demo memory'))
const dj = new Jar()
ok('Demo password signs in', (await req(D, dj, '/api/admin/auth/login', { method: 'POST', body: { password: 'demo-nino' } })).status === 200)
const dprod = await req(D, dj, '/api/admin/products')
ok('Demo inventory is SAMPLE-labelled only', dprod.data.products.length > 0 && dprod.data.products.every((p) => p.title.startsWith('SAMPLE')))
ok('Demo cannot see the real card', !dprod.text.includes('E2E Charizard'))
await req(D, dj, '/api/admin/products', { method: 'POST', body: { title: 'SAMPLE added in demo' } })
const dconn = await squareTrip(D, dj, '/api/admin/auth/square/start?next=/admin/square')
const dst = await req(D, dj, '/api/admin/square/status')
ok('Demo Square connect uses the SAMPLE identity', dconn.location === '/admin/square?connected=1' && dst.data?.connection?.source === 'demo' && dst.data.connection.businessName.startsWith('SAMPLE'))
await req(D, dj, '/api/admin/square/preview', { method: 'POST' })
ok('Demo mode made no requests to Square', (await mock('/__mock/log')).log.length === logBefore)
ok('Demo mode rejects the real owner password', (await req(D, new Jar(), '/api/admin/auth/login', { method: 'POST', body: { email: 'nino@example.com', password: 'a-brand-new-password' } })).status === 401)
ok('Real session cookie is not accepted by the demo server', (await req(D, nino, '/api/admin/auth/session')).data.signedIn === false)
await stopApp(demo)
const after = redis('--scan', '--pattern', '*').split('\n').sort().join(',')
ok('Demo mode wrote nothing to Redis', before === after && redis('get', 'ninos:admin:owner') === ownerBefore)

mockProc.kill()
await stopRedis()
const failed = results.filter((r) => !r.pass)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
if (failed.length) { console.log('FAILED:', failed.map((f) => f.name).join(' | ')); process.exit(1) }
