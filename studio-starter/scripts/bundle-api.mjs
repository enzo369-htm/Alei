import { build } from 'esbuild'

await build({
  entryPoints: ['server/vercel-entry.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'api/index.js',
  packages: 'external',
  logLevel: 'info',
})
