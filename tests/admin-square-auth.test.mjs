import { test } from 'node:test'
import assert from 'node:assert/strict'

globalThis.createError = (opts) => Object.assign(new Error(opts.statusMessage), opts)
globalThis.useRuntimeConfig = () => ({ sessionSecret: 'x'.repeat(48), square: {} })
globalThis.useStorage = () => { throw new Error('storage not used in these tests') }
const { checkOwnerBinding, seal, unseal } = await import('../server/utils/admin/squareAuth.ts')

const nino = { merchantId: 'M1', businessName: 'Nino', email: 'nino@example.com', locationId: 'L1', locationName: 'Main', source: 'square' }
const squareOwner = { merchantId: 'M1', email: 'nino@example.com', businessName: 'Nino', boundAt: 'now', source: 'square' }
const passwordOwner = { merchantId: '', email: 'nino@example.com', businessName: '', passwordHash: 'scrypt$..', boundAt: 'now', source: 'password' }

test('first Square sign-in binds the owner', () => {
  assert.deepEqual(checkOwnerBinding(null, nino), { ok: true, first: true, link: false })
})

test('same merchant and email signs in again', () => {
  assert.deepEqual(checkOwnerBinding(squareOwner, nino), { ok: true, first: false, link: false })
  assert.equal(checkOwnerBinding(squareOwner, { ...nino, email: 'NINO@example.com' }).ok, true)
})

test('another merchant, or another email on the same merchant, is refused', () => {
  assert.equal(checkOwnerBinding(squareOwner, { ...nino, merchantId: 'M2' }).ok, false)
  assert.equal(checkOwnerBinding(squareOwner, { ...nino, email: 'someone@example.com' }).ok, false)
})

test('email check is skipped only when one side has no email', () => {
  assert.equal(checkOwnerBinding({ ...squareOwner, email: '' }, nino).ok, true)
})

test('a password owner links Square when the emails match, or when already signed in', () => {
  assert.deepEqual(checkOwnerBinding(passwordOwner, nino), { ok: true, first: false, link: true })
  assert.equal(checkOwnerBinding(passwordOwner, { ...nino, email: 'other@example.com' }).ok, false)
  assert.deepEqual(checkOwnerBinding(passwordOwner, { ...nino, email: 'other@example.com' }, true), { ok: true, first: false, link: true })
  assert.equal(checkOwnerBinding(passwordOwner, { ...nino, email: '' }).ok, false)
})

test('tokens seal and unseal with the session secret, and tamper fails', () => {
  const sealed = seal({ accessToken: 'at-123', refreshToken: 'rt-456' })
  assert.ok(!sealed.includes('at-123'))
  assert.deepEqual(unseal(sealed), { accessToken: 'at-123', refreshToken: 'rt-456' })
  const [iv, tag, body] = sealed.split('.')
  assert.throws(() => unseal([iv, tag, body.slice(0, -2) + 'AA'].join('.')))
})
