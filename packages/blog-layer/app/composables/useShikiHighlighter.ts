import type { Highlighter, LanguageRegistration } from 'shiki'
import bash from '@shikijs/langs/bash'
import css from '@shikijs/langs/css'
import html from '@shikijs/langs/html'
import javascript from '@shikijs/langs/javascript'
import json from '@shikijs/langs/json'
import sass from '@shikijs/langs/sass'
import scss from '@shikijs/langs/scss'
import typescript from '@shikijs/langs/typescript'
import xml from '@shikijs/langs/xml'
import yaml from '@shikijs/langs/yaml'
import githubDark from '@shikijs/themes/github-dark-default'
import githubLight from '@shikijs/themes/github-light'
import { createHighlighter } from 'shiki'

// Global singleton instance
let highlighterInstance: Highlighter | null = null
let highlighterPromise: Promise<Highlighter> | null = null

/** Theme ids loaded into the highlighter (mirrors the colorffy CSS dialog). */
export const SHIKI_LIGHT_THEME = 'github-light'
export const SHIKI_DARK_THEME = 'github-dark-default'

/** Canonical language fallback when a code block has no (or an unknown) language. */
export const SHIKI_DEFAULT_LANG = 'css'

// Map of supported languages (web-focused set for the blog).
const supportedLanguages: Record<string, LanguageRegistration | LanguageRegistration[]> = {
  css,
  scss,
  sass,
  html,
  xml,
  javascript,
  typescript,
  json,
  bash,
  yaml
}

/** Common aliases authors/editors may emit (`language-js`, ```ts, …) → canonical lang. */
const languageAliases: Record<string, string> = {
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  yml: 'yaml',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  console: 'bash',
  htm: 'html',
  svg: 'xml'
}

const supportedLanguageSet = new Set(Object.keys(supportedLanguages))

/**
 * Normalize a detected language token to one the highlighter actually loaded.
 * Unknown / empty languages fall back to {@link SHIKI_DEFAULT_LANG} so `codeToHtml`
 * never throws on content that wasn't tagged in the editor.
 */
export function resolveShikiLang(lang?: string | null): string {
  const normalized = (lang || '').trim().toLowerCase()
  if (!normalized)
    return SHIKI_DEFAULT_LANG

  const canonical = languageAliases[normalized] ?? normalized
  return supportedLanguageSet.has(canonical) ? canonical : SHIKI_DEFAULT_LANG
}

/**
 * Shiki syntax highlighter singleton for blog code blocks.
 * - Lazy-loads the highlighter on first access
 * - Reuses a single instance across the app
 * - Loads both the light and dark GitHub themes so blocks can re-theme on the fly
 */
export function useShikiHighlighter() {
  /** Resolve (or create) the shared Shiki highlighter instance. */
  const getHighlighter = async (): Promise<Highlighter> => {
    if (highlighterInstance) {
      return highlighterInstance
    }

    if (highlighterPromise) {
      return highlighterPromise
    }

    const languageValues = Object.values(supportedLanguages).flat() as LanguageRegistration[]

    highlighterPromise = createHighlighter({
      themes: [githubLight, githubDark],
      langs: languageValues
    }).then((highlighter) => {
      highlighterInstance = highlighter
      highlighterPromise = null
      return highlighter
    })

    return highlighterPromise
  }

  return {
    getHighlighter
  }
}
