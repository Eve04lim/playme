import '@testing-library/jest-dom'
import { vi } from 'vitest' // test.globals=false の環境で必要
import { webcrypto } from 'node:crypto'
import { TextEncoder, TextDecoder } from 'node:util'
Object.defineProperty(globalThis, 'crypto', { value: webcrypto })
Object.assign(globalThis, { TextEncoder, TextDecoder })

// Web APIs polyfill for jsdom
global.IntersectionObserver = class IntersectionObserver {
  observe() { return null; }
  disconnect() { return null; }
  unobserve() { return null; }
}

global.ResizeObserver = class ResizeObserver {
  observe() { return null; }
  disconnect() { return null; }
  unobserve() { return null; }
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock Web APIs
Object.defineProperty(window, 'crypto', {
  value: {
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
      return arr
    },
    subtle: {
      digest: () => Promise.resolve(new ArrayBuffer(32))
    }
  }
})

Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  }
})