// src/utils/debug.ts
/**
 * Debug utility to reduce console spam
 * Only logs when VITE_DEBUG=1 in environment
 */

export const debug = (...args: any[]) => {
  if (import.meta.env.VITE_DEBUG === '1') {
    console.log(...args)
  }
}

export const debugWarn = (...args: any[]) => {
  if (import.meta.env.VITE_DEBUG === '1') {
    console.warn(...args)
  }
}

export const debugError = (...args: any[]) => {
  if (import.meta.env.VITE_DEBUG === '1') {
    console.error(...args)
  }
}

// Always log important errors regardless of debug flag
export const logError = (...args: any[]) => {
  console.error(...args)
}

// Performance debugging
export const debugTime = (label: string) => {
  if (import.meta.env.VITE_DEBUG === '1') {
    console.time(label)
  }
}

export const debugTimeEnd = (label: string) => {
  if (import.meta.env.VITE_DEBUG === '1') {
    console.timeEnd(label)
  }
}