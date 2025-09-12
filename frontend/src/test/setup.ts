import '@testing-library/jest-dom'
import { vi } from 'vitest'

// jsdom does not implement scrollIntoView; mock it to avoid unhandled errors in tests
if (typeof (window as any).HTMLElement !== 'undefined') {
  Object.defineProperty((window as any).HTMLElement.prototype, 'scrollIntoView', {
    value: vi.fn(),
    configurable: true,
    writable: true,
  })
}
