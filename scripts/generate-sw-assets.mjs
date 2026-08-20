import { readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const outDir = join(root, 'dist')
const manifestFile = join(outDir, 'sw-assets.json')

const EXCLUDE = new Set(['sw.js', 'sw-assets.json'])

function listFiles(dir) {
  const result = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      result.push(...listFiles(full))
    } else {
      result.push(relative(outDir, full).split(sep).join('/'))
    }
  }
  return result
}

if (!statSync(outDir, { throwIfNoEntry: false })?.isDirectory()) {
  console.error('[generate-sw-assets] dist directory not found, run vite build first')
  process.exit(1)
}

const assets = listFiles(outDir)
  .filter((file) => !EXCLUDE.has(file))
  .sort()
  .map((file) => `./${file}`)

writeFileSync(manifestFile, `${JSON.stringify(assets, null, 2)}\n`)
console.log(`[generate-sw-assets] wrote ${manifestFile} (${assets.length} assets)`)
