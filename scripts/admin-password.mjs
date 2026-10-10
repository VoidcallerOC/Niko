#!/usr/bin/env node
/**
 * Make the NUXT_ADMIN_PASSWORD_HASH value for the owner password.
 *   node scripts/admin-password.mjs
 * Prompts without echo, prints only the hash. Store the hash in the hosting
 * environment (never in the repo); the password itself is not stored anywhere.
 */
import { randomBytes, scryptSync } from 'node:crypto'
import { createInterface } from 'node:readline'

function ask(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    const stdout = process.stdout
    const write = stdout.write.bind(stdout)
    stdout.write(question)
    stdout.write = (chunk, ...rest) => (typeof chunk === 'string' && chunk !== '\n' ? true : write(chunk, ...rest))
    rl.question('', (answer) => {
      stdout.write = write
      stdout.write('\n')
      rl.close()
      resolve(answer)
    })
  })
}

const password = process.env.ADMIN_PASSWORD ?? (await ask('Owner password (hidden): '))
if (!password || password.length < 12) {
  console.error('Use at least 12 characters.')
  process.exit(1)
}
const salt = randomBytes(16)
const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 })
console.log(`NUXT_ADMIN_PASSWORD_HASH=scrypt$${salt.toString('hex')}$${hash.toString('hex')}`)
