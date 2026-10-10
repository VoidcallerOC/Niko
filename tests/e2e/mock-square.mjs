// Local stand-in for Square's OAuth and the API calls the admin makes (tests only).
// Lets the real (non-demo) code path run without a Square account. Values here are fake.
import http from 'node:http'
import { randomBytes } from 'node:crypto'

const PORT = Number(process.env.MOCK_PORT || 4801)
const APP_ID = 'mock-app-id-not-real'
const APP_SECRET = 'mock-app-secret-not-real'
const merchants = {
  'M-NINO': { business_name: "Nino's Collectibles (mock)", email: 'nino@example.com', location: { id: 'L-NINO', name: 'Card shows' } },
  'M-OTHER': { business_name: 'Someone Else (mock)', email: 'other@example.com', location: { id: 'L-OTHER', name: 'Other' } },
}
let current = 'M-NINO'
const codes = new Map() // code -> merchant
const tokens = new Map() // access token -> merchant
const log = []

const json = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)) }
const readBody = (req) => new Promise((r) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => { try { r(JSON.parse(b || '{}')) } catch { r({}) } }) })
const bearer = (req) => tokens.get((req.headers.authorization || '').replace(/^Bearer /, ''))

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`)
  const p = url.pathname
  if (p === '/__mock/merchant') { const b = await readBody(req); current = b.merchant; return json(res, 200, { current }) }
  if (p === '/__mock/log') return json(res, 200, { log, live: [...tokens.keys()] })
  if (p === '/oauth2/authorize') {
    if (url.searchParams.get('client_id') !== APP_ID) return json(res, 400, { message: 'bad client_id' })
    const code = 'CODE-' + randomBytes(6).toString('hex')
    codes.set(code, current)
    log.push({ t: 'authorize', merchant: current, scope: url.searchParams.get('scope') })
    const back = new URL(url.searchParams.get('redirect_uri'))
    back.searchParams.set('code', code); back.searchParams.set('state', url.searchParams.get('state'))
    res.writeHead(302, { location: back.toString() }); return res.end()
  }
  if (p === '/oauth2/token' && req.method === 'POST') {
    const b = await readBody(req)
    if (b.client_id !== APP_ID || b.client_secret !== APP_SECRET) return json(res, 401, { errors: [{ code: 'UNAUTHORIZED' }] })
    let merchant
    if (b.grant_type === 'authorization_code') { merchant = codes.get(b.code); codes.delete(b.code) }
    if (!merchant) return json(res, 400, { errors: [{ code: 'BAD_CODE' }] })
    const at = 'mock-access-token-' + randomBytes(10).toString('hex')
    tokens.set(at, merchant)
    log.push({ t: 'token', merchant, access_token: at })
    return json(res, 200, { access_token: at, refresh_token: 'RT-' + randomBytes(8).toString('hex'), expires_at: new Date(Date.now() + 30 * 864e5).toISOString(), merchant_id: merchant })
  }
  if (p === '/oauth2/revoke' && req.method === 'POST') {
    const b = await readBody(req)
    if (req.headers.authorization !== `Client ${APP_SECRET}`) return json(res, 401, { errors: [{ code: 'UNAUTHORIZED' }] })
    tokens.delete(b.access_token)
    log.push({ t: 'revoke', access_token: b.access_token })
    return json(res, 200, { success: true })
  }
  const m = bearer(req)
  if (!m) return json(res, 401, { errors: [{ code: 'UNAUTHORIZED', detail: 'bad token' }] })
  const info = merchants[m]
  if (p === '/v2/merchants/me') return json(res, 200, { merchant: { id: m, business_name: info.business_name, main_location_id: info.location.id } })
  if (p === '/v2/team-members/search') return json(res, 200, { team_members: [{ is_owner: true, email_address: info.email, status: 'ACTIVE' }] })
  if (p === '/v2/locations') return json(res, 200, { locations: [{ id: info.location.id, name: info.location.name, status: 'ACTIVE' }] })
  if (p === '/v2/catalog/list') {
    log.push({ t: 'catalog', merchant: m, types: url.searchParams.get('types') })
    const v = (id, extra = {}) => ({ id, version: 3, item_variation_data: { track_inventory: true, ...extra } })
    const objects = [
      { type: 'ITEM', id: 'SQ-ITEM-1', version: 3, updated_at: '2026-10-01T00:00:00Z', item_data: { name: 'Mock Square card', description_plaintext: 'From the mock catalog', image_ids: ['SQ-IMG-1'], variations: [v('SQ-VAR-1', { price_money: { amount: 2500, currency: 'USD' } })] } },
      { type: 'ITEM', id: 'SQ-ITEM-2', version: 1, updated_at: '2026-10-02T00:00:00Z', item_data: { name: 'Mock sold-out card', variations: [v('SQ-VAR-2', { price_money: { amount: 900, currency: 'USD' } })] } },
      { type: 'ITEM', id: 'SQ-ITEM-3', version: 1, updated_at: '2026-10-02T00:00:00Z', item_data: { name: 'Mock archived card', is_archived: true, variations: [v('SQ-VAR-3', { price_money: { amount: 900, currency: 'USD' }, track_inventory: false })] } },
      { type: 'ITEM', id: 'SQ-ITEM-4', version: 1, updated_at: '2026-10-03T00:00:00Z', item_data: { name: 'Mock untracked card', variations: [v('SQ-VAR-4', { track_inventory: false })] } },
      { type: 'ITEM', id: 'SQ-ITEM-5', version: 1, updated_at: '2026-10-04T00:00:00Z', present_at_all_locations: false, present_at_location_ids: ['L-ELSEWHERE'], item_data: { name: 'Mock other-location card', variations: [v('SQ-VAR-5', { price_money: { amount: 900, currency: 'USD' } })] } },
    ]
    if ((url.searchParams.get('types') || '').split(',').includes('IMAGE')) objects.push({ type: 'IMAGE', id: 'SQ-IMG-1', image_data: { url: 'https://example.com/mock-square-card.jpg' } })
    return json(res, 200, { objects })
  }
  if (p === '/v2/inventory/counts/batch-retrieve') return json(res, 200, { counts: [{ catalog_object_id: 'SQ-VAR-1', quantity: '4', state: 'IN_STOCK' }] })
  json(res, 404, { errors: [{ code: 'NOT_FOUND', detail: p }] })
}).listen(PORT, '127.0.0.1', () => console.log('mock square on', PORT))
