import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/sanitize.ts'],
  format: ['esm', 'cjs'],
  platform: 'neutral',
  dts: true
})
