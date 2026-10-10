// Browser check of the public /scan page against the built server.
//
//   npm run build && node tests/e2e/scan-e2e.mjs
//   (PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs and CHROMIUM=/path/to/chrome if not installed)
//
// A canvas stream stands in for the phone camera and shows a printed card; the
// real self-hosted Tesseract.js reads it. /api/cards is answered in the browser
// with fixed cards (no JustTCG key is used). Covers: scan → confirm printing →
// offer at 60%, misread → correction → match, several cards in one list, stale
// price listed but not totalled, camera denied, layout at phone width, and that
// the page makes no writes or admin calls.
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(HERE, '../../.output/server/index.mjs')
if (!fs.existsSync(OUT)) { console.error('Run `npm run build` first.'); process.exit(1) }
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const PORT = 4320
const BASE = `http://localhost:${PORT}`
const results = []
const ok = (name, cond, detail = '') => { results.push({ name, pass: !!cond }); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`) }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const app = spawn('node', [OUT], { env: { PATH: process.env.PATH, HOME: process.env.HOME, PORT: String(PORT), JUSTTCG_API_KEY: '' }, stdio: 'ignore' })
for (let i = 0; i < 80; i++) { try { if ((await fetch(BASE + '/scan')).ok) break } catch {} await sleep(150) }

const fresh = new Date().toISOString()
const stale = new Date(Date.now() - 30 * 86400000).toISOString()
const charizard = { card_number: '199/165', set_name: 'Scarlet & Violet 151', rarity: 'Special Illustration Rare', game: 'pokemon', language: 'English' }
const CARDS = {
  charizard: [
    { ...charizard, id: 'c::holo', name: 'Charizard ex', printing: 'Holofoil', pricing: { NM: { reference_cents: 20000, source_updated_at: fresh } } },
    { ...charizard, id: 'c::rev', name: 'Charizard ex', printing: 'Reverse Holofoil', pricing: { NM: { reference_cents: 15000, source_updated_at: fresh } } },
  ],
  pikachu: [{ id: 'p', name: 'Pikachu', card_number: '025/165', set_name: 'Scarlet & Violet 151', game: 'pokemon', printing: null, language: null, rarity: null, pricing: { NM: { reference_cents: 500, source_updated_at: stale } } }],
}

function fakeCamera(page, lines, { deny = false } = {}) {
  return page.addInitScript(({ cardLines, deny }) => {
    const canvas = document.createElement('canvas')
    canvas.width = 720
    canvas.height = 1280
    const ctx = canvas.getContext('2d')
    window.__lines = cardLines
    const draw = () => {
      ctx.fillStyle = '#30302e'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      const h = canvas.height * 0.62
      const w = (h * 63) / 88
      const x = (canvas.width - w) / 2
      const y = (canvas.height - h) / 2
      ctx.fillStyle = '#fff'
      ctx.fillRect(x, y, w, h)
      ctx.fillStyle = '#000'
      for (const line of window.__lines) {
        ctx.font = `bold ${line.size}px Arial, sans-serif`
        ctx.fillText(line.text, x + w * line.x, y + h * line.y)
      }
    }
    draw()
    window.__tracks = []
    window.__liveTracks = () => window.__tracks.filter((t) => t.readyState === 'live').length
    const media = navigator.mediaDevices ?? {}
    media.getUserMedia = async () => {
      if (deny) { const e = new Error('denied'); e.name = 'NotAllowedError'; throw e }
      const stream = canvas.captureStream(15)
      window.__tracks.push(...stream.getTracks())
      setInterval(draw, 60)
      return stream
    }
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: media })
  }, { cardLines: lines, deny })
}

async function mockCards(page, searches) {
  await page.route('**/api/cards?**', (route) => {
    const params = new URL(route.request().url()).searchParams
    const q = (params.get('q') ?? '').toLowerCase()
    searches.push(`${params.get('game')}:${q}`)
    const cards = /charizard|199\/165/.test(q) ? CARDS.charizard : /pikachu|025\/165/.test(q) ? CARDS.pikachu : []
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ cards }) })
  })
}

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {})
try {
  // --- Phone: full show-floor flow ------------------------------------------------
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
    const requests = []
    const errors = []
    page.on('request', (r) => requests.push(`${r.method()} ${r.url()}`))
    page.on('pageerror', (e) => errors.push(e.message))
    const searches = []
    await mockCards(page, searches)
    await fakeCamera(page, [
      { text: 'Charizard ex', size: 44, x: 0.08, y: 0.1 },
      { text: '199/165', size: 30, x: 0.06, y: 0.95 },
    ])
    await page.goto(BASE + '/scan')
    await page.getByRole('button', { name: 'Scan a card' }).click()
    await page.getByRole('dialog', { name: 'Scan a card' }).waitFor()
    await page.getByRole('button', { name: 'Capture' }).click()
    await page.getByText('Needs confirmation').waitFor({ timeout: 150_000 })
    ok('real OCR read the printed number', (await page.locator('[data-scanner-read]').innerText()).includes('199/165'))
    ok('scanner searched this site’s /api/cards for the game', searches.some((s) => s.startsWith('pokemon:')))
    ok('two printings → customer must choose', (await page.locator('[data-scan-candidate]').count()) === 2)
    await page.locator('[data-scan-candidate]', { hasText: 'Reverse Holofoil' }).getByRole('button', { name: 'Use this card' }).click()
    await page.getByRole('dialog').waitFor({ state: 'hidden' })
    ok('camera released after confirming', (await page.evaluate(() => window.__liveTracks())) === 0)
    ok('confirmed card fills the search', (await page.locator('#scan-search').inputValue()) === 'Charizard ex · 199/165 · Reverse Holofoil')
    await page.locator('[data-condition="NM"]').click()
    await page.getByRole('button', { name: 'See estimated offer' }).click()
    ok('offer is 60% of $150.00', (await page.locator('[data-offer-value]').innerText()) === '$90.00')
    ok('market reference shown', (await page.locator('[data-reference-value]').innerText()) === '$150.00')
    await page.locator('[data-add-to-list]').click()
    ok('list total after first card', (await page.locator('[data-list-total]').innerText()) === '$90.00')
    ok('step 1 resets for the next card', (await page.locator('#scan-search').inputValue()) === '')

    // Second card: unreadable name and no number → correct it by hand.
    await page.evaluate(() => { window.__lines = [{ text: 'Zqxvbn wkj', size: 44, x: 0.08, y: 0.1 }] })
    await page.getByRole('button', { name: 'Scan next card' }).click()
    await page.getByRole('button', { name: 'Capture' }).click()
    await page.getByText('Could not identify').waitFor({ timeout: 150_000 })
    await page.getByLabel('Card name').fill('')
    await page.getByLabel('Card number').fill('025/165')
    await page.getByRole('button', { name: 'Search again' }).click()
    await page.getByText('Needs confirmation').waitFor()
    ok('correction is labelled as typed, not read', (await page.locator('[data-scanner-read]').innerText()) === 'You entered: 025/165')
    await page.getByRole('button', { name: 'Use this card' }).click()
    await page.locator('[data-condition="NM"]').click()
    await page.getByRole('button', { name: 'See estimated offer' }).click()
    ok('30-day-old price is not used', await page.locator('[data-offer-unavailable]').isVisible())
    await page.getByRole('button', { name: 'Add to my list without an estimate' }).click()
    ok('two cards listed', (await page.locator('[data-list-count]').innerText()) === '2 cards')
    ok('stale card not in the total', (await page.locator('[data-list-total]').innerText()) === '$90.00')
    ok('note explains the in-person card', (await page.locator('[data-list-note]').innerText()).includes('1 card has no online estimate'))
    ok('no sideways scroll at 390px', (await page.evaluate(() => document.documentElement.scrollWidth)) <= 390)

    page.once('dialog', (d) => d.accept())
    await page.getByRole('button', { name: 'Clear list' }).click()
    ok('Clear list empties the list', (await page.locator('[data-scan-list]').count()) === 0)
    ok('only GET requests from the public page', requests.every((r) => r.startsWith('GET ')), requests.filter((r) => !r.startsWith('GET ')).join(', '))
    ok('no admin calls from the public page', !requests.some((r) => r.includes('/api/admin') || r.includes('/admin')))
    ok('no page errors', errors.length === 0, errors.join(' | '))
    await page.close()
  }

  // --- Desktop: denied camera falls back to search -------------------------------
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
    await mockCards(page, [])
    await fakeCamera(page, [], { deny: true })
    await page.goto(BASE + '/scan')
    await page.getByRole('button', { name: 'Scan a card' }).click()
    await page.getByText('Camera access is blocked.').waitFor()
    await page.getByRole('button', { name: 'Search manually' }).click()
    ok('denied camera → dialog closes, search focused', (await page.evaluate(() => document.activeElement?.id)) === 'scan-search')
    await page.locator('#scan-search').fill('Charizard')
    await page.locator('[data-scan-result]').first().click()
    await page.locator('[data-condition="NM"]').click()
    await page.getByRole('button', { name: 'See estimated offer' }).click()
    ok('manual search path prices at 60% on desktop', (await page.locator('[data-offer-value]').innerText()) === '$120.00')
    ok('Scan a card is in the site nav', (await page.locator('header nav a[href="/scan"]').count()) >= 1)
    await page.close()
  }
} finally {
  await browser.close()
  app.kill()
}

const failed = results.filter((r) => !r.pass)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
process.exit(failed.length ? 1 : 0)
