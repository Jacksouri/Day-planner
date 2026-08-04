import { webcrypto } from 'node:crypto'
import '@testing-library/jest-dom/vitest'

// jsdom ships getRandomValues but no SubtleCrypto, which the vault needs.
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })
}
