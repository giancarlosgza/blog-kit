import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'blog-layer',
          include: ['packages/blog-layer/tests/unit/**/*.test.ts'],
          environment: 'node',
          alias: {
            '#blog': resolve(import.meta.dirname, 'packages/blog-layer')
          }
        }
      }
    ]
  }
})
