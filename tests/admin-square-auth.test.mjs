import { test } from 'node:test'
import assert from 'node:assert/strict'

globalThis.createError = (opts) => Object.assign(new Error(opts.statusMessage), opts)
let runtime = { sessionSecret: 'x'.repeat(48), adminSetupCode: '', square: {} }
globalThis.useRuntimeConfig = () => runtime
globalThis.useStorage = () => { throw new Error('storage not used in these tests') }
const { seal, unseal, squareSetupProblems } = await import('../server/utils/admin/squareAuth.ts')
const { checkSquareAccess, setupCodeMatches, configuredSetupCode } = await import('../server/utils/admin/owner.ts')

const nino = { merchantId: 'M1', email: 'nino@example.com' }
const unlinked = { merchantId: '', email: 'nino@example.com' }
const linked = { merchantId: 'M1', email: 'nino@example.com' }

test('connect: the signed-in owner can link any Square account when none is linked', () => {
  assert.deepEqual(checkSquareAccess(unlinked, { ...nino, email: 'different@example.com' }, 'connect'), { ok: true })
})

test('connect: reconnecting the same merchant is fine, a different one must disconnect first', () => {
  assert.deepEqual(checkSquareAccess(linked, nino, 'connect'), { ok: true })
  assert.deepEqual(checkSquareAccess(linked, { ...nino, merchantId: 'M2' }, 'connect'), { ok: false, code: 'othermerchant' })
})

test('sign-in with Square needs an owner who linked that exact merchant', () => {
  assert.deepEqual(checkSquareAccess(null, nino, 'signin'), { ok: false, code: 'noowner' })
  assert.deepEqual(checkSquareAccess(unlinked, nino, 'signin'), { ok: false, code: 'nosquare' })
  assert.deepEqual(checkSquareAccess(linked, { ...nino, merchantId: 'M2' }, 'signin'), { ok: false, code: 'notowner' })
  assert.deepEqual(checkSquareAccess(linked, { ...nino, email: 'someone@example.com' }, 'signin'), { ok: false, code: 'notowner' })
  assert.deepEqual(checkSquareAccess(linked, { ...nino, email: 'NINO@example.com' }, 'signin'), { ok: true })
  assert.deepEqual(checkSquareAccess(linked, { ...nino, email: '' }, 'signin'), { ok: true })
})

test('no Square access at all without an owner account', () => {
  assert.equal(checkSquareAccess(null, nino, 'connect').ok, false)
})

test('setup code: required length, exact match, surrounding spaces ignored', () => {
  runtime = { ...runtime, adminSetupCode: 'short' }
  assert.equal(configuredSetupCode(), '')
  runtime = { ...runtime, adminSetupCode: 'Nino-Setup-2026-xyz' }
  const code = configuredSetupCode()
  assert.equal(code, 'Nino-Setup-2026-xyz')
  assert.equal(setupCodeMatches('Nino-Setup-2026-xyz', code), true)
  assert.equal(setupCodeMatches('  Nino-Setup-2026-xyz ', code), true)
  assert.equal(setupCodeMatches('nino-setup-2026-xyz', code), false)
  assert.equal(setupCodeMatches('', code), false)
  assert.equal(setupCodeMatches('anything', ''), false)
})

test('tokens seal with the env secret, tamper fails, and a different secret cannot open them', () => {
  runtime = { ...runtime, sessionSecret: 'x'.repeat(48) }
  const sealed = seal({ accessToken: 'at-123', refreshToken: 'rt-456' })
  assert.ok(!sealed.includes('at-123') && !sealed.includes('rt-456'))
  assert.deepEqual(unseal(sealed), { accessToken: 'at-123', refreshToken: 'rt-456' })
  const [iv, tag, body] = sealed.split('.')
  assert.throws(() => unseal([iv, tag, body.slice(0, -2) + 'AA'].join('.')))
  runtime = { ...runtime, sessionSecret: 'y'.repeat(48) }
  assert.throws(() => unseal(sealed))
})

test('without NUXT_SESSION_SECRET, Square tokens cannot be sealed and setup lists what is missing', () => {
  runtime = { sessionSecret: '', adminSetupCode: '', square: {} }
  assert.throws(() => seal({ accessToken: 'a', refreshToken: 'b' }), /NUXT_SESSION_SECRET/)
  const missing = squareSetupProblems().join(' | ')
  assert.match(missing, /NUXT_SQUARE_APP_ID/)
  assert.match(missing, /NUXT_SQUARE_APP_SECRET/)
  assert.match(missing, /NUXT_SESSION_SECRET/)
  runtime = { sessionSecret: 'z'.repeat(40), adminSetupCode: '', square: { appId: 'id', appSecret: 'secret' } }
  assert.deepEqual(squareSetupProblems(), [])
})
