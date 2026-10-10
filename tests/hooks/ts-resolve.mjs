import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export async function resolve(specifier, context, next) {
  if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier) && context.parentURL?.startsWith('file:')) {
    const base = new URL(specifier, context.parentURL).href
    for (const ext of ['.ts', '.mts', '/index.ts']) {
      if (existsSync(fileURLToPath(base + ext))) return next(base + ext, context)
    }
  }
  return next(specifier, context)
}
