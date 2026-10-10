// Lets node's test runner import the server utilities as-is: Nitro resolves
// extensionless relative imports to .ts files, plain node does not.
import { register } from 'node:module'
register('./ts-resolve.mjs', import.meta.url)
