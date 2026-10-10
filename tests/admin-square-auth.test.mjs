import { test } from 'node:test'
import assert from 'node:assert/strict'

globalThis.createError = (opts) => Object.assign(new Error(opts.statusMessage), opts)
let runtime = { sessionSecret: 'x'.repeat(48), adminSetupCode: '', square: {} }
globalThis.useRuntimeConfig = () => runtime
globalThis.useStorage = () => { throw new Error('storage not used in these tests') }
const { seal, unseal, squareSetupProblems, squareAuthConfig, squareEnvSetting, canonicalOrigin } = await import('../server/utils/admin/squareAuth.ts')
const { checkSquareAccess, setupCodeMatches, configuredSetupCode, linkedMerchant } = await import('../server/utils/admin/owner.ts')

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
  // The linked merchant is the identity; a different Square email on that merchant is fine.
  assert.deepEqual(checkSquareAccess(linked, { ...nino, email: 'someone@example.com' }, 'signin'), { ok: true })
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
  runtime = { sessionSecret: 'z'.repeat(40), adminSetupCode: '', square: { appId: 'sq0idp-x', appSecret: 'secret', env: 'production' } }
  assert.deepEqual(squareSetupProblems(), [])
})

function withEnv(env, fn) {
  const keys = ['VERCEL', 'VERCEL_ENV', 'NUXT_SQUARE_API_ORIGIN', 'NUXT_SQUARE_AUTHORIZE_URL']
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]))
  for (const k of keys) delete process.env[k]
  Object.assign(process.env, env)
  try { return fn() } finally { for (const k of keys) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k] } }
}

test('Square hosts follow the documented production and sandbox endpoints', () => {
  runtime = { sessionSecret: 'z'.repeat(40), square: { env: 'production' } }
  withEnv({}, () => {
    assert.equal(squareAuthConfig().authorize, 'https://connect.squareup.com/oauth2/authorize')
    assert.equal(squareAuthConfig().api, 'https://connect.squareup.com')
  })
  runtime = { sessionSecret: 'z'.repeat(40), square: { env: 'sandbox' } }
  withEnv({}, () => {
    assert.equal(squareAuthConfig().authorize, 'https://connect.squareupsandbox.com/oauth2/authorize')
    assert.equal(squareAuthConfig().api, 'https://connect.squareupsandbox.com')
  })
})

test('NUXT_SQUARE_ENV is required: no silent default', () => {
  runtime = { sessionSecret: 'z'.repeat(40), square: { appId: 'sq0idp-x', appSecret: 's' } }
  assert.equal(squareEnvSetting(), '')
  assert.match(squareSetupProblems().join(' | '), /NUXT_SQUARE_ENV/)
  runtime = { sessionSecret: 'z'.repeat(40), square: { appId: 'sq0idp-x', appSecret: 's', env: 'Production ' } }
  assert.equal(squareEnvSetting(), 'production')
})

test('a Sandbox application ID is refused when the site is set to production', () => {
  runtime = { sessionSecret: 'z'.repeat(40), square: { appId: 'sandbox-sq0idb-abc', appSecret: 's', env: 'production' } }
  assert.match(squareSetupProblems().join(' | '), /Sandbox ID/)
})

test('test-only Square host overrides are ignored on Vercel', () => {
  runtime = { sessionSecret: 'z'.repeat(40), square: { env: 'production' } }
  const mock = { NUXT_SQUARE_API_ORIGIN: 'http://127.0.0.1:4801', NUXT_SQUARE_AUTHORIZE_URL: 'http://127.0.0.1:4801/oauth2/authorize' }
  withEnv(mock, () => assert.equal(squareAuthConfig().api, 'http://127.0.0.1:4801'))
  withEnv({ ...mock, VERCEL: '1' }, () => {
    assert.equal(squareAuthConfig().api, 'https://connect.squareup.com')
    assert.equal(squareAuthConfig().authorize, 'https://connect.squareup.com/oauth2/authorize')
  })
})

test('on Vercel the callback URL must be configured, be https for production, and point at the callback route', () => {
  const base = { appId: 'sq0idp-x', appSecret: 's', env: 'production' }
  runtime = { sessionSecret: 'z'.repeat(40), square: base }
  withEnv({ VERCEL: '1' }, () => assert.match(squareSetupProblems().join(' | '), /NUXT_SQUARE_REDIRECT_URL/))
  runtime = { sessionSecret: 'z'.repeat(40), square: { ...base, redirectUrl: 'http://niko-git-admin-preview.vercel.app/api/admin/auth/square/callback' } }
  withEnv({ VERCEL: '1' }, () => assert.match(squareSetupProblems().join(' | '), /https/))
  runtime = { sessionSecret: 'z'.repeat(40), square: { ...base, redirectUrl: 'https://niko-git-admin-preview.vercel.app/admin' } }
  withEnv({ VERCEL: '1' }, () => assert.match(squareSetupProblems().join(' | '), /callback/))
  runtime = { sessionSecret: 'z'.repeat(40), square: { ...base, redirectUrl: 'https://niko-git-admin-preview.vercel.app/api/admin/auth/square/callback' } }
  withEnv({ VERCEL: '1' }, () => {
    assert.deepEqual(squareSetupProblems(), [])
    assert.equal(canonicalOrigin(), 'https://niko-git-admin-preview.vercel.app')
  })
})

test('a merchant linked in Sandbox never counts as linked in Production', () => {
  const sandboxOwner = { merchantId: 'SANDBOX-M', email: 'nino@example.com', squareEnv: 'sandbox' }
  assert.equal(linkedMerchant(sandboxOwner, 'sandbox'), 'SANDBOX-M')
  assert.equal(linkedMerchant(sandboxOwner, 'production'), '')
  // Nino's real store can be connected in production even after a sandbox test…
  assert.deepEqual(checkSquareAccess(sandboxOwner, { merchantId: 'REAL-M', email: 'nino@example.com' }, 'connect', 'production'), { ok: true })
  // …and the sandbox merchant cannot sign in to the production site.
  assert.deepEqual(checkSquareAccess(sandboxOwner, { merchantId: 'SANDBOX-M', email: 'nino@example.com' }, 'signin', 'production'), { ok: false, code: 'nosquare' })
  // Within one environment the first merchant stays bound.
  const prodOwner = { merchantId: 'REAL-M', email: 'nino@example.com', squareEnv: 'production' }
  assert.deepEqual(checkSquareAccess(prodOwner, { merchantId: 'OTHER', email: 'x@example.com' }, 'connect', 'production'), { ok: false, code: 'othermerchant' })
})
