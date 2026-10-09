import { describe, expect, it } from 'vitest'
import { decorateBlogLinks } from '#blog/shared/utils/blog'

describe('decorateBlogLinks', () => {
  it('adds text-link to links without a class', () => {
    expect(decorateBlogLinks('<a href="/about">About</a>')).toBe('<a class="text-link" href="/about">About</a>')
  })

  it('merges text-link into existing classes', () => {
    expect(decorateBlogLinks('<a class="fw-600" href="/x">X</a>')).toBe('<a class="fw-600 text-link" href="/x">X</a>')
    expect(decorateBlogLinks('<a href=\'/x\' class=\'a b\'>X</a>')).toBe('<a href=\'/x\' class=\'a b text-link\'>X</a>')
  })

  it('is idempotent', () => {
    const once = decorateBlogLinks('<p><a href="https://colorffy.com" rel="noopener nofollow" target="_blank">A</a> <a class="x" href="/b">B</a></p>')
    expect(decorateBlogLinks(once)).toBe(once)
    expect(once.match(/text-link/g)).toHaveLength(2)
  })

  it('leaves other tags alone and handles empty input', () => {
    expect(decorateBlogLinks('<abbr title="t">T</abbr><article>x</article>')).toBe('<abbr title="t">T</abbr><article>x</article>')
    expect(decorateBlogLinks('')).toBe('')
  })
})
