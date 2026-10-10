import { test } from 'node:test'
import assert from 'node:assert/strict'

let runtime = { adminDemo: '', sessionSecret: '' }
globalThis.useRuntimeConfig = () => runtime
const { chooseBackend } = await import('../server/utils/admin/runtime.ts')

function withEnv(env, fn) {
  const keys = ['REDIS_URL', 'KV_URL', 'VERCEL', 'VERCEL_ENV', 'NUXT_ADMIN_DEMO']
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]))
  for (const k of keys) delete process.env[k]
  Object.assign(process.env, env)
  try { return fn() } finally {
    for (const k of keys) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k] }
  }
}

test('local development without Redis uses the local disk', () => {
  withEnv({}, () => assert.equal(chooseBackend().backend, 'fs'))
})

test('Redis is used whenever REDIS_URL or KV_URL is set', () => {
  withEnv({ REDIS_URL: 'redis://localhost:6379' }, () => assert.deepEqual([chooseBackend().backend, chooseBackend().durable], ['redis', true]))
  runtime = { adminDemo: '', sessionSecret: 'x'.repeat(40) }
  withEnv({ KV_URL: 'rediss://example:6379', VERCEL: '1' }, () => assert.deepEqual([chooseBackend().backend, chooseBackend().problem], ['redis', null]))
  runtime = { adminDemo: '', sessionSecret: '' }
})

test('on Vercel without Redis the admin is locked with a clear reason, never on ephemeral disk', () => {
  withEnv({ VERCEL: '1' }, () => {
    const s = chooseBackend()
    assert.equal(s.backend, 'none')
    assert.equal(s.durable, false)
    assert.match(s.problem, /REDIS_URL/)
  })
})

test('demo mode is memory-only even when Redis is configured', () => {
  runtime = { adminDemo: '1', sessionSecret: '' }
  withEnv({ REDIS_URL: 'redis://localhost:6379', VERCEL: '1' }, () => assert.equal(chooseBackend().backend, 'demo'))
  runtime = { adminDemo: '', sessionSecret: '' }
})

test('demo mode is ignored on the production deployment', () => {
  runtime = { adminDemo: '1', sessionSecret: 'x'.repeat(40) }
  withEnv({ VERCEL: '1', VERCEL_ENV: 'production', REDIS_URL: 'redis://x:6379' }, () => assert.equal(chooseBackend().backend, 'redis'))
  withEnv({ VERCEL: '1', VERCEL_ENV: 'production' }, () => assert.equal(chooseBackend().backend, 'none'))
  withEnv({ VERCEL: '1', VERCEL_ENV: 'preview' }, () => assert.equal(chooseBackend().backend, 'demo'))
  runtime = { adminDemo: '' }
})

test('on Vercel with Redis but no NUXT_SESSION_SECRET the admin fails closed', () => {
  runtime = { adminDemo: '', sessionSecret: '' }
  withEnv({ VERCEL: '1', REDIS_URL: 'redis://x:6379' }, () => assert.match(chooseBackend().problem ?? '', /NUXT_SESSION_SECRET/))
  withEnv({ REDIS_URL: 'redis://x:6379' }, () => assert.equal(chooseBackend().problem, null))
})
