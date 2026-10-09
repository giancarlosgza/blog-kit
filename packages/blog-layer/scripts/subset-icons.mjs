#!/usr/bin/env node
/**
 * Material Symbols icon font subsetter for sites built on the blog layer.
 * Run from the site root (`blog-layer-subset-icons`, e.g. in the site's `prebuild`).
 *
 * Scans the site, its local `layers/*`, this layer and `@giancarlosgza/blog-site-layer` (when the
 * site installs it) — app/, shared/, server/ — plus the @colorffy/ui dist for every Material Symbols
 * codepoint in use, both `&#xe123;` HTML entities and raw Private Use Area characters, and writes
 * into the site:
 *
 *   public/icon-fonts/material-symbols-rounded-subset.woff2   tiny subset (~10-30 KB)
 *   public/icon-fonts/material-symbols-rounded-full.woff2     full font, fallback only
 *   app/assets/css/material-symbols.generated.css             @font-face pair (add it to the site's `css`)
 *
 * The fonts live under /icon-fonts/ (not /fonts/) because @nuxt/fonts owns the /fonts/ prefix
 * and its dev-server middleware 404s any file it didn't render itself.
 *
 * The generated CSS declares the full font first (unicode-range: U+E000-F8FF) and the subset
 * second, so browsers use the tiny subset for every known icon and only download the full font
 * if an unknown codepoint (e.g. from runtime data) ever renders.
 */

import { copyFileSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import subsetFont from 'subset-font'

const siteRoot = process.cwd()
const layerRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const layerRequire = createRequire(join(layerRoot, 'package.json'))
const siteRequire = createRequire(join(siteRoot, 'package.json'))

function resolveFrom(specifier) {
  try {
    return siteRequire.resolve(specifier)
  } catch {
    return layerRequire.resolve(specifier)
  }
}

function installedPackageDir(name) {
  try {
    return dirname(siteRequire.resolve(`${name}/package.json`))
  } catch {
    return null
  }
}

function localLayerDirs() {
  const layersDir = join(siteRoot, 'layers')
  try {
    return readdirSync(layersDir).map(entry => join(layersDir, entry)).filter(dir => statSync(dir).isDirectory())
  } catch {
    return []
  }
}

const SOURCE_FONT = join(dirname(resolveFrom('@material-symbols/font-700/package.json')), 'material-symbols-rounded.woff2')
const OUT_DIR = join(siteRoot, 'public/icon-fonts')
const OUT_SUBSET = join(OUT_DIR, 'material-symbols-rounded-subset.woff2')
const OUT_FULL = join(OUT_DIR, 'material-symbols-rounded-full.woff2')
const OUT_CSS = join(siteRoot, 'app/assets/css/material-symbols.generated.css')

const SOURCE_ROOTS = [siteRoot, ...localLayerDirs(), layerRoot, installedPackageDir('@giancarlosgza/blog-site-layer')]
const SCAN_ROOTS = [
  ...SOURCE_ROOTS.filter(Boolean).flatMap(root => ['app', 'shared', 'server'].map(dir => resolve(root, dir))),
  dirname(resolveFrom('@colorffy/ui'))
]
const SCAN_EXTENSIONS = new Set(['.vue', '.ts', '.js', '.mjs', '.cjs', '.scss', '.css', '.json'])
const SKIP_DIRS = new Set(['node_modules', '.nuxt', '.output'])

const ENTITY_REGEX = /&#x([0-9a-f]{2,6});/gi
// eslint-disable-next-line regexp/no-obscure-range -- the Private Use Area, where Material Symbols glyphs live
const PUA_REGEX = /[-]/gu

function collectFiles(dir, files = []) {
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return files
  }
  for (const entry of entries) {
    const full = join(dir, entry)
    const stats = statSync(full)
    if (stats.isDirectory()) {
      if (!SKIP_DIRS.has(entry))
        collectFiles(full, files)
    } else if (SCAN_EXTENSIONS.has(extname(entry))) {
      files.push(full)
    }
  }
  return files
}

function extractCodepoints(files) {
  const codepoints = new Set()
  for (const file of files) {
    const content = readFileSync(file, 'utf8')
    for (const match of content.matchAll(ENTITY_REGEX))
      codepoints.add(Number.parseInt(match[1], 16))
    for (const match of content.matchAll(PUA_REGEX))
      codepoints.add(match[0].codePointAt(0))
  }
  // Only keep Private Use Area codepoints (where Material Symbols glyphs live)
  return [...codepoints].filter(cp => cp >= 0xE000 && cp <= 0xF8FF).sort((a, b) => a - b)
}

const files = [...new Set(SCAN_ROOTS)].flatMap(dir => collectFiles(dir))
const codepoints = extractCodepoints(files)

if (codepoints.length === 0)
  throw new Error('subset-icons: no Material Symbols codepoints found — scan roots misconfigured?')

const sourceFont = readFileSync(SOURCE_FONT)
const subsetText = String.fromCodePoint(...codepoints)
const subsetBuffer = await subsetFont(sourceFont, subsetText, { targetFormat: 'woff2' })

mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(OUT_SUBSET, subsetBuffer)
copyFileSync(SOURCE_FONT, OUT_FULL)

// Material Symbols ships asymmetric vertical metrics (hhea ascent 1056 vs descent 96 per 960 UPM),
// so its em-centered glyphs render above the center of a `line-height: 1` box. Normalizing the
// line-box metrics to ascent 100% / descent 0% puts the glyph on the box center.
const METRIC_OVERRIDES = `    ascent-override: 100%;
    descent-override: 0%;
    line-gap-override: 0%;`

const css = `/* AUTO-GENERATED by blog-layer-subset-icons — do not edit by hand.
 * ${codepoints.length} icon codepoints found across ${files.length} scanned files.
 * font-display: block avoids flashing raw codepoints while the (preloaded,
 * tiny) subset loads. ascent/descent overrides center the glyphs vertically.
 *
 * Face order matters: the FULL fallback is declared first and keeps a
 * unicode-range so it is ONLY downloaded when an icon outside the subset is
 * rendered. The SUBSET is declared last (so it wins for every glyph it has)
 * and has NO unicode-range, which makes it the line-box/strut font for the
 * element, so its ascent/descent overrides reliably center the glyph. */
@layer base.symbols {
  @font-face {
    font-family: "Material Symbols Rounded";
    font-style: normal;
    font-weight: 700;
    font-display: block;
${METRIC_OVERRIDES}
    src: url("/icon-fonts/material-symbols-rounded-full.woff2") format("woff2");
    unicode-range: U+E000-F8FF;
  }

  @font-face {
    font-family: "Material Symbols Rounded";
    font-style: normal;
    font-weight: 700;
    font-display: block;
${METRIC_OVERRIDES}
    src: url("/icon-fonts/material-symbols-rounded-subset.woff2") format("woff2");
  }
}
`
mkdirSync(dirname(OUT_CSS), { recursive: true })
writeFileSync(OUT_CSS, css)

const sizeKb = buffer => `${(buffer.length / 1024).toFixed(1)} KB`
console.log(`subset-icons: ${codepoints.length} codepoints from ${files.length} files`)
console.log(`subset-icons: subset ${sizeKb(subsetBuffer)} (full font ${sizeKb(sourceFont)}) -> public/icon-fonts/`)
