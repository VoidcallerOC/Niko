import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hashPassword, verifyPassword } from '../server/utils/admin/auth.ts'

test('password hash round-trips and rejects other passwords', () => {
  const hash = hashPassword('correct horse battery staple')
  assert.match(hash, /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/)
  assert.equal(verifyPassword('correct horse battery staple', hash), true)
  assert.equal(verifyPassword('correct horse battery stapl', hash), false)
  assert.equal(verifyPassword('', hash), false)
})

test('malformed stored hashes never verify', () => {
  assert.equal(verifyPassword('anything', ''), false)
  assert.equal(verifyPassword('anything', 'plain$text'), false)
  assert.equal(verifyPassword('anything', 'scrypt$zz$zz'), false)
})

test('two hashes of the same password differ (random salt)', () => {
  assert.notEqual(hashPassword('same password'), hashPassword('same password'))
})
