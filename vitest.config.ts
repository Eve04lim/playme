// vitest.config.ts
/// <reference types="vitest" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    // 追加：E2E は Vitest から除外（Playwright だけが実行）
    exclude: ['tests/**', 'node_modules/**', 'dist/**'],
    // 任意：単体テストだけ拾いたい場合は include を明示してもOK
    // include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  }
})
